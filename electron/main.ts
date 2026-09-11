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

import http from 'http';

function startEmbeddedPrintBridgeServer() {
  const PORT = 18211;
  const HOST = '127.0.0.1';

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    if (url.pathname === '/health' || url.pathname === '/' || url.pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        service: 'Zenexis Desktop Embedded Print Bridge',
        version: '1.0.0',
        port: PORT,
      }));
      return;
    }

    if (url.pathname === '/printers' && req.method === 'GET') {
      try {
        const printers = (await mainWindow?.webContents.getPrintersAsync()) || [];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          count: printers.length,
          printers: printers.map((p) => ({
            name: p.name || p.displayName,
            isDefault: p.isDefault,
            port: p.port || '',
            driver: p.driver || '',
          })),
        }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message, printers: [] }));
      }
      return;
    }

    if (url.pathname === '/print' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const is58mm = payload.width === '58mm';
          const rollWidthMicrons = is58mm ? 58000 : 80000;
          const bodyWidth = is58mm ? '54mm' : '76mm';

          if (payload.html) {
            const printWin = new BrowserWindow({
              show: false,
              width: 400,
              height: 600,
              webPreferences: { nodeIntegration: false, contextIsolation: true },
            });

            const styledHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  @page { size: ${is58mm ? '58mm auto' : '80mm auto'}; margin: 0; }
                  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  body { width: ${bodyWidth}; margin: 0 auto; padding: 2mm 1mm; font-family: monospace; font-size: 11px; line-height: 1.25; }
                  table { width: 100%; border-collapse: collapse; }
                  th, td { padding: 2px 0; }
                </style>
              </head>
              <body>${payload.html}</body>
              </html>
            `;

            await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(styledHtml)}`);
            printWin.webContents.print({
              silent: true,
              printBackground: true,
              deviceName: payload.printerName || '',
              margins: { marginType: 'none' },
              pageSize: { width: rollWidthMicrons, height: 297000 },
            }, (success) => {
              printWin.destroy();
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Printed silently via desktop app' }));
            return;
          }

          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'HTML content required' }));
        } catch (e: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log('Port 18211 already in use, using existing print bridge service');
    } else {
      console.error('Embedded print bridge error:', err);
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`Zenexis Embedded Print Bridge active on http://${HOST}:${PORT}`);
  });
}

app.whenReady().then(() => {
  createWindow();
  startEmbeddedPrintBridgeServer();

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
ipcMain.handle('print-thermal-receipt', async (_event, options: { silent?: boolean; printerName?: string; html?: string; width?: string }) => {
  try {
    const is58mm = options?.width === '58mm';
    const rollWidthMicrons = is58mm ? 58000 : 80000;
    const bodyWidth = is58mm ? '54mm' : '76mm';

    if (options?.html) {
      // Create hidden window for offscreen silent thermal printing
      const printWin = new BrowserWindow({
        show: false,
        width: 400,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      const styledHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: ${is58mm ? '58mm auto' : '80mm auto'}; margin: 0; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { width: ${bodyWidth}; margin: 0 auto; padding: 2mm 1mm; font-family: monospace; font-size: 11px; line-height: 1.25; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 2px 0; }
          </style>
        </head>
        <body>${options.html}</body>
        </html>
      `;

      await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(styledHtml)}`);

      return new Promise((resolve) => {
        printWin.webContents.print({
          silent: options.silent ?? true,
          printBackground: true,
          deviceName: options.printerName || '',
          margins: { marginType: 'none' },
          pageSize: { width: rollWidthMicrons, height: 297000 },
        }, (success, failureReason) => {
          printWin.destroy();
          if (!success) {
            console.error('Electron silent print failed:', failureReason);
            resolve({ success: false, error: failureReason });
          } else {
            resolve({ success: true });
          }
        });
      });
    }

    if (!mainWindow) return { success: false, error: 'Window not initialized' };
    mainWindow.webContents.print({
      silent: options?.silent ?? false,
      printBackground: true,
      deviceName: options?.printerName || '',
      margins: { marginType: 'none' },
      pageSize: { width: rollWidthMicrons, height: 297000 },
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
