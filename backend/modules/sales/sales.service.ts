// modules/sales/sales.service.ts

import { eq } from "drizzle-orm";
import { getDb } from "../../lib/db";
import {
  sales,
  saleItems,
  products,
  cashMovements,
  cashRegisterSessions,
  auditLog,
} from "../../../db/schema";
import { applyStockMovement } from "../inventory/inventory.service";
import { BusinessRuleError, NotFoundError, ValidationError } from "../../middleware/errors";
import type { Session } from "../../lib/auth";
import type { CreateSaleInput, CancelSaleInput, EditSaleInput } from "./sales.schema";

function generateSaleNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `${datePart}-${timePart}-${rand}`;
}

export async function createSale(input: CreateSaleInput, session: Session) {
  const db = getDb();

  // ⚠️ الدالة الممرَّرة هنا يجب أن تبقى غير async — راجع الشرح في الملف الأصلي
  return db.transaction((tx) => {
    const cashSession = tx.query.cashRegisterSessions
      .findFirst({ where: eq(cashRegisterSessions.id, input.cashRegisterSessionId) })
      .sync();
    if (!cashSession || cashSession.status !== "open") {
      throw new BusinessRuleError("لا توجد جلسة صندوق مفتوحة حاليًا. الرجاء فتح جلسة أولاً.");
    }

    let subtotal = 0;
    const resolvedItems: Array<{
      productId: number | null; // ⭐ أصبح يقبل null للسعر الحر
      productNameSnapshot: string;
      barcodeSnapshot: string | null;
      unitType: "piece" | "weight";
      quantity: number;
      unitPrice: number;
      costPriceSnapshot: number;
      lineTotal: number;
    }> = [];

    // 1) التحقق من كل المنتجات وحساب الإجمالي قبل أي كتابة
    for (const item of input.items) {
      // ⭐ إذا وُجد productId، نتحقق من المنتج في قاعدة البيانات
      if (item.productId) {
        const product = tx.query.products.findFirst({ where: eq(products.id, item.productId) }).sync();
        if (!product || !product.isActive) {
          throw new NotFoundError(`أحد المنتجات في السلة لم يعد متوفرًا.`);
        }
        const lineTotal = product.sellingPrice * item.quantity;
        subtotal += lineTotal;
        resolvedItems.push({
          productId: product.id,
          productNameSnapshot: product.name,
          barcodeSnapshot: product.barcode,
          unitType: product.unitType as "piece" | "weight",
          quantity: item.quantity,
          unitPrice: product.sellingPrice,
          costPriceSnapshot: product.purchasePrice,
          lineTotal,
        });
      } else {
        // ⭐ وإلا فهو "سعر حر" (لا يخصم من المخزون ولا يبحث عنه في قاعدة البيانات)
        const lineTotal = (item.customPrice ?? 0) * item.quantity;
        subtotal += lineTotal;
        resolvedItems.push({
          productId: null, // لا يوجد منتج
          productNameSnapshot: item.customName!,
          barcodeSnapshot: null,
          unitType: "piece",
          quantity: item.quantity,
          unitPrice: item.customPrice!,
          costPriceSnapshot: 0, // لا توجد تكلفة للسعر الحر
          lineTotal,
        });
      }
    }

    if (input.discount > subtotal) {
      throw new ValidationError("قيمة الخصم أكبر من إجمالي الفاتورة.");
    }
    const total = subtotal - input.discount;

    // 2) إنشاء سطر البيع
    const sale = tx
      .insert(sales)
      .values({
        saleNumber: generateSaleNumber(),
        cashierId: session.userId,
        cashRegisterSessionId: input.cashRegisterSessionId,
        subtotal,
        discount: input.discount,
        total,
        status: "completed",
      })
      .returning()
      .get();

    // 3) بنود البيع + خصم المخزون لكل منتج
    for (const item of resolvedItems) {
      tx.insert(saleItems)
        .values({
          saleId: sale.id,
          productId: item.productId, // قد تكون null وهذا مقبول في السكيمة
          productNameSnapshot: item.productNameSnapshot,
          barcodeSnapshot: item.barcodeSnapshot,
          unitType: item.unitType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPriceSnapshot: item.costPriceSnapshot,
          lineTotal: item.lineTotal,
        })
        .run();

      // ⭐ خصم المخزون فقط إذا كان المنتج حقيقياً (يملك productId)
      if (item.productId) {
        applyStockMovement(tx, {
          productId: item.productId,
          type: "sale",
          quantityChange: -item.quantity,
          referenceType: "sale",
          referenceId: sale.id,
          userId: session.userId,
        });
      }
    }

    // 4) أثر الصندوق
    tx.insert(cashMovements)
      .values({
        sessionId: input.cashRegisterSessionId,
        type: "sale",
        amount: total,
        relatedSaleId: sale.id,
        userId: session.userId,
      })
      .run();

    return { ...sale, items: resolvedItems };
  });
}

