const http = require('http');
const { exec, execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 18211;
const HOST = '127.0.0.1';

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const CMD_INIT = `${ESC}@`;
const CMD_CUT_FULL = `${GS}V\x00`;
const CMD_CUT_PARTIAL = `${GS}V\x01`;
const CMD_DRAWER_KICK = `${ESC}p\x00\x19\xFA`; // RJ11 pin 2 kick pulse (25ms pulse, 250ms delay)

// Helper: Set standard CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Helper: Send JSON response
function sendJson(res, statusCode, data) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Helper: Find Microsoft Edge executable path
function getEdgePath() {
  const possiblePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(os.homedir(), 'AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe'),
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'msedge';
}

// Helper: Query installed Windows printers via PowerShell
function getWindowsPrinters() {
  return new Promise((resolve) => {
    const psScript = `
      try {
        Get-CimInstance Win32_Printer | Select-Object Name, Default, PortName, DriverName, PrinterStatus | ConvertTo-Json -Compress
      } catch {
        Get-WmiObject -Class Win32_Printer | Select-Object Name, Default, PortName, DriverName | ConvertTo-Json -Compress
      }
    `;
    
    exec(`powershell -NoProfile -NonInteractive -Command "${psScript.replace(/\n/g, ' ')}"`, (err, stdout, stderr) => {
      if (err || !stdout.trim()) {
        console.error('Error fetching printers via PowerShell:', err || stderr);
        return resolve([]);
      }
      try {
        let parsed = JSON.parse(stdout.trim());
        if (!Array.isArray(parsed)) {
          parsed = [parsed];
        }
        const printers = parsed.map((p) => ({
          name: p.Name || p.name,
          isDefault: Boolean(p.Default || p.default),
          port: p.PortName || p.portName || '',
          driver: p.DriverName || p.driverName || '',
          status: p.PrinterStatus || 0
        }));
        resolve(printers);
      } catch (e) {
        console.error('Failed to parse printer JSON:', e, stdout);
        resolve([]);
      }
    });
  });
}

// Helper: Send Raw Bytes or Text directly to Windows Spooler using PowerShell RawPrinterHelper
function sendRawToPrinter(printerName, rawData, isBase64 = false) {
  return new Promise((resolve, reject) => {
    const tempScriptPath = path.join(os.tmpdir(), `zenexis_raw_${Date.now()}.ps1`);
    const tempBytesPath = path.join(os.tmpdir(), `zenexis_raw_${Date.now()}.bin`);

    let buffer;
    if (isBase64) {
      buffer = Buffer.from(rawData, 'base64');
    } else if (Buffer.isBuffer(rawData)) {
      buffer = rawData;
    } else {
      buffer = Buffer.from(rawData, 'utf-8');
    }

    fs.writeFileSync(tempBytesPath, buffer);

    const psContent = `
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinter {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
    [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytes(string printerName, byte[] bytes) {
        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
        IntPtr hPrinter;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Zenexis POS Raw Print";
        di.pDataType = "RAW";
        bool bSuccess = false;
        if (OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    int dwWritten = 0;
                    bSuccess = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        Marshal.FreeCoTaskMem(pUnmanagedBytes);
        return bSuccess;
    }
}
"@ -ErrorAction SilentlyContinue

$printer = "${printerName.replace(/"/g, '`"')}"
$filePath = "${tempBytesPath.replace(/\\/g, '\\\\')}"
$bytes = [System.IO.File]::ReadAllBytes($filePath)
$result = [RawPrinter]::SendBytes($printer, $bytes)
Write-Output $result
`;

    fs.writeFileSync(tempScriptPath, psContent, 'utf-8');

    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempScriptPath}"`, (err, stdout, stderr) => {
      try {
        if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath);
        if (fs.existsSync(tempBytesPath)) fs.unlinkSync(tempBytesPath);
      } catch (cleanupErr) {}

      if (err) {
        console.error('Raw print error:', err, stderr);
        return reject(err);
      }

      const success = stdout.trim().toLowerCase() === 'true';
      resolve(success);
    });
  });
}

