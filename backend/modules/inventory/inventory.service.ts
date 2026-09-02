// modules/inventory/inventory.service.ts
import { and, eq, gte, lte, isNotNull } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { getDb } from "../../lib/db";
import { products, stockMovements } from "../../../db/schema";
import { BusinessRuleError, NotFoundError } from "../../middleware/errors";
import type { Session } from "../../lib/auth";
import type * as schema from "../../../db/schema";
import type { StockAdjustmentInput, InventoryAdjustmentInput } from "./inventory.schema";

type DbOrTx = BetterSQLite3Database<typeof schema>;

/**
 * ⭐ دالة مشتركة أساسية: تُسجّل حركة مخزون وتُحدّث الكمية الحالية للمنتج
 * ضمن نفس transaction دائمًا. تُستخدم من هنا (تعديل يدوي) ومن موديول sales
 * (بيع/إلغاء بيع) ومن موديول purchases (شراء) — نقطة وحيدة للكتابة على
 * currentQuantity حتى تبقى السكيمة والـ ledger متطابقين دائمًا (راجع schemaDB.md).
 *
 * ⚠️ إصلاح حرج: هذه الدالة كانت `async` مع `await` على كل استدعاء — وهذا
 * **يكسر فعليًا** أي transaction تُستدعى ضمنها، لأن better-sqlite3 (خلافًا
 * لمعظم قواعد البيانات) لا يدعم إطلاقًا transactions غير متزامنة: أي دالة
 * تُمرَّر إلى `db.transaction(...)` يجب أن تكون **متزامنة بالكامل** (بلا
 * async/await)، وإلا يرمي better-sqlite3 خطأ "Transaction function cannot
 * return a promise" فورًا عند أول استدعاء فعلي — وهو ما أثبتته الاختبارات
 * التي كتبتها للتو. الإصلاح: استبدال `await tx.query...findFirst()` بـ
 * `tx.query...findFirst().sync()`، واستبدال `await tx.insert/update(...)` بـ
 * `.run()`/`.get()` المتزامنَين مباشرة.
 */
export function applyStockMovement(
  tx: DbOrTx,
  params: {
    productId: number;
    type: (typeof stockMovements.$inferInsert)["type"];
    quantityChange: number;
    reason?: string;
    referenceType?: "sale" | "purchase" | "manual";
    referenceId?: number;
    userId?: number;
  }
) {
  const product = tx.query.products.findFirst({
    where: eq(products.id, params.productId),
  }).sync();
  if (!product) throw new NotFoundError("المنتج غير موجود.");

  const newQuantity = product.currentQuantity + params.quantityChange;
  if (newQuantity < 0) {
    throw new BusinessRuleError(
      `الكمية المتوفرة (${product.currentQuantity}) أقل من الكمية المطلوبة.`
    );
  }

  tx.update(products)
    .set({ currentQuantity: newQuantity, updatedAt: new Date().toISOString() })
    .where(eq(products.id, params.productId))
    .run();

  tx.insert(stockMovements)
    .values({
      productId: params.productId,
      type: params.type,
      quantityChange: params.quantityChange,
      quantityAfter: newQuantity,
      reason: params.reason,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      userId: params.userId,
    })
    .run();

  return newQuantity;
}

/** تعديل يدوي: stock_in أو stock_out (يُحدَّد النوع تلقائيًا حسب إشارة الكمية) */
export async function adjustStock(input: StockAdjustmentInput, session: Session) {
  const db = getDb();
  return db.transaction((tx) => {
    return applyStockMovement(tx, {
      productId: input.productId,
      type: input.quantityChange > 0 ? "stock_in" : "stock_out",
      quantityChange: input.quantityChange,
      reason: input.reason,
      referenceType: "manual",
      userId: session.userId,
    });
  });
}

/** تصحيح جرد كامل (inventory adjustment): يضبط الكمية على رقم مُعاين فعليًا، لا فرق نسبي */
export async function correctInventory(input: InventoryAdjustmentInput, session: Session) {
  const db = getDb();
  // ملاحظة: هذا الاستعلام خارج transaction تمامًا (يستخدم db وليس tx)، لذا
  // await طبيعي وآمن هنا — القيد يخص فقط الكود الواقع داخل db.transaction()
  const product = await db.query.products.findFirst({ where: eq(products.id, input.productId) });
  if (!product) throw new NotFoundError("المنتج غير موجود.");

  const diff = input.newQuantity - product.currentQuantity;
  if (diff === 0) return product.currentQuantity;

  return db.transaction((tx) => {
    return applyStockMovement(tx, {
      productId: input.productId,
      type: "adjustment",
      quantityChange: diff,
      reason: input.reason,
      referenceType: "manual",
      userId: session.userId,
    });
  });
}

export async function getLowStockProducts() {
  const db = getDb();
  const all = await db.query.products.findMany({ where: eq(products.isActive, true) });
  return all.filter((p) => p.currentQuantity <= p.lowStockThreshold);
}

export async function getExpiringProducts(withinDays: number) {
  const db = getDb();
  const today = new Date();
  const limit = new Date(today.getTime() + withinDays * 24 * 60 * 60 * 1000);

  return db.query.products.findMany({
    where: and(
      isNotNull(products.expiryDate),
      gte(products.expiryDate, today.toISOString().slice(0, 10)),
      lte(products.expiryDate, limit.toISOString().slice(0, 10))
    ),
  });
}

export async function getExpiredProducts() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  return db.query.products.findMany({
    where: and(isNotNull(products.expiryDate), lte(products.expiryDate, today)),
  });
}

export async function getStockMovementHistory(productId: number) {
  const db = getDb();
  return db.query.stockMovements.findMany({
    where: eq(stockMovements.productId, productId),
    orderBy: (m, { desc }) => [desc(m.createdAt)],
  });
}