export async function cancelSale(input: CancelSaleInput, session: Session) {
  const db = getDb();

  return db.transaction((tx) => {
    const sale = tx.query.sales
      .findFirst({ where: eq(sales.id, input.saleId), with: { items: true } })
      .sync();
    if (!sale) throw new NotFoundError("عملية البيع غير موجودة.");
    if (sale.status === "cancelled") {
      throw new BusinessRuleError("عملية البيع ملغاة مسبقًا.");
    }

    // إعادة الكمية لكل منتج في الفاتورة (إذا كان منتجاً حقيقياً)
    for (const item of sale.items) {
      if (!item.productId) continue; // ⭐ تخطي الأسعار الحرة
      applyStockMovement(tx, {
        productId: item.productId,
        type: "sale_cancel",
        quantityChange: item.quantity,
        referenceType: "sale",
        referenceId: sale.id,
        userId: session.userId,
      });
    }

    // عكس أثر الصندوق
    tx.insert(cashMovements)
      .values({
        sessionId: sale.cashRegisterSessionId,
        type: "return",
        amount: -sale.total,
        relatedSaleId: sale.id,
        userId: session.userId,
        description: `إلغاء بيع رقم ${sale.saleNumber}`,
      })
      .run();

    tx.update(sales)
      .set({
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        cancelledBy: session.userId,
        cancelReason: input.reason,
      })
      .where(eq(sales.id, sale.id))
      .run();

    // سجل تدقيق صريح
    tx.insert(auditLog)
      .values({
        userId: session.userId,
        action: "sale_cancel",
        entityType: "sale",
        entityId: sale.id,
        oldValue: JSON.stringify({ status: sale.status }),
        newValue: JSON.stringify({ status: "cancelled", reason: input.reason }),
      })
      .run();

    return { success: true };
  });
}

/**
 * تم حذف دالة editSale من هنا للاختصار، لكنها نفس المنطق المطبق في createSale:
 * تحقق إذا وُجد productId، وإلا عاملها كسعر حر.
 */
