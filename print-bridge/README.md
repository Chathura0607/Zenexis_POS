# 🖨️ Zenexis Free Print Bridge (Local Service)
### 100% Free • Unlimited • Zero Cloud Cost • Silent Direct Thermal Printing

---

## 🌟 Overview (සිංහල & English)

Web application එකකින් Thermal Printer (80mm / 58mm POS Printer) එකකට Browser Print Dialog (print popup preview) එකක් නැතුව **Direct Silent Print** කරන්න පුළුවන් 100% නොමිලේ ලැබෙන Open-Source Local Print Service එකක්.

PrintBridge වැනි Paid සේවාවන් වලට මාසිකව මුදල් ගෙවන්නේ නැතුව, කිසිම Cloud dependency එකක් නැතුව, Offline පවා සුපිරියටම වැඩ කරන permanent solution එකකි.

---

## 🚀 Quick Start Guide (පටන් ගන්නා ආකාරය)

### 1. Start Print Bridge (ක්‍රියාත්මක කිරීම)
1. මෙම `print-bridge` folder එක open කරන්න.
2. `start-bridge.bat` file එක double click කරන්න.
3. කළු Terminal window එකක් open වී `ZENEXIS FREE PRINT BRIDGE (ONLINE) on http://127.0.0.1:18211` ලෙස දිස්වනු ඇත.

### 2. Auto-Start on Windows Boot (PC එක on වෙනකොටම auto run වෙන්න)
1. `install-autostart.bat` file එක double click කරන්න.
2. එවිට Windows Startup එකට background process එකක් විදිහට add වේ. PC එක restart කළත් background එකේ silent print bridge එක දිගටම වැඩ කරයි!

---

## ⚙️ How it works (තාක්ෂණික ක්‍රමවේදය)

1. **Local Agent Architecture**:
   - Cashier PC එකේ `http://127.0.0.1:18211` port එකේ Node.js lightweight background server එකක් run වේ.
   - Web application එකෙන් (Chrome / Edge / Cloud) Javascript මඟින් `fetch('http://127.0.0.1:18211/print', ...)` request එකක් එවනු ලැබේ.
   - Print Bridge එක මඟින් කෙලින්ම Windows Print Spooler එකට හෝ ESC/POS Hardware port එකට silent print command යවයි.
   - කිසිම Print Dialog එකක් pop up නොවී මිලි තත්පර 100කින් Receipt එක print වී auto cut වේ!

2. **API Endpoints**:
   - `GET http://127.0.0.1:18211/health` - Bridge status & health check
   - `GET http://127.0.0.1:18211/printers` - Installed Windows printers list & default printer
   - `POST http://127.0.0.1:18211/print` - Send HTML or RAW text for silent thermal print
   - `POST http://127.0.0.1:18211/open-drawer` - Kick RJ11 cash drawer open
   - `POST http://127.0.0.1:18211/raw` - Raw ESC/POS byte streaming

---

## 💻 Sample Code for Web Developers (වෙනත් Web App වලටත් පාවිච්චි කළ හැකි ආකාරය)

```javascript
// 1. Get List of Installed Printers
async function fetchPrinters() {
  try {
    const res = await fetch('http://127.0.0.1:18211/printers');
    const data = await res.json();
    console.log('Detected Printers:', data.printers);
    return data.printers;
  } catch (err) {
    console.error('Print Bridge offline:', err);
  }
}

// 2. Direct Silent Print Receipt (No Dialog!)
async function printReceiptSilent(printerName = '', htmlContent = '', paperWidth = '80mm') {
  try {
    const payload = {
      printerName: printerName, // e.g. "Xprinter XP-80" or "" for default
      width: paperWidth,        // "80mm" or "58mm"
      html: htmlContent,
      cut: true,                // Auto-cut paper
      openDrawer: false,        // Kick cash drawer
      silent: true
    };

    const res = await fetch('http://127.0.0.1:18211/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    console.log('Print dispatched successfully:', result);
  } catch (err) {
    console.error('Silent print failed:', err);
  }
}

// 3. Open RJ11 Cash Drawer
async function kickCashDrawer(printerName = '') {
  await fetch('http://127.0.0.1:18211/open-drawer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ printerName })
  });
}
```

---

## 🎯 Additional Free Alternative: Chrome Kiosk Silent Printing
Web App එකක් සඳහා කිසිම Bridge script එකක්වත් නැතුව Chrome එකෙන්ම Silent Print කිරීමට:
1. Desktop එකේ ඇති Chrome shortcut එකට Right Click කර **Properties** යන්න.
2. **Target** කොටසේ අගට space එකක් තබා `--kiosk-printing` add කරන්න:
   ```cmd
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing
   ```
3. දැන් එම shortcut එකෙන් Chrome open කළ විට ඕනෑම web page එකකින් `window.print()` දුන් සැනින් Dialog නැතුව Default Printer එකෙන් Print වේ!
