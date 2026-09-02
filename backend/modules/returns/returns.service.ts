// modules/returns/returns.service.ts
//
// ⭐ يسدّ فجوة: جدول returns كان معرَّفًا في السكيمة (المرحلة 2) لتغطية
// "إرجاع منتج واحد من فاتورة متعددة المنتجات" (راجع schemaDB.md § 1)، لكن
// لم يُبنَ له أي service — فقط "إلغاء الفاتورة كاملة" (sales.cancelSale) كان
// متاحًا فعليًا، وهو أخشن بكثير من الحاجة الفعلية لإرجاع منتج واحد فقط.

import { eq, sum } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { saleItems, sales, returns, cashMovements } from "../../../db/schema";
import { applyStockMovement } from "../inventory/inventory.service";
import { NotFoundError, BusinessRuleError } from "../../middleware/errors";
import type { Session } from "../../lib/auth";
import type { CreateReturnInput } from "./returns.schema";

export async function createReturn(input: CreateReturnInput, session: Session) {
  const db = getDb();

  // ⚠️ إصلاح حرج (نفس مشكلة sales.service.ts): db.transaction() يجب أن يكون
  // متزامنًا بالكامل مع better-sqlite3 — راجع الشرح المفصَّل هناك
  return db.transaction((tx) => {
    const saleItem = tx.query.saleItems.findFirst({ where: eq(saleItems.id, input.saleItemId) }).sync();
    if (!saleItem) throw new NotFoundError("بند البيع غير موجود.");
    if (!saleItem.productId) {
      throw new BusinessRuleError("المنتج المرتبط بهذا البند لم يعد موجودًا، لا يمكن إرجاعه للمخزون.");
    }

    const sale = tx.query.sales.findFirst({ where: eq(sales.id, saleItem.saleId) }).sync();
    if (!sale || sale.status === "cancelled") {
      throw new BusinessRuleError("لا يمكن إرجاع منتج من فاتورة ملغاة.");
    }

    // منع إرجاع كمية أكبر مما بيع فعليًا (مع احتساب أي إرجاعات جزئية سابقة لنفس البند)
    const alreadyReturned = tx
      .select({ total: sum(returns.quantity) })
      .from(returns)
      .where(eq(returns.saleItemId, input.saleItemId))
      .get();
    const returnedSoFar = Number(alreadyReturned?.total ?? 0);

    const remainingReturnable = saleItem.quantity - returnedSoFar;
    if (input.quantity > remainingReturnable) {
      throw new BusinessRuleError(
        `الكمية المطلوب إرجاعها أكبر من المتبقي القابل للإرجاع (${remainingReturnable}).`
      );
    }

    // نسبة الخصم (إن وُجد) تُطبَّق على مبلغ الاسترجاع أيضًا حتى يبقى متسقًا مع صافي ما دفعه الزبون فعليًا
    const discountRatio = sale.subtotal > 0 ? sale.total / sale.subtotal : 1;
    const refundAmount = saleItem.unitPrice * input.quantity * discountRatio;

    const createdReturn = tx
      .insert(returns)
      .values({
        saleItemId: input.saleItemId,
        quantity: input.quantity,
        reason: input.reason,
        refundAmount,
        userId: session.userId,
      })
      .returning()
      .get();

    applyStockMovement(tx, {
      productId: saleItem.productId,
      type: "return",
      quantityChange: input.quantity, // موجب: يعود للمخزون
      referenceType: "sale",
      referenceId: sale.id,
      userId: session.userId,
      reason: input.reason,
    });

    tx.insert(cashMovements)
      .values({
        sessionId: sale.cashRegisterSessionId,
        type: "return",
        amount: -refundAmount, // سالب: يخرج من الصندوق
        relatedSaleId: sale.id,
        userId: session.userId,
        description: `إرجاع جزئي (${input.quantity} من ${saleItem.productNameSnapshot}): ${input.reason}`,
      })
      .run();

    return createdReturn;
  });
}

export async function getReturnsForSale(saleId: number) {
  const db = getDb();
  const items = await db.query.saleItems.findMany({
    where: eq(saleItems.saleId, saleId),
    with: { returns: true },
  });
  return items.flatMap((item) => item.returns);
}