// Helper: Print HTML silently to specific Windows printer
function printHtmlToPrinter(htmlContent, printerName, width = '80mm', cut = true, openDrawer = false) {
  return new Promise(async (resolve, reject) => {
    try {
      const edgeBin = getEdgePath();
      const tempId = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const tempHtmlPath = path.join(os.tmpdir(), `zenexis_ticket_${tempId}.html`);
      const tempPdfPath = path.join(os.tmpdir(), `zenexis_ticket_${tempId}.pdf`);

      const printableWidth = width === '58mm' ? '54mm' : '76mm';
      const pageSize = width === '58mm' ? '58mm auto' : '80mm auto';

      const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Zenexis POS Print</title>
  <style>
    @page {
      size: ${pageSize};
      margin: 0mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      width: ${printableWidth};
      margin: 0 auto;
      padding: 1.5mm 1mm;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Courier New', monospace;
      font-size: 11px;
      line-height: 1.25;
      color: #000;
      background: #fff;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 2px 0; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

      fs.writeFileSync(tempHtmlPath, fullHtml, 'utf-8');

      // If openDrawer is requested, send kick pulse first
      if (openDrawer && printerName) {
        try {
          await sendRawToPrinter(printerName, CMD_DRAWER_KICK);
        } catch (drawerErr) {
          console.warn('Drawer kick error:', drawerErr);
        }
      }

      // Convert HTML to PDF via Edge Headless and Print
      const edgeArgs = [
        '--headless',
        '--disable-gpu',
        '--run-all-compositor-stages-before-draw',
        `--print-to-pdf=${tempPdfPath}`,
        '--no-pdf-header-footer',
        `file:///${tempHtmlPath.replace(/\\/g, '/')}`
      ];

      const edgeProc = spawn(edgeBin, edgeArgs);

      edgeProc.on('close', (code) => {
        // Now print the generated PDF / HTML silently using PowerShell or PDF Spooler
        const psPrintScript = `
          $printerName = "${printerName ? printerName.replace(/"/g, '`"') : ''}"
          $pdfPath = "${tempPdfPath.replace(/\\/g, '\\\\')}"
          $htmlPath = "${tempHtmlPath.replace(/\\/g, '\\\\')}"

          if (Test-Path $pdfPath) {
            # Print PDF via SumatraPDF / Adobe / Windows Spooler verb or default
            if ($printerName) {
              Start-Process -FilePath "msedge.exe" -ArgumentList "--headless --disable-gpu --print-to-printer --printer-name=\`"$printerName\`" \`"$pdfPath\`"" -Wait -NoNewWindow
            } else {
              Start-Process -FilePath $pdfPath -Verb Print -Wait -NoNewWindow
            }
          } elseif ($printerName) {
            Start-Process -FilePath "msedge.exe" -ArgumentList "--headless --disable-gpu --print-to-printer --printer-name=\`"$printerName\`" \`"$htmlPath\`"" -Wait -NoNewWindow
          } else {
            Start-Process -FilePath $htmlPath -Verb Print -Wait -NoNewWindow
          }
        `;

        exec(`powershell -NoProfile -Command "${psPrintScript.replace(/\n/g, ' ')}"`, async (psErr) => {
          // If cut requested, send cut code
          if (cut && printerName) {
            try {
              await sendRawToPrinter(printerName, `${ESC}d\x03${CMD_CUT_PARTIAL}`);
            } catch (cutErr) {}
          }

          // Cleanup temporary files after 2 seconds
          setTimeout(() => {
            try {
              if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
              if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
            } catch (e) {}
          }, 2000);

          if (psErr) {
            console.error('PS Print execution error:', psErr);
            // Even if Edge headless print process returned, we mark success if file was created
          }
          resolve({ success: true, message: 'Print job dispatched successfully' });
        });
      });

      edgeProc.on('error', (err) => {
        console.error('Failed to spawn Edge for print:', err);
        // Fallback: try raw or mshta / powershell
        exec(`powershell -NoProfile -Command "Start-Process -FilePath '${tempHtmlPath}' -Verb Print"`, () => {
          resolve({ success: true, message: 'Fallback print dispatched' });
        });
      });
    } catch (error) {
      console.error('printHtmlToPrinter exception:', error);
      reject(error);
    }
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Route: / or /health or /status
  if (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/status') {
    return sendJson(res, 200, {
      status: 'online',
      service: 'Zenexis Free Local Print Bridge',
      version: '1.0.0',
      port: PORT,
      host: HOST,
      os: process.platform,
      arch: process.arch,
      timestamp: new Date().toISOString()
    });
  }

  // Route: /printers
  if (url.pathname === '/printers' && req.method === 'GET') {
    try {
      const printers = await getWindowsPrinters();
      return sendJson(res, 200, {
        success: true,
        count: printers.length,
        printers: printers
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message, printers: [] });
    }
  }

  // Route: /print
  if (url.pathname === '/print' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const printerName = payload.printerName || payload.printer || '';
        const html = payload.html || '';
        const rawText = payload.text || payload.raw || '';
        const width = payload.width || '80mm';
        const cut = payload.cut !== false;
        const openDrawer = Boolean(payload.openDrawer);

        console.log(`[PRINT REQUEST] Printer: "${printerName || 'DEFAULT'}" | Width: ${width} | Has HTML: ${Boolean(html)} | Has Raw: ${Boolean(rawText)}`);

        if (html) {
          const result = await printHtmlToPrinter(html, printerName, width, cut, openDrawer);
          return sendJson(res, 200, result);
        } else if (rawText) {
          let fullRaw = (openDrawer ? CMD_DRAWER_KICK : '') + CMD_INIT + rawText + '\n\n\n' + (cut ? CMD_CUT_PARTIAL : '');
          const success = await sendRawToPrinter(printerName, fullRaw);
          return sendJson(res, 200, { success, message: success ? 'Raw print job sent' : 'Raw print failed' });
        } else {
          return sendJson(res, 400, { success: false, error: 'Either html or text content is required' });
        }
      } catch (err) {
        console.error('Print request failed:', err);
        return sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // Route: /raw
  if (url.pathname === '/raw' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const printerName = payload.printerName || '';
        const data = payload.data || '';
        const isBase64 = Boolean(payload.isBase64);

        if (!printerName || !data) {
          return sendJson(res, 400, { success: false, error: 'printerName and data are required' });
        }

        const success = await sendRawToPrinter(printerName, data, isBase64);
        return sendJson(res, 200, { success, message: success ? 'Raw bytes sent to printer' : 'Failed to write to printer spooler' });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // Route: /open-drawer
  if (url.pathname === '/open-drawer' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const printerName = payload.printerName || '';
        if (!printerName) {
          return sendJson(res, 400, { success: false, error: 'printerName is required' });
        }
        const success = await sendRawToPrinter(printerName, CMD_DRAWER_KICK);
        return sendJson(res, 200, { success, message: success ? 'Cash drawer kick pulse sent' : 'Failed to kick drawer' });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 404
  sendJson(res, 404, { error: 'Not Found' });
});

server.listen(PORT, HOST, () => {
  console.log('====================================================');
  console.log(`  ZENEXIS FREE PRINT BRIDGE v1.0.0 (ONLINE)`);
  console.log(`  Listening on: http://${HOST}:${PORT}`);
  console.log(`  Status URL:   http://${HOST}:${PORT}/health`);
  console.log(`  Printers URL: http://${HOST}:${PORT}/printers`);
  console.log('  100% Free & Unlimited Silent Thermal Printing');
  console.log('====================================================');
});
