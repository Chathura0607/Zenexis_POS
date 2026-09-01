import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 868,
    minWidth: 1024,
    minHeight: 700,
    title: 'Zenexis POS - Communication, Printing & Repair Center',
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in default browser safely with protocol validation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
        shell.openExternal(url);
      }
    } catch {
      // Invalid URL format ignored
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler: Thermal Receipt Printing
ipcMain.handle('print-thermal-receipt', async (_event, options: { silent?: boolean; printerName?: string }) => {
  if (!mainWindow) return { success: false, error: 'Window not initialized' };
  try {
    mainWindow.webContents.print({
      silent: options.silent ?? false,
      printBackground: true,
      deviceName: options.printerName || '',
      margins: { marginType: 'none' },
      pageSize: { width: 80000, height: 297000 }, // Standard 80mm roll width representation
    }, (success, failureReason) => {
      if (!success) console.error('Print failed:', failureReason);
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// IPC Handler: Get System Printers
ipcMain.handle('get-system-printers', async () => {
  if (!mainWindow) return [];
  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers;
  } catch (error) {
    console.error('Error fetching printers:', error);
    return [];
  }
});

// IPC Handler: Backup Export to File
ipcMain.handle('save-database-backup', async (_event, dataString: string) => {
  if (!mainWindow) return { success: false, error: 'No active window' };
  try {
    const dateStr = new Date().toISOString().slice(0, 10);
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Zenexis POS Database Backup',
      defaultPath: `zenexis-pos-backup-${dateStr}.json`,
      filters: [{ name: 'JSON Backup (*.json)', extensions: ['json'] }]
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    fs.writeFileSync(filePath, dataString, 'utf-8');
    return { success: true, filePath };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// IPC Handler: Backup Import from File
ipcMain.handle('load-database-backup', async () => {
  if (!mainWindow) return { success: false, error: 'No active window' };
  try {
    const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Zenexis POS Database Backup File',
      properties: ['openFile'],
      filters: [{ name: 'JSON Backup (*.json)', extensions: ['json'] }]
    });

    if (canceled || !filePaths.length) return { success: false, canceled: true };

    const content = fs.readFileSync(filePaths[0], 'utf-8');
    return { success: true, data: content, filePath: filePaths[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
