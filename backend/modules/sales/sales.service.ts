// modules/sales/sales.service.ts
//
// ⭐ هذا الملف يطبّق حرفيًا "سيناريو 1" و"سيناريو 2" الموثّقين في schemaDB.md
// (المرحلة 2): كل عملية بيع أو إلغاء بيع تحدث ضمن transaction واحدة تضمن
// عدم إمكانية وجود "بيع منتصف منفّذ" حتى عند انقطاع الكهرباء المفاجئ.
//
// ⚠️ إصلاح حرج: كل الدوال هنا كانت تستخدم `db.transaction(async (tx) => {...})`
// مع `await` داخل الجسم — وهذا خطأ فعلي يمنع أي عملية بيع من العمل إطلاقًا،
// لأن better-sqlite3 لا يدعم transactions غير متزامنة (يرمي "Transaction
// function cannot return a promise" فور أول استدعاء). الإصلاح: كل الكود
// داخل db.transaction() أصبح متزامنًا بالكامل (بلا async/await)، باستخدام
// `.sync()` للاستعلامات العلائقية و`.run()`/`.get()` لبقية العمليات. راجع
// نفس الشرح المفصَّل في backend/modules/inventory/inventory.service.ts.

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
  // رقم قابل للعرض على التذكرة: YYYYMMDD-HHmmss-random
  // (بديل بسيط وكافٍ هنا؛ يمكن استبداله بعدّاد تسلسلي مخزَّن في app_settings لاحقًا)
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `${datePart}-${timePart}-${rand}`;
}

export async function createSale(input: CreateSaleInput, session: Session) {
  const db = getDb();

  // ⚠️ الدالة الممرَّرة هنا يجب أن تبقى غير async — راجع الشرح أعلى الملف
  return db.transaction((tx) => {
    const cashSession = tx.query.cashRegisterSessions
      .findFirst({ where: eq(cashRegisterSessions.id, input.cashRegisterSessionId) })
      .sync();
    if (!cashSession || cashSession.status !== "open") {
      throw new BusinessRuleError("لا توجد جلسة صندوق مفتوحة حاليًا. الرجاء فتح جلسة أولاً.");
    }

    let subtotal = 0;
    const resolvedItems: Array<{
      productId: number;
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

    // 3) بنود البيع + خصم المخزون لكل منتج (عبر الدالة المشتركة applyStockMovement)
    for (const item of resolvedItems) {
      tx.insert(saleItems)
        .values({
          saleId: sale.id,
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

      // applyStockMovement يرمي BusinessRuleError تلقائيًا إن كانت الكمية غير كافية،
      // مما يُلغي (rollback) كامل عملية البيع — لا يمكن أبدًا بيع كمية غير متوفرة
      applyStockMovement(tx, {
        productId: item.productId,
        type: "sale",
        quantityChange: -item.quantity,
        referenceType: "sale",
        referenceId: sale.id,
        userId: session.userId,
      });
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

    // إعادة الكمية لكل منتج في الفاتورة
    for (const item of sale.items) {
      if (!item.productId) continue; // المنتج حُذف نهائيًا لاحقًا — لا يمكن إرجاع كميته
      applyStockMovement(tx, {
        productId: item.productId,
        type: "sale_cancel",
        quantityChange: item.quantity, // موجب: إعادة للمخزون
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

    // سجل تدقيق صريح (بالإضافة للحقول المباشرة على sales)
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
 * ⭐ يسدّ فجوة: كانت "الإلغاء" فقط مبنيًا، بلا "تعديل" فعلي لفاتورة قائمة
 * (مطلوب صراحة في تحليل المرحلة 1: "الغاء وتعديل عملية البيع").
 *
 * الإستراتيجية: عكس أثر كل بند قديم على المخزون (كأنه أُرجع)، حذف البنود
 * القديمة، تطبيق البنود الجديدة من الصفر (نفس منطق createSale)، ثم تصحيح
 * أثر الصندوق **بالفرق فقط** بين الإجمالي القديم والجديد (وليس عكس ثم إعادة
 * كل شيء) لتفادي حركتي صندوق متضخمتين بلا داعٍ. الفاتورة تبقى بنفس saleId
 * (تعديل في مكانها، وليس إلغاء + فاتورة جديدة منفصلة) لأن هذا أوضح للمالك
 * عند مراجعة السجل التاريخي لاحقًا.
 */
export async function editSale(input: EditSaleInput, session: Session) {
  const db = getDb();

  return db.transaction((tx) => {
    const existingSale = tx.query.sales
      .findFirst({ where: eq(sales.id, input.saleId), with: { items: true } })
      .sync();
    if (!existingSale) throw new NotFoundError("عملية البيع غير موجودة.");
    if (existingSale.status === "cancelled") {
      throw new BusinessRuleError("لا يمكن تعديل عملية بيع ملغاة — يمكنك إنشاء فاتورة جديدة بدلاً من ذلك.");
    }

    // 1) عكس أثر كل بند قديم على المخزون (إعادته كأنه لم يُبَع)
    for (const oldItem of existingSale.items) {
      if (!oldItem.productId) continue; // المنتج حُذف نهائيًا لاحقًا — لا يمكن إرجاع كميته لمكان لم يعد موجودًا
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

    // حذف البنود القديمة بالكامل لإعادة بنائها من الصفر بالقيم الجديدة
    tx.delete(saleItems).where(eq(saleItems.saleId, existingSale.id)).run();

    // 2) حساب وتطبيق البنود الجديدة (نفس منطق createSale تمامًا)
    let subtotal = 0;
    const resolvedItems: Array<{
      productId: number;
      productNameSnapshot: string;
      barcodeSnapshot: string | null;
      unitType: "piece" | "weight";
      quantity: number;
      unitPrice: number;
      costPriceSnapshot: number;
      lineTotal: number;
    }> = [];

    for (const item of input.items) {
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

    // 3) تحديث سطر البيع بالإجماليات الجديدة
    tx.update(sales)
      .set({ subtotal, discount: input.discount, total: newTotal })
      .where(eq(sales.id, existingSale.id))
      .run();

    // 4) تصحيح أثر الصندوق بالفرق فقط
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

    // 5) تدقيق كامل للتعديل
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

/**
 * ⭐ يسدّ فجوة موثَّقة صراحة في frontend/src/components/pos/ReturnForm.tsx:
 * قراءة فاتورة كاملة (مع معرّفات sale_item الحقيقية) **بلا أي أثر جانبي** —
 * بعكس getSaleForReprint أدناه الذي يطبع فعليًا ويزيد printCount. قبل إضافة
 * هذه الدالة، كان ReturnForm مضطرًا لاستخدام getSaleForReprint كحل مؤقت،
 * ما يعني طباعة فعلية إضافية في كل مرة يُفتح فيها نموذج الإرجاع.
 */
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
  // ⚠️ خارج أي transaction — await عادي وآمن هنا تمامًا (القيد يخص فقط
  // الكود الواقع داخل db.transaction()، وليس كل استعلامات قاعدة البيانات)
  const db = getDb();
  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
    with: { items: true },
  });
  if (!sale) throw new NotFoundError("عملية البيع غير موجودة.");

  // تتبّع عدد مرات إعادة الطباعة (مطلوب من المرحلة 1: "إعادة طبع الفواتير")
  await db
    .update(sales)
    .set({ printCount: sale.printCount + 1 })
    .where(eq(sales.id, saleId));

  return sale;
}
