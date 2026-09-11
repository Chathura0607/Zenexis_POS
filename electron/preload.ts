import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  printThermalReceipt: (options?: { silent?: boolean; printerName?: string; html?: string; width?: string }) => Promise<{ success: boolean; error?: string }>;
  getSystemPrinters: () => Promise<any[]>;
  saveDatabaseBackup: (dataString: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  loadDatabaseBackup: () => Promise<{ success: boolean; data?: string; filePath?: string; canceled?: boolean; error?: string }>;
}

const electronAPI: ElectronAPI = {
  printThermalReceipt: (options) => ipcRenderer.invoke('print-thermal-receipt', options),
  getSystemPrinters: () => ipcRenderer.invoke('get-system-printers'),
  saveDatabaseBackup: (data) => ipcRenderer.invoke('save-database-backup', data),
  loadDatabaseBackup: () => ipcRenderer.invoke('load-database-backup'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
