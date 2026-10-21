// modules/printing/printing.service.ts
import { eq } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { sales, products, users } from "../../../db/schema";
import {
  printSaleTicket as printTicketRaw,
  previewSaleTicket as previewTicketRaw,
  printBarcodeLabel as printLabelRaw,
  configurePrinter,
} from "../../lib/printer";
import { assignGeneratedBarcode, generateBarcodeImage } from "../../lib/barcodeGenerator";
import { getSetting } from "../settings/settings.service";
import { NotFoundError } from "../../middleware/errors";

async function ensurePrinterConfigured() {
  const printerName = await getSetting("printerName");
  configurePrinter(printerName);
}

async function getReceiptSettings() {
  return {
    storeName: await getSetting("receipt_store_name"),
    phone: await getSetting("receipt_phone"),
    address: await getSetting("receipt_address"),
    footerMessage: await getSetting("receipt_footer"),
    paperWidth: ((await getSetting("receipt_width")) as "80mm" | "58mm") || "80mm",
  };
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
  const settings = await getReceiptSettings();

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
    settings,
  });

  return { success: true };
}

export async function previewSaleTicket(saleId: number) {
  const db = getDb();
  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
    with: { items: true },
  });
  if (!sale) throw new NotFoundError("عملية البيع غير موجودة.");

  const cashier = await db.query.users.findFirst({ where: eq(users.id, sale.cashierId) });
  const settings = await getReceiptSettings();

  await previewTicketRaw({
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
    settings,
  });

  return { success: true };
}

// ⭐ دالة معاينة القالب فقط (ببيانات وهمية) لشاشة الإعدادات
export async function previewReceiptTemplate() {
  const settings = await getReceiptSettings();

  const dummyData = {
    saleNumber: "PREVIEW-1234",
    cashierName: "اسم الكاشير",
    items: [
      { name: "منتج تجريبي 1", quantity: 2, unitPrice: 15.5, lineTotal: 31.0 },
      { name: "منتج تجريبي 2", quantity: 1, unitPrice: 40.0, lineTotal: 40.0 },
      { name: "منتج بالوزن (كغ)", quantity: 1.5, unitPrice: 10.0, lineTotal: 15.0 },
    ],
    subtotal: 86.0,
    discount: 6.0,
    total: 80.0,
    createdAt: new Date().toISOString(),
    settings,
  };

  await previewTicketRaw(dummyData);
  return { success: true };
}

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

