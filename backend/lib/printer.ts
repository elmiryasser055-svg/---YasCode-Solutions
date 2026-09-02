// lib/printer.ts
// طبقة تجريد فوق مكتبة الطباعة الحرارية — بقية الموديولات (sales, inventory)
// لا تتعامل مع node-thermal-printer مباشرة، بل عبر هذه الدوال، حتى يسهل
// استبدال المكتبة لاحقًا دون تغيير أي منطق عمل.

import { ThermalPrinter, PrinterTypes } from "node-thermal-printer";
import { logger } from "./logger";

let printerInstance: ThermalPrinter | null = null;
let configuredInterface: string | null = null;

/**
 * ⭐ يسدّ فجوة: كان اسم الطابعة يُحفظ في app_settings (موديول settings) لكن
 * بلا أي أثر فعلي هنا — هذا الملف كان يستخدم دائمًا "usb" ثابتًا في الكود.
 * الآن printing.service.ts يستدعي هذه الدالة بقيمة الإعداد الفعلية قبل كل
 * طباعة. القيمة الفارغة (لم يضبط المالك شيئًا بعد) تعني الاعتماد على الاكتشاف
 * التلقائي القياسي لأول طابعة USB متوافقة.
 */
export function configurePrinter(interfaceName?: string) {
  const targetInterface = interfaceName && interfaceName.trim() !== "" ? interfaceName : "usb";

  // لا داعي لإعادة إنشاء الكائن إن لم يتغيّر شيء — تجنّب فتح اتصال جديد بالطابعة بلا سبب
  if (printerInstance && configuredInterface === targetInterface) return;

  printerInstance = new ThermalPrinter({
    type: PrinterTypes.EPSON, // متوافق مع أغلب طابعات ESC/POS الشائعة
    interface: targetInterface,
  });
  configuredInterface = targetInterface;
}

export function getPrinter(): ThermalPrinter {
  if (!printerInstance) configurePrinter(); // افتراضي "usb" إن لم يُستدعَ configurePrinter من قبل بعد
  return printerInstance!;
}

export interface TicketData {
  saleNumber: string;
  cashierName: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>;
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string;
}

export async function printSaleTicket(data: TicketData): Promise<void> {
  const printer = getPrinter();

  try {
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      throw new Error("الطابعة غير متصلة."); // يُلتقط بواسطة ipcErrorHandler ويُعرض برسالة عامة آمنة أعلى مستوى
    }

    printer.alignCenter();
    printer.println("YasCode Store");
    printer.drawLine();
    printer.alignLeft();
    printer.println(`رقم الفاتورة: ${data.saleNumber}`);
    printer.println(`الكاشير: ${data.cashierName}`);
    printer.println(`التاريخ: ${data.createdAt}`);
    printer.drawLine();

    for (const item of data.items) {
      printer.println(`${item.name}`);
      printer.println(`  ${item.quantity} × ${item.unitPrice} = ${item.lineTotal}`);
    }

    printer.drawLine();
    printer.println(`المجموع الفرعي: ${data.subtotal}`);
    if (data.discount > 0) printer.println(`الخصم: ${data.discount}`);
    printer.bold(true);
    printer.println(`الإجمالي: ${data.total}`);
    printer.bold(false);
    printer.cut();

    await printer.execute();
  } catch (err) {
    logger.error("فشل طباعة التذكرة", err);
    throw err; // يُعالَج ويُحوَّل لرسالة آمنة في middleware/ipcErrorHandler.ts
  }
}

/** طباعة ملصق باركود (نفس الطابعة الحرارية، حسب القرار المعتمد) */
export async function printBarcodeLabel(barcodeImageBuffer: Buffer, productName: string) {
  const printer = getPrinter();
  printer.alignCenter();
  printer.println(productName);
  printer.printImageBuffer(barcodeImageBuffer);
  printer.cut();
  await printer.execute();
}
