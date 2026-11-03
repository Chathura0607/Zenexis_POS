import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../db/db';
import { CloudSyncStatus, FirebaseConfig, SyncQueueItem } from '../types';
import { logAuditEvent } from './authService';

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let activeConfig: FirebaseConfig | null = null;
let syncTimer: any = null;
let isSyncInProgress = false;
let isRestoringFromCloud = false;
let hooksInstalled = false;

const TABLES_TO_SYNC = [
  'products',
  'categories',
  'sales',
  'customers',
  'suppliers',
  'purchases',
  'repairJobs',
  'reloadTransactions',
  'expenses',
  'salaries',
  'shifts',
  'auditLogs',
];

/**
 * Setup Dexie hooks on all business tables to automatically queue changes
 */
export function setupDexieSyncHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;

  for (const tableName of TABLES_TO_SYNC) {
    const table = (db as any)[tableName];
    if (!table || typeof table.hook !== 'function') continue;

    table.hook('creating', function (this: any, primKey: any, obj: any, transaction: any) {
      if (isRestoringFromCloud) return;
      const docId = String(primKey || obj?.id || '');
      if (!docId) return;
      const clone = JSON.parse(JSON.stringify(obj));
      transaction.on('complete', () => {
        queueSyncItem(tableName, docId, 'upsert', clone);
      });
    });

    table.hook('updating', function (this: any, modifications: any, primKey: any, obj: any, transaction: any) {
      if (isRestoringFromCloud) return;
      const docId = String(primKey || obj?.id || '');
      if (!docId) return;
      const merged = JSON.parse(JSON.stringify({ ...obj, ...modifications }));
      transaction.on('complete', () => {
        queueSyncItem(tableName, docId, 'upsert', merged);
      });
    });

    table.hook('deleting', function (this: any, primKey: any, obj: any, transaction: any) {
      if (isRestoringFromCloud) return;
      const docId = String(primKey || obj?.id || '');
      if (!docId) return;
      transaction.on('complete', () => {
        queueSyncItem(tableName, docId, 'delete');
      });
    });
  }
}

// Subscribers for real-time status updates in UI
type SyncListener = (status: CloudSyncStatus) => void;
const listeners = new Set<SyncListener>();

let currentStatus: CloudSyncStatus = {
  state: 'idle',
  pendingCount: 0,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
};

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn({ ...currentStatus });
    } catch (e) {
      console.error('Error in sync status listener:', e);
    }
  });
}

function updateStatus(partial: Partial<CloudSyncStatus>) {
  currentStatus = { ...currentStatus, ...partial };
  notifyListeners();
}

export function subscribeToSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener({ ...currentStatus });
  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentSyncStatus(): CloudSyncStatus {
  return { ...currentStatus };
}

/**
 * Initialize or reconfigure Firebase with project credentials
 */
