/**
 * Zenexis Free Print Bridge Client SDK
 * Provides 100% free, local, silent thermal printing from any Web or Desktop POS
 * Zero cloud dependency, Zero monthly subscription fees.
 */

export interface DetectedPrinter {
  name: string;
  isDefault: boolean;
  port?: string;
  driver?: string;
  status?: number;
}

export interface BridgeHealthStatus {
  online: boolean;
  version?: string;
  port?: number;
  host?: string;
  error?: string;
}

export interface PrintJobOptions {
  printerName?: string;
  html?: string;
  text?: string;
  width?: '80mm' | '58mm';
  cut?: boolean;
  openDrawer?: boolean;
}

export class PrintBridgeClient {
  private static BASE_URL = 'http://127.0.0.1:18211';

  /**
   * Check if the Zenexis Local Print Bridge service is active on localhost:18211
   */
  static async checkStatus(): Promise<BridgeHealthStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(`${this.BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          online: true,
          version: data.version || '1.0.0',
          port: data.port || 18211,
          host: data.host || '127.0.0.1',
        };
      }
      return { online: false, error: `HTTP ${res.status}` };
    } catch (err: any) {
      return { online: false, error: err.message || 'Bridge offline' };
    }
  }

  /**
   * Fetch all installed Windows system printers (via Bridge or Electron)
   */
  static async getPrinters(): Promise<DetectedPrinter[]> {
    // 1. Try Electron native API if running inside Electron wrapper
    if ((window as any).electronAPI?.getSystemPrinters) {
      try {
        const electronPrinters = await (window as any).electronAPI.getSystemPrinters();
        if (Array.isArray(electronPrinters) && electronPrinters.length > 0) {
          return electronPrinters.map((p: any) => ({
            name: p.name || p.displayName,
            isDefault: Boolean(p.isDefault),
            port: p.port || '',
            driver: p.driver || '',
          }));
        }
      } catch (e) {
        console.warn('Electron getSystemPrinters fallback to bridge:', e);
      }
    }

    // 2. Try Local Print Bridge on localhost:18211
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${this.BASE_URL}/printers`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.printers)) {
          return data.printers;
        }
      }
    } catch (err) {
      // Bridge is not running
    }

    return [];
  }

  /**
   * Send a silent print job to a thermal printer
   */
  static async print(options: PrintJobOptions): Promise<{ success: boolean; message?: string; error?: string }> {
    // 1. If running in Electron, use Electron native silent print
    if ((window as any).electronAPI?.printThermalReceipt) {
      try {
        const res = await (window as any).electronAPI.printThermalReceipt({
          silent: true,
          printerName: options.printerName,
          html: options.html,
          width: options.width,
        });
        if (res.success) {
          return { success: true, message: 'Printed silently via Electron Desktop Engine' };
        }
      } catch (err: any) {
        console.warn('Electron print failed, attempting bridge:', err);
      }
    }

    // 2. Use Zenexis Free Local Print Bridge
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${this.BASE_URL}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerName: options.printerName || '',
          html: options.html,
          text: options.text,
          width: options.width || '80mm',
          cut: options.cut !== false,
          openDrawer: Boolean(options.openDrawer),
          silent: true,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return { success: true, message: data.message || 'Print job sent successfully' };
      }
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || `HTTP ${res.status}` };
    } catch (err: any) {
      return {
        success: false,
        error: `Print bridge unavailable (${err.message}). Start start-bridge.bat for direct silent printing.`,
      };
    }
  }

  /**
   * Send a cash drawer kick pulse (RJ11 / ESC p)
   */
  static async openCashDrawer(printerName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.BASE_URL}/open-drawer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerName: printerName || '' }),
      });
      if (res.ok) return { success: true };
      return { success: false, error: `HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Print a standardized test receipt to verify thermal alignment & auto-cutter
   */
  static async printTestReceipt(
    printerName?: string,
    width: '80mm' | '58mm' = '80mm',
    shopName = 'ZENEXIS POS'
  ): Promise<{ success: boolean; error?: string }> {
    const testHtml = `
      <div style="font-family: monospace; font-size: 11px; text-align: center; line-height: 1.3;">
        <h2 style="margin: 2px 0 0; font-size: 15px; font-weight: bold;">${shopName}</h2>
        <p style="margin: 2px 0; font-size: 10px;">FREE SILENT PRINT TEST</p>
        <p style="margin: 2px 0; font-size: 9px;">${new Date().toLocaleString()}</p>
        <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>
        <table style="width: 100%; font-size: 10px; border-collapse: collapse; text-align: left;">
          <tr>
            <th style="padding: 2px 0;">TEST ITEM</th>
            <th style="text-align: center; padding: 2px 0;">QTY</th>
            <th style="text-align: right; padding: 2px 0;">PRICE</th>
          </tr>
          <tr style="border-top: 1px dotted #ccc;">
            <td style="padding: 2px 0;">Direct Silent Print</td>
            <td style="text-align: center;">1</td>
            <td style="text-align: right;">Rs. 0.00</td>
          </tr>
          <tr>
            <td style="padding: 2px 0;">Paper Roll Width</td>
            <td style="text-align: center;">-</td>
            <td style="text-align: right;">${width}</td>
          </tr>
        </table>
        <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>
        <p style="margin: 2px 0; font-weight: bold; text-align: right; font-size: 11px;">STATUS: OPERATIONAL</p>
        <p style="margin: 6px 0 2px; font-size: 9px; color: #333;">Zero-Cloud • No Subscription • 100% Free</p>
        <p style="margin: 0; font-size: 8px;">Zenexis POS Print Bridge v1.0</p>
      </div>
    `;

    return this.print({
      printerName,
      html: testHtml,
      width,
      cut: true,
      openDrawer: false,
    });
  }
}