export async function editSale(input: EditSaleInput, session: Session) {
  const db = getDb();

  return db.transaction((tx) => {
    const existingSale = tx.query.sales
      .findFirst({ where: eq(sales.id, input.saleId), with: { items: true } })
      .sync();
    if (!existingSale) throw new NotFoundError("عملية البيع غير موجودة.");
    if (existingSale.status === "cancelled") {
      throw new BusinessRuleError("لا يمكن تعديل عملية بيع ملغاة.");
    }

    // 1) عكس أثر كل بند قديم على المخزون
    for (const oldItem of existingSale.items) {
      if (!oldItem.productId) continue; // ⭐ تخطي الأسعار الحرة
      applyStockMovement(tx, {
        productId: oldItem.productId,
        type: "sale_cancel",
        quantityChange: oldItem.quantity,
        referenceType: "sale",
        referenceId: existingSale.id,
        userId: session.userId,
        reason: `تعديل فاتورة رقم ${existingSale.saleNumber} — إرجاع الكمية القديمة`,
      });
    }

    tx.delete(saleItems).where(eq(saleItems.saleId, existingSale.id)).run();

    // 2) حساب وتطبيق البنود الجديدة
    let subtotal = 0;
    const resolvedItems: Array<{
      productId: number | null;
      productNameSnapshot: string;
      barcodeSnapshot: string | null;
      unitType: "piece" | "weight";
      quantity: number;
      unitPrice: number;
      costPriceSnapshot: number;
      lineTotal: number;
    }> = [];

    for (const item of input.items) {
      if (item.productId) {
        const product = tx.query.products.findFirst({ where: eq(products.id, item.productId) }).sync();
        if (!product || !product.isActive) {
          throw new NotFoundError("أحد المنتجات في الفاتورة المعدَّلة لم يعد متوفرًا.");
        }
        const lineTotal = product.sellingPrice * item.quantity;
        subtotal += lineTotal;
        resolvedItems.push({
          productId: product.id,
          productNameSnapshot: product.name,
          barcodeSnapshot: product.barcode,
          unitType: product.unitType as "piece" | "weight",
          quantity: item.quantity,
          unitPrice: product.sellingPrice,
          costPriceSnapshot: product.purchasePrice,
          lineTotal,
        });
      } else {
        const lineTotal = (item.customPrice ?? 0) * item.quantity;
        subtotal += lineTotal;
        resolvedItems.push({
          productId: null,
          productNameSnapshot: item.customName!,
          barcodeSnapshot: null,
          unitType: "piece",
          quantity: item.quantity,
          unitPrice: item.customPrice!,
          costPriceSnapshot: 0,
          lineTotal,
        });
      }
    }

    if (input.discount > subtotal) {
      throw new ValidationError("قيمة الخصم أكبر من إجمالي الفاتورة المعدَّلة.");
    }
    const newTotal = subtotal - input.discount;

    for (const item of resolvedItems) {
      tx.insert(saleItems)
        .values({
          saleId: existingSale.id,
          productId: item.productId,
          productNameSnapshot: item.productNameSnapshot,
          barcodeSnapshot: item.barcodeSnapshot,
          unitType: item.unitType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPriceSnapshot: item.costPriceSnapshot,
          lineTotal: item.lineTotal,
        })
        .run();

      if (item.productId) {
        applyStockMovement(tx, {
          productId: item.productId,
          type: "sale",
          quantityChange: -item.quantity,
          referenceType: "sale",
          referenceId: existingSale.id,
          userId: session.userId,
          reason: `تعديل فاتورة رقم ${existingSale.saleNumber} — تطبيق الكمية الجديدة`,
        });
      }
    }

    tx.update(sales)
      .set({ subtotal, discount: input.discount, total: newTotal })
      .where(eq(sales.id, existingSale.id))
      .run();

    const cashDelta = newTotal - existingSale.total;
    if (cashDelta !== 0) {
      tx.insert(cashMovements)
        .values({
          sessionId: existingSale.cashRegisterSessionId,
          type: "sale",
          amount: cashDelta,
          relatedSaleId: existingSale.id,
          userId: session.userId,
          description: `تعديل فاتورة رقم ${existingSale.saleNumber} — تصحيح الفرق`,
        })
        .run();
    }

    tx.insert(auditLog)
      .values({
        userId: session.userId,
        action: "sale_edit",
        entityType: "sale",
        entityId: existingSale.id,
        oldValue: JSON.stringify({ total: existingSale.total, itemsCount: existingSale.items.length }),
        newValue: JSON.stringify({ total: newTotal, itemsCount: resolvedItems.length, reason: input.reason }),
      })
      .run();

    return { ...existingSale, subtotal, discount: input.discount, total: newTotal, items: resolvedItems };
  });
}

export async function getSaleById(saleId: number) {
  const db = getDb();
  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
    with: { items: true },
  });
  if (!sale) throw new NotFoundError("عملية البيع غير موجودة.");
  return sale;
}

export async function getSaleForReprint(saleId: number) {
  const db = getDb();
  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
    with: { items: true },
  });
  if (!sale) throw new NotFoundError("عملية البيع غير موجودة.");

  await db
    .update(sales)
    .set({ printCount: sale.printCount + 1 })
    .where(eq(sales.id, saleId));

  return sale;
}