export function initFirebase(config: FirebaseConfig): { success: boolean; error?: string } {
  try {
    if (!config.apiKey || !config.projectId || !config.appId) {
      return { success: false, error: 'Incomplete Firebase credentials' };
    }

    const appName = 'ZenexisPOS_SyncApp';
    const existingApps = getApps();
    const found = existingApps.find(a => a.name === appName);

    if (found) {
      firebaseApp = found;
    } else {
      firebaseApp = initializeApp(
        {
          apiKey: config.apiKey,
          authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
          projectId: config.projectId,
          storageBucket: config.storageBucket || `${config.projectId}.appspot.com`,
          messagingSenderId: config.messagingSenderId,
          appId: config.appId,
        },
        appName
      );
    }

    firestoreDb = getFirestore(firebaseApp);
    activeConfig = { ...config };
    updateStatus({ state: 'idle', errorMessage: undefined });
    return { success: true };
  } catch (err: any) {
    console.error('Firebase init error:', err);
    updateStatus({ state: 'error', errorMessage: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Check connectivity and write a quick ping document
 */
export async function testFirebaseConnection(config: FirebaseConfig): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
  const startTime = Date.now();
  try {
    const initRes = initFirebase(config);
    if (!initRes.success || !firestoreDb) {
      return { success: false, error: initRes.error || 'Failed to initialize Firebase' };
    }

    const shopId = config.shopId || 'zenexis-pos-main';
    const testDocRef = doc(firestoreDb, `shops/${shopId}/_health/ping`);

    await setDoc(testDocRef, {
      lastPing: new Date().toISOString(),
      clientTimestamp: Date.now(),
      status: 'ok',
    });

    const latencyMs = Date.now() - startTime;
    return { success: true, latencyMs };
  } catch (err: any) {
    console.error('Firebase connection test failed:', err);
    return { success: false, error: err.message || 'Connection test failed' };
  }
}

/**
 * Queue a database change for cloud synchronization
 */
export async function queueSyncItem(
  tableName: string,
  docId: string,
  action: 'upsert' | 'delete',
  data?: any
): Promise<void> {
  try {
    const existing = await db.syncQueue
      .where('tableName')
      .equals(tableName)
      .and(item => item.docId === docId && item.status === 'pending')
      .first();

    const queueId = existing?.id || `sq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    await db.syncQueue.put({
      id: queueId,
      tableName,
      docId,
      action,
      data: data || null,
      status: 'pending',
      retries: 0,
      createdAt: new Date().toISOString(),
    });

    const pendingCount = await db.syncQueue.where('status').equals('pending').count();
    updateStatus({ pendingCount });

    // Trigger auto-sync if online and enabled
    if (activeConfig?.enabled && activeConfig?.autoSync && navigator.onLine) {
      processSyncQueue();
    }
  } catch (err) {
    console.warn('Failed to queue sync item:', err);
  }
}

/**
 * Process pending items in the sync queue
 */
export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  if (isSyncInProgress) return { synced: 0, failed: 0 };

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) {
    updateStatus({ state: 'offline', isOnline: false });
    return { synced: 0, failed: 0 };
  }

  // Load config if not yet loaded
  if (!activeConfig || !firestoreDb) {
    const settings = await db.settings.toCollection().first();
    if (settings?.firebaseConfig && settings.firebaseConfig.enabled) {
      const initRes = initFirebase(settings.firebaseConfig);
      if (!initRes.success) return { synced: 0, failed: 0 };
    } else {
      updateStatus({ state: 'disabled' });
      return { synced: 0, failed: 0 };
    }
  }

  const currentConfig = activeConfig;
  const currentDb = firestoreDb;

  if (!currentConfig || !currentConfig.enabled || !currentDb) {
    updateStatus({ state: 'disabled' });
    return { synced: 0, failed: 0 };
  }

  isSyncInProgress = true;
  updateStatus({ state: 'syncing' });

  let synced = 0;
  let failed = 0;

  try {
    const pendingItems = await db.syncQueue.where('status').equals('pending').limit(50).toArray();

    if (pendingItems.length === 0) {
      updateStatus({ state: 'synced', pendingCount: 0 });
      isSyncInProgress = false;
      return { synced: 0, failed: 0 };
    }

    const shopId = currentConfig.shopId || 'zenexis-pos-main';

    for (const item of pendingItems) {
      try {
        const docRef = doc(currentDb, `shops/${shopId}/${item.tableName}/${item.docId}`);

        if (item.action === 'delete') {
          await deleteDoc(docRef);
        } else {
          // If data was not cached in the queue item, read directly from Dexie table
          let payload = item.data;
          if (!payload && (db as any)[item.tableName]) {
            payload = await (db as any)[item.tableName].get(item.docId);
          }

          if (payload) {
            // Strip undefined values which Firestore rejects
            const sanitizedPayload = JSON.parse(JSON.stringify(payload));
            await setDoc(docRef, {
              ...sanitizedPayload,
              _syncedAt: new Date().toISOString(),
            }, { merge: true });
          }
        }

        // Successfully synced -> Remove from queue
        await db.syncQueue.delete(item.id);
        synced++;
      } catch (err: any) {
        console.error(`Sync error on ${item.tableName}/${item.docId}:`, err);
        failed++;
        await db.syncQueue.update(item.id, {
          retries: (item.retries || 0) + 1,
          lastAttempt: new Date().toISOString(),
          errorMessage: err.message || 'Sync failed',
          status: (item.retries || 0) > 4 ? 'failed' : 'pending',
        });
      }
    }

    const remainingCount = await db.syncQueue.where('status').equals('pending').count();
    const lastSyncTime = new Date().toISOString();

    updateStatus({
      state: remainingCount === 0 ? 'synced' : 'idle',
      pendingCount: remainingCount,
      lastSyncTime,
      errorMessage: failed > 0 ? `${failed} items failed to sync` : undefined,
    });

    // Update last sync time in settings
    const settings = await db.settings.toCollection().first();
    if (settings?.firebaseConfig) {
      await db.settings.update(settings.id, {
        firebaseConfig: {
          ...settings.firebaseConfig,
          lastSyncTime,
        },
      });
    }

    return { synced, failed };
  } catch (err: any) {
    console.error('Fatal sync process error:', err);
    updateStatus({ state: 'error', errorMessage: err.message });
    return { synced, failed };
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Push all local Dexie tables to Firestore (Complete Cloud Backup)
 */
export async function pushAllLocalDataToCloud(
  onProgress?: (progress: { message: string; percent: number }) => void
): Promise<{ success: boolean; totalRecords: number; error?: string }> {
  if (!navigator.onLine) {
    return { success: false, totalRecords: 0, error: 'No internet connection' };
  }

  const settings = await db.settings.toCollection().first();
  if (!settings?.firebaseConfig || !settings.firebaseConfig.enabled) {
    return { success: false, totalRecords: 0, error: 'Firebase is not configured or disabled' };
  }

  const initRes = initFirebase(settings.firebaseConfig);
  if (!initRes.success || !firestoreDb) {
    return { success: false, totalRecords: 0, error: initRes.error || 'Initialization failed' };
  }

  updateStatus({ state: 'syncing' });
  const shopId = settings.firebaseConfig.shopId || 'zenexis-pos-main';

  const tablesToSync: Array<{ name: string; getTable: () => any }> = [
    { name: 'products', getTable: () => db.products },
    { name: 'categories', getTable: () => db.categories },
    { name: 'sales', getTable: () => db.sales },
    { name: 'customers', getTable: () => db.customers },
    { name: 'suppliers', getTable: () => db.suppliers },
    { name: 'purchases', getTable: () => db.purchases },
    { name: 'repairJobs', getTable: () => db.repairJobs },
    { name: 'reloadTransactions', getTable: () => db.reloadTransactions },
    { name: 'expenses', getTable: () => db.expenses },
    { name: 'salaries', getTable: () => db.salaries },
    { name: 'shifts', getTable: () => db.shifts },
    { name: 'auditLogs', getTable: () => db.auditLogs },
    { name: 'settings', getTable: () => db.settings },
  ];

  let totalRecords = 0;
  let processedTables = 0;

  try {
    for (const item of tablesToSync) {
      const records = await item.getTable().toArray();
      const tableName = item.name;

      if (onProgress) {
        const percent = Math.round((processedTables / tablesToSync.length) * 100);
        onProgress({ message: `Pushing ${records.length} ${tableName}...`, percent });
      }

      // Firestore writeBatch supports max 500 operations per batch
      const BATCH_SIZE = 400;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = writeBatch(firestoreDb);
        const slice = records.slice(i, i + BATCH_SIZE);

        for (const record of slice) {
          const docId = record.id;
          if (!docId) continue;
          const docRef = doc(firestoreDb, `shops/${shopId}/${tableName}/${docId}`);
          const sanitized = JSON.parse(JSON.stringify(record));
          batch.set(docRef, { ...sanitized, _syncedAt: new Date().toISOString() }, { merge: true });
        }

        await batch.commit();
        totalRecords += slice.length;
      }

      processedTables++;
    }

    // Clear syncQueue since all records are pushed
    await db.syncQueue.clear();

    const lastSyncTime = new Date().toISOString();
    updateStatus({
      state: 'synced',
      pendingCount: 0,
      lastSyncTime,
      errorMessage: undefined,
    });

    await db.settings.update(settings.id, {
      firebaseConfig: {
        ...settings.firebaseConfig,
        lastSyncTime,
      },
    });

    await logAuditEvent({
      userId: 'system',
      userName: 'CloudSync',
      action: 'SETTINGS_UPDATE',
      details: `Full Cloud Backup completed: ${totalRecords} records synced to Firebase Firestore`,
    });

    if (onProgress) {
      onProgress({ message: `Completed! ${totalRecords} records backed up to cloud`, percent: 100 });
    }

    return { success: true, totalRecords };
  } catch (err: any) {
    console.error('Error during full push to cloud:', err);
    updateStatus({ state: 'error', errorMessage: err.message });
    return { success: false, totalRecords, error: err.message || 'Full backup failed' };
  }
}

/**
 * Pull all data from Firestore into local Dexie database (Cloud Restore)
 */
export async function pullAllDataFromCloud(
  onProgress?: (progress: { message: string; percent: number }) => void
): Promise<{ success: boolean; totalRecords: number; error?: string }> {
  if (!navigator.onLine) {
    return { success: false, totalRecords: 0, error: 'No internet connection' };
  }

  const settings = await db.settings.toCollection().first();
  if (!settings?.firebaseConfig || !settings.firebaseConfig.enabled) {
    return { success: false, totalRecords: 0, error: 'Firebase is not configured or disabled' };
  }

  const initRes = initFirebase(settings.firebaseConfig);
  if (!initRes.success || !firestoreDb) {
    return { success: false, totalRecords: 0, error: initRes.error || 'Initialization failed' };
  }

  updateStatus({ state: 'syncing' });
  const shopId = settings.firebaseConfig.shopId || 'zenexis-pos-main';

  const tablesToPull: Array<{ name: string; getTable: () => any }> = [
    { name: 'products', getTable: () => db.products },
    { name: 'categories', getTable: () => db.categories },
    { name: 'sales', getTable: () => db.sales },
    { name: 'customers', getTable: () => db.customers },
    { name: 'suppliers', getTable: () => db.suppliers },
    { name: 'purchases', getTable: () => db.purchases },
    { name: 'repairJobs', getTable: () => db.repairJobs },
    { name: 'reloadTransactions', getTable: () => db.reloadTransactions },
    { name: 'expenses', getTable: () => db.expenses },
    { name: 'salaries', getTable: () => db.salaries },
    { name: 'shifts', getTable: () => db.shifts },
    { name: 'auditLogs', getTable: () => db.auditLogs },
  ];

  let totalRecords = 0;
  let processed = 0;
  isRestoringFromCloud = true;

  try {
    for (const item of tablesToPull) {
      if (onProgress) {
        const percent = Math.round((processed / tablesToPull.length) * 100);
        onProgress({ message: `Fetching ${item.name} from cloud...`, percent });
      }

      const colRef = collection(firestoreDb, `shops/${shopId}/${item.name}`);
      const snapshot = await getDocs(colRef);

      const docsToUpsert: any[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        delete data._syncedAt;
        if (data.id) {
          docsToUpsert.push(data);
        }
      });

      if (docsToUpsert.length > 0) {
        await item.getTable().bulkPut(docsToUpsert);
        totalRecords += docsToUpsert.length;
      }

      processed++;
    }

    const lastSyncTime = new Date().toISOString();
    updateStatus({
      state: 'synced',
      pendingCount: 0,
      lastSyncTime,
      errorMessage: undefined,
    });

    if (onProgress) {
      onProgress({ message: `Restore complete! ${totalRecords} records restored from cloud`, percent: 100 });
    }

    return { success: true, totalRecords };
  } catch (err: any) {
    console.error('Error during cloud restore:', err);
    updateStatus({ state: 'error', errorMessage: err.message });
    return { success: false, totalRecords, error: err.message || 'Cloud restore failed' };
  } finally {
    isRestoringFromCloud = false;
  }
}

/**
 * Start the background synchronization worker
 */
export function startCloudSyncWorker(): () => void {
  // Setup Dexie mutation hooks so any DB change is queued
  setupDexieSyncHooks();
  // Update online state on connectivity events
  const handleOnline = () => {
    updateStatus({ isOnline: true });
    processSyncQueue();
  };

  const handleOffline = () => {
    updateStatus({ isOnline: false, state: 'offline' });
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  // Load initial settings and trigger sync
  db.settings.toCollection().first().then(settings => {
    if (settings?.firebaseConfig?.enabled) {
      initFirebase(settings.firebaseConfig);
      const intervalMs = (settings.firebaseConfig.syncIntervalMinutes || 2) * 60 * 1000;

      // Start periodic sync interval
      if (syncTimer) clearInterval(syncTimer);
      syncTimer = setInterval(() => {
        if (navigator.onLine) {
          processSyncQueue();
        }
      }, intervalMs);

      // Initial queue check
      processSyncQueue();
    }
  });

  // Return cleanup function
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  };
}
