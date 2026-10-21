// lib/printer.ts
import { BrowserWindow, systemPreferences } from "electron";
import { logger } from "./logger";

export interface ReceiptSettings {
  storeName: string;
  phone: string;
  address: string;
  footerMessage: string;
  paperWidth: "80mm" | "58mm";
}

export interface TicketData {
  saleNumber: string;
  cashierName: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>;
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string;
  settings: ReceiptSettings;
}

let configuredPrinterName: string | null = null;

export function configurePrinter(printerName?: string) {
  configuredPrinterName = printerName && printerName.trim() !== "" ? printerName.trim() : null;
}

function money(n: number): string {
  return n.toFixed(2);
}

function generateTicketHTML(data: TicketData): string {
  const width = data.settings.paperWidth || "80mm";
  const safeWidth = width === "80mm" ? "76mm" : "54mm"; 
  
  const itemsRows = data.items.map(item => `
    <div class="item-block">
      <div class="item-top">
        <span class="item-name">${item.name}</span>
        <span class="item-total">${money(item.lineTotal)}</span>
      </div>
      <div class="item-sub">
        ${item.quantity} × ${money(item.unitPrice)}
      </div>
    </div>
  `).join('');

  const totalItems = data.items.reduce((sum, item) => sum + item.quantity, 0);

  return `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: ${width} auto; margin: 0 !important; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { margin: 0 !important; padding: 0 !important; }
        body { 
          /* ⭐ Tahoma يطبع العربية والفرنسية بشكل ممتاز على الطابعات الحرارية */
          font-family: 'Tahoma', 'Arial', sans-serif; 
          width: ${width}; 
          color: #000; 
          -webkit-print-color-adjust: exact; 
        }
        .ticket {
          width: ${safeWidth};
          margin: 0 auto;
          direction: rtl; /* الإعداد الافتراضي للعربية */
          padding: 1mm 0 12mm 0; /* مساحة 1mm علوي و 12mm سفلي للقطع */
        }
        
        /* الرأس */
        .header { text-align: center; margin-bottom: 6px; }
        .header h2 { font-size: 18px; font-weight: 800; letter-spacing: 0.5px; }
        .header p { font-size: 11px; color: #333; margin-top: 3px; line-height: 1.4; }
        
        /* صندوق المعلومات */
        .info-box { 
          font-size: 11px; 
          margin-bottom: 8px; 
          border-top: 2px dashed #000; 
          border-bottom: 2px dashed #000; 
          padding: 5px 0; 
        }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
        .info-row:last-child { margin-bottom: 0; }
        .label { font-weight: 600; color: #555; }
        
        /* الأصناف */
        .items-list { margin-top: 5px; }
        .item-block { 
          margin-bottom: 6px; 
          padding-bottom: 4px; 
          border-bottom: 1px dotted #ccc;
        }
        .item-top { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          font-size: 12px; 
          font-weight: 700; 
        }
        /* ⭐ دعم اللغتين: إذا كان النص فرنسياً سيتجه لليسار تلقائياً */
        .item-name { 
          flex: 1; 
          padding-left: 5px; 
          unicode-bidi: plaintext; 
        }
        .item-total { white-space: nowrap; font-weight: bold; }
        .item-sub { 
          text-align: left; 
          font-size: 10px; 
          color: #555; 
          margin-top: 2px; 
          padding-right: 5px; 
          direction: ltr;
        }
        
        /* الإجماليات */
        .totals { 
          margin-top: 10px; 
          font-size: 12px; 
        }
        .total-row { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 4px; 
        }
        .grand-total { 
          font-size: 15px; 
          font-weight: 900; 
          border-top: 2px solid #000; 
          margin-top: 6px; 
          padding-top: 6px; 
        }
        
        /* التذييل */
        .footer { 
          text-align: center; 
          margin-top: 12px; 
          font-size: 11px; 
        }
        .footer p { margin-bottom: 3px; }
        .dashed { border-top: 1px dashed #000; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="ticket">
        <!-- الرأس -->
        <div class="header">
          <h2>${data.settings.storeName || "YasCode Store"}</h2>
          ${data.settings.phone ? `<p>هاتف / Tél: ${data.settings.phone}</p>` : ''}
          ${data.settings.address ? `<p>${data.settings.address}</p>` : ''}
        </div>
        
        <!-- معلومات الفاتورة -->
        <div class="info-box">
          <div class="info-row">
            <span class="label">رقم الفاتورة / Facture N°:</span> 
            <strong>${data.saleNumber}</strong>
          </div>
          <div class="info-row">
            <span class="label">التاريخ / Date:</span> 
            <span>${new Date(data.createdAt).toLocaleString('fr-FR')}</span>
          </div>
          <div class="info-row">
            <span class="label">الكاشير / Caissier:</span> 
            <span>${data.cashierName}</span>
          </div>
        </div>

        <!-- قائمة الأصناف -->
        <div class="items-list">${itemsRows}</div>

        <!-- الإجماليات -->
        <div class="totals">
          <div class="total-row">
            <span>المجموع الفرعي / Sous-total:</span> 
            <span>${money(data.subtotal)}</span>
          </div>
          ${data.discount > 0 ? `
          <div class="total-row">
            <span>الخصم / Remise:</span> 
            <span>- ${money(data.discount)}</span>
          </div>` : ''}
          <div class="total-row grand-total">
            <span>الإجمالي / Total:</span> 
            <span>${money(data.total)}</span>
          </div>
        </div>

        <div class="dashed"></div>
        
        <!-- التذييل -->
        <div class="footer">
          <p>عدد الأصناف: ${data.items.length} | الكمية: ${totalItems}</p>
          ${data.settings.footerMessage ? `<p>${data.settings.footerMessage}</p>` : '<p>شكراً لزيارتكم / Merci de votre visite</p>'}
        </div>
      </div>
    </body>
    </html>
  `;
}

