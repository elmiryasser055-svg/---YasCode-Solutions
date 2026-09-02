// modules/printing/printing.service.ts
//
// ⭐ هذا الملف يسدّ فجوة كانت موجودة: lib/printer.ts وlib/barcodeGenerator.ts
// (المرحلة 3) كانا موجودين كطبقة تجريد فقط، بلا أي service/ipc يستدعيهما فعليًا.
//
// قرار تصميم مهم: الطباعة **منفصلة تمامًا** عن transaction البيع في sales.service.ts.
// لو فشلت الطباعة (طابعة غير متصلة، ورق نافد...) يجب ألا تُلغى عملية البيع التي
// نجحت فعليًا في قاعدة البيانات — البيع حدث بالفعل، والطباعة مجرد إخراج ورقي
// يمكن إعادة محاولته أو تجاوزه دون التأثير على سلامة البيانات المالية.

import { eq } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { sales, products, users } from "../../../db/schema";
import {
  printSaleTicket as printTicketRaw,
  printBarcodeLabel as printLabelRaw,
  configurePrinter,
} from "../../lib/printer";
import { assignGeneratedBarcode, generateBarcodeImage } from "../../lib/barcodeGenerator";
import { getSetting } from "../settings/settings.service";
import { NotFoundError } from "../../middleware/errors";

/**
 * ⭐ يسدّ فجوة: يقرأ اسم الطابعة المضبوط فعليًا من app_settings (شاشة
 * الإعدادات) قبل كل عملية طباعة، ويهيّئ lib/printer.ts به. من قبل كان
 * الإعداد يُحفظ في القاعدة بلا أي تأثير فعلي على أي طباعة.
 */
async function ensurePrinterConfigured() {
  const printerName = await getSetting("printerName");
  configurePrinter(printerName);
}

export async function printSaleTicket(saleId: number) {
  await ensurePrinterConfigured();

  const db = getDb();
  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
    with: { items: true },
  });
  if (!sale) throw new NotFoundError("عملية البيع غير موجودة.");

  const cashier = await db.query.users.findFirst({ where: eq(users.id, sale.cashierId) });

  await printTicketRaw({
    saleNumber: sale.saleNumber,
    cashierName: cashier?.fullName ?? "-",
    items: sale.items.map((item) => ({
      name: item.productNameSnapshot,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,
    createdAt: sale.createdAt,
  });

  return { success: true };
}

/**
 * طباعة ملصق باركود لمنتج. إن لم يملك المنتج باركودًا بعد، يُولَّد له واحد
 * تلقائيًا أولاً (عبر lib/barcodeGenerator.ts) ثم يُطبع مباشرة — بدل اضطرار
 * المستخدم لاستدعاء عمليتين منفصلتين يدويًا.
 */
export async function printBarcodeLabel(productId: number, copies: number) {
  await ensurePrinterConfigured();

  const db = getDb();
  const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!product) throw new NotFoundError("المنتج غير موجود.");

  let barcode = product.barcode;
  let imageBuffer: Buffer;

  if (!barcode) {
    const generated = await assignGeneratedBarcode(productId);
    barcode = generated.barcode;
    imageBuffer = generated.imageBuffer;
  } else {
    imageBuffer = await generateBarcodeImage(barcode);
  }

  for (let i = 0; i < copies; i++) {
    await printLabelRaw(imageBuffer, product.name);
  }

  return { barcode, copiesPrinted: copies };
}
