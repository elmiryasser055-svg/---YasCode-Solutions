// modules/purchases/purchases.service.ts
//
// نفس نمط transaction الحرج المطبَّق في sales.service.ts: كل فاتورة شراء
// تُنشئ سطر purchases + بنودها + تزيد المخزون عبر applyStockMovement (نفس
// الدالة المشتركة من موديول inventory) — كل ذلك ضمن transaction واحدة.
//
// ⚠️ إصلاح حرج (نفس المشكلة الموثَّقة بالتفصيل في sales.service.ts وفي
// inventory.service.ts): كل الكود هنا كان async/await داخل db.transaction()،
// وهذا لا يعمل إطلاقًا مع better-sqlite3. أُصلح بالكامل ليكون متزامنًا.

import { eq } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { purchases, purchaseItems, products, supplierPayments } from "../../../db/schema";
import { applyStockMovement } from "../inventory/inventory.service";
import { NotFoundError, ValidationError } from "../../middleware/errors";
import type { Session } from "../../lib/auth";
import { getSupplierDebt } from "../suppliers/suppliers.service";
import type { CreatePurchaseInput, RecordSupplierPaymentInput } from "./purchases.schema";

function computeStatus(totalAmount: number, amountPaid: number): "paid" | "partial" | "unpaid" {
  if (amountPaid <= 0) return "unpaid";
  if (amountPaid >= totalAmount) return "paid";
  return "partial";
}

export async function createPurchase(input: CreatePurchaseInput, session: Session) {
  const db = getDb();

  return db.transaction((tx) => {
    let totalAmount = 0;
    for (const item of input.items) {
      totalAmount += item.quantity * item.unitCost;
    }

    if (input.amountPaid > totalAmount) {
      throw new ValidationError("المبلغ المدفوع أكبر من إجمالي الفاتورة.");
    }

    const purchase = tx
      .insert(purchases)
      .values({
        supplierId: input.supplierId,
        invoiceNumber: input.invoiceNumber ?? null,
        totalAmount,
        amountPaid: input.amountPaid,
        status: computeStatus(totalAmount, input.amountPaid),
        userId: session.userId,
      })
      .returning()
      .get();

    for (const item of input.items) {
      const product = tx.query.products.findFirst({ where: eq(products.id, item.productId) }).sync();
      if (!product) throw new NotFoundError(`أحد المنتجات في الفاتورة غير موجود.`);

      tx.insert(purchaseItems)
        .values({
          purchaseId: purchase.id,
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          lineTotal: item.quantity * item.unitCost,
        })
        .run();

      // زيادة المخزون عبر نفس الدالة المشتركة المستخدمة في sales — يضمن سجل تدقيق موحّد
      applyStockMovement(tx, {
        productId: item.productId,
        type: "purchase",
        quantityChange: item.quantity,
        referenceType: "purchase",
        referenceId: purchase.id,
        userId: session.userId,
      });

      // تحديث سعر الشراء المرجعي للمنتج للسعر الأحدث — لا يؤثر على فواتير بيع سابقة
      // (محمية بـ costPriceSnapshot في sale_items، راجع schemaDB.md)
      tx.update(products)
        .set({ purchasePrice: item.unitCost, updatedAt: new Date().toISOString() })
        .where(eq(products.id, item.productId))
        .run();
    }

    // إن كان هناك مبلغ مدفوع فورًا، يُسجَّل كدفعة أولى مرتبطة بهذه الفاتورة
    if (input.amountPaid > 0) {
      tx.insert(supplierPayments)
        .values({
          supplierId: input.supplierId,
          purchaseId: purchase.id,
          amount: input.amountPaid,
          userId: session.userId,
          notes: "دفعة عند استلام الفاتورة",
        })
        .run();
    }

    return purchase;
  });
}

export async function recordSupplierPayment(input: RecordSupplierPaymentInput, session: Session) {
  const db = getDb();

  return db.transaction((tx) => {
    tx.insert(supplierPayments)
      .values({
        supplierId: input.supplierId,
        purchaseId: input.purchaseId ?? null,
        amount: input.amount,
        notes: input.notes ?? null,
        userId: session.userId,
      })
      .run();

    // إن كانت الدفعة مرتبطة بفاتورة محددة، نُحدّث amountPaid/status الخاصين بها
    if (input.purchaseId) {
      const purchase = tx.query.purchases.findFirst({ where: eq(purchases.id, input.purchaseId) }).sync();
      if (!purchase) throw new NotFoundError("فاتورة الشراء غير موجودة.");

      const newAmountPaid = purchase.amountPaid + input.amount;
      tx.update(purchases)
        .set({
          amountPaid: newAmountPaid,
          status: computeStatus(purchase.totalAmount, newAmountPaid),
        })
        .where(eq(purchases.id, purchase.id))
        .run();
    }

    return { success: true };
  });
}

export async function listPurchasesBySupplier(supplierId: number) {
  // خارج transaction — await عادي وآمن هنا
  const db = getDb();
  return db.query.purchases.findMany({
    where: eq(purchases.supplierId, supplierId),
    with: { items: true },
    orderBy: (p, { desc }) => [desc(p.purchaseDate)],
  });
}

export { getSupplierDebt };