interface PrintOptions {
  silent?: boolean;
  printBackground?: boolean;
  deviceName?: string;
  margins?: { marginType: 'none' | 'printableArea' | 'custom' | 'default'; top?: number; bottom?: number; left?: number; right?: number };
  pageSize?: string | { width: number; height: number };
}

// ⭐ دالة الطباعة المباشرة
export async function printSaleTicket(data: TicketData): Promise<void> {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({ show: false });
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(generateTicketHTML(data)));
    
    win.webContents.on('did-finish-load', () => {
      const options: PrintOptions = {
        silent: true,
        printBackground: true,
        margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
        pageSize: { width: 80000, height: 300000 }, 
      };
      
      if (configuredPrinterName) options.deviceName = configuredPrinterName;

      win.webContents.print(options as any, (success, error) => {
        setTimeout(() => win.destroy(), 500); 
        
        if (success) {
          resolve();
        } else {
          logger.error("فشل في الإرسال للطابعة", error);
          reject(new Error(error || "فشل في الإرسال للطابعة. تأكد من أنها متصلة وأن الاسم صحيح."));
        }
      });
    });

    win.webContents.on('did-fail-load', (e, errorCode, errorDescription) => {
      win.destroy();
      logger.error("فشل تحميل HTML للطابعة", errorDescription);
      reject(new Error(errorDescription));
    });
  });
}

// ⭐ دالة المعاينة
export async function previewSaleTicket(data: TicketData): Promise<void> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({ 
      show: true, 
      width: 400, 
      height: 600, 
      title: "معاينة الفاتورة",
      autoHideMenuBar: true
    });
    
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(generateTicketHTML(data)));
    
    win.on('closed', () => resolve());
  });
}

// ⭐ دالة طباعة ملصق الباركود
export async function printBarcodeLabel(barcodeImageBuffer: Buffer, productName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const base64Image = barcodeImageBuffer.toString('base64');
    const html = `
      <html>
      <head>
      <meta charset="UTF-8">
      <style>
        @page { size: 80mm auto; margin: 0 !important; }
        * { margin: 0; padding: 0; }
        body { margin: 0 !important; padding: 0 !important; width: 80mm; font-family: 'Tahoma', sans-serif; }
        .ticket { width: 72mm; margin: 0 auto; direction: rtl; text-align: center; padding: 1mm 0 12mm 0; }
        .name { font-size: 14px; margin-bottom: 5px; font-weight: bold; unicode-bidi: plaintext; }
        img { max-width: 100%; }
      </style>
      </head>
      <body>
        <div class="ticket">
          <div class="name">${productName}</div>
          <img src="data:image/png;base64,${base64Image}" />
        </div>
      </body>
      </html>
    `;
    
    const win = new BrowserWindow({ show: false });
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

    win.webContents.on('did-finish-load', () => {
      const options: PrintOptions = {
        silent: true,
        printBackground: true,
        margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
        pageSize: { width: 80000, height: 300000 }, 
      };
      
      if (configuredPrinterName) options.deviceName = configuredPrinterName;

      win.webContents.print(options as any, (success, error) => {
        setTimeout(() => win.destroy(), 500);
        success ? resolve() : reject(new Error(error || "تعذّرت طباعة الباركود"));
      });
    });

    win.webContents.on('did-fail-load', (e, errorCode, errorDescription) => {
      win.destroy();
      reject(new Error(errorDescription));
    });
  });
}

// ⭐ جلب قائمة الطابعات المثبتة في النظام
export function listAvailablePrinters(): string[] {
  try {
    const modernPrinters = (systemPreferences as any).getPrinters?.();
    if (modernPrinters && modernPrinters.length > 0) {
      return modernPrinters.map((p: any) => p.name ?? "");
    }

    const win = new BrowserWindow({ show: false });
    const oldPrinters = (win.webContents as any).getPrinters?.() ?? [];
    win.destroy();
    return oldPrinters.map((p: any) => p.name ?? "");
  } catch (err) {
    logger.error("تعذّر جلب لائحة الطابعات", err);
    return [];
  }
}