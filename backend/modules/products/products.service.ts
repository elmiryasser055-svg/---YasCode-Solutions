// modules/products/products.service.ts
//
// ⭐ يسدّ فجوة: كان البحث محدودًا بـ 30 نتيجة ثابتة بلا أي إمكانية تصفح
// (pagination) — لن يعمل بشكل صحيح مع مخزون كبير. الآن يدعم page/pageSize
// حقيقيَّين، ويُعيد العدد الإجمالي حتى تعرف الواجهة عدد الصفحات فعليًا.

import { eq, like, or, count } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { products, auditLog } from "../../../db/schema";
import { BusinessRuleError, NotFoundError } from "../../middleware/errors";
import type { Session } from "../../lib/auth";
import type { CreateProductInput, UpdateProductInput, SearchProductsInput } from "./products.schema";

async function assertBarcodeAvailable(barcode: string | null | undefined, excludeId?: number) {
  if (!barcode) return;
  const db = getDb();
  const existing = await db.query.products.findFirst({ where: eq(products.barcode, barcode) });
  if (existing && existing.id !== excludeId) {
    throw new BusinessRuleError("هذا الباركود مستخدم بالفعل لمنتج آخر.");
  }
}

export async function createProduct(input: CreateProductInput, _session: Session) {
  await assertBarcodeAvailable(input.barcode ?? null);

  const db = getDb();
  const [created] = await db
    .insert(products)
    .values({
      barcode: input.barcode ?? null,
      name: input.name,
      categoryId: input.categoryId ?? null,
      unitType: input.unitType,
      weightUnit: input.weightUnit ?? null,
      purchasePrice: input.purchasePrice,
      sellingPrice: input.sellingPrice,
      currentQuantity: 0, // الكمية تُضاف لاحقًا عبر moduleات inventory/purchases، وليس عند الإنشاء
      lowStockThreshold: input.lowStockThreshold,
      expiryDate: input.expiryDate ?? null,
    })
    .returning();

  return created;
}

export async function updateProduct(input: UpdateProductInput, session: Session) {
  const db = getDb();
  const existing = await db.query.products.findFirst({ where: eq(products.id, input.id) });
  if (!existing) throw new NotFoundError("المنتج غير موجود.");

  // تسجيل أي تغيير في الأسعار في audit_log — مطلوب صراحة (تعديل الأسعار عملية حسّاسة)
  const priceChanged =
    (input.purchasePrice !== undefined && input.purchasePrice !== existing.purchasePrice) ||
    (input.sellingPrice !== undefined && input.sellingPrice !== existing.sellingPrice);

  const [updated] = await db
    .update(products)
    .set({
      name: input.name ?? existing.name,
      categoryId: input.categoryId !== undefined ? input.categoryId : existing.categoryId,
      purchasePrice: input.purchasePrice ?? existing.purchasePrice,
      sellingPrice: input.sellingPrice ?? existing.sellingPrice,
      lowStockThreshold: input.lowStockThreshold ?? existing.lowStockThreshold,
      expiryDate: input.expiryDate !== undefined ? input.expiryDate : existing.expiryDate,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(products.id, input.id))
    .returning();

  if (priceChanged) {
    await db.insert(auditLog).values({
      userId: session.userId,
      action: "price_change",
      entityType: "product",
      entityId: existing.id,
      oldValue: JSON.stringify({
        purchasePrice: existing.purchasePrice,
        sellingPrice: existing.sellingPrice,
      }),
      newValue: JSON.stringify({
        purchasePrice: updated.purchasePrice,
        sellingPrice: updated.sellingPrice,
      }),
    });
  }

  return updated;
}

/** بحث بالاسم (جزئي) أو بالباركود (مطابقة تامة) — متاح لكل الأدوار لأن الكاشير يحتاجه أثناء البيع */
export async function searchProducts(input: SearchProductsInput) {
  const db = getDb();
  const whereClause = or(like(products.name, `%${input.query}%`), eq(products.barcode, input.query));

  const [items, totalResult] = await Promise.all([
    db.query.products.findMany({
      where: whereClause,
      limit: input.pageSize,
      offset: (input.page - 1) * input.pageSize,
    }),
    db.select({ value: count() }).from(products).where(whereClause),
  ]);

  const total = totalResult[0]?.value ?? 0;

  return {
    items,
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
  };
}

export async function getProductById(id: number) {
  const db = getDb();
  const product = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!product) throw new NotFoundError("المنتج غير موجود.");
  return product;
}

/** تعطيل منطقي بدل الحذف الفعلي — يحافظ على سلامة الفواتير التاريخية المرتبطة (راجع schemaDB.md) */
export async function deactivateProduct(id: number, _session: Session) {
  const db = getDb();
  const existing = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!existing) throw new NotFoundError("المنتج غير موجود.");

  await db.update(products).set({ isActive: false }).where(eq(products.id, id));
  return { success: true };
}
