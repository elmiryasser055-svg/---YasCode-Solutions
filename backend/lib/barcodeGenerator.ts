// lib/barcodeGenerator.ts
import bwipjs from "bwip-js";
import { getDb } from "./db";
import { products } from "../../db/schema";
import { eq } from "drizzle-orm";
import { NotFoundError, BusinessRuleError } from "../middleware/errors";

/** يولّد باركود فريدًا بصيغة CODE128 مبني على معرّف المنتج الداخلي (يضمن عدم التكرار) */
export function generateBarcodeValue(productId: number): string {
  // بادئة "INT" (Internal) لتمييزه بصريًا عن باركود المصنع الأصلي عند الطباعة/البحث
  return `INT${String(productId).padStart(10, "0")}`;
}

export async function generateBarcodeImage(value: string): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: "code128",
    text: value,
    scale: 3,
    height: 10,
    includetext: true,
    textxalign: "center",
  });
}

/** يولّد ويحفظ باركود جديد لمنتج لا يملك واحدًا بعد */
export async function assignGeneratedBarcode(productId: number) {
  const db = getDb();
  const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!product) throw new NotFoundError("المنتج غير موجود.");
  if (product.barcode) {
    throw new BusinessRuleError("هذا المنتج يملك باركود مسبقًا.");
  }

  const value = generateBarcodeValue(productId);
  await db
    .update(products)
    .set({ barcode: value, isBarcodeGenerated: true })
    .where(eq(products.id, productId));

  return { barcode: value, imageBuffer: await generateBarcodeImage(value) };
}
