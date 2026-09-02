// modules/suppliers/suppliers.service.ts
import { eq, sum } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { suppliers, purchases, supplierPayments } from "../../../db/schema";
import { NotFoundError } from "../../middleware/errors";
import type { CreateSupplierInput, UpdateSupplierInput } from "./suppliers.schema";

export async function createSupplier(input: CreateSupplierInput) {
  const db = getDb();
  const [created] = await db
    .insert(suppliers)
    .values({
      name: input.name,
      phone: input.phone ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return created;
}

export async function updateSupplier(input: UpdateSupplierInput) {
  const db = getDb();
  const existing = await db.query.suppliers.findFirst({ where: eq(suppliers.id, input.id) });
  if (!existing) throw new NotFoundError("المورّد غير موجود.");

  const [updated] = await db
    .update(suppliers)
    .set({
      name: input.name ?? existing.name,
      phone: input.phone !== undefined ? input.phone : existing.phone,
      address: input.address !== undefined ? input.address : existing.address,
      notes: input.notes !== undefined ? input.notes : existing.notes,
    })
    .where(eq(suppliers.id, input.id))
    .returning();

  return updated;
}

export async function listSuppliers() {
  const db = getDb();
  return db.query.suppliers.findMany({ where: eq(suppliers.isActive, true) });
}

/**
 * دَين المورّد = مجموع فواتير الشراء - مجموع الدفعات.
 * يُحسب عند الطلب مباشرة (لا يُخزَّن) — راجع تبرير هذا القرار في schemaDB.md § 1.
 */
export async function getSupplierDebt(supplierId: number): Promise<number> {
  const db = getDb();

  const [purchasesTotal] = await db
    .select({ total: sum(purchases.totalAmount) })
    .from(purchases)
    .where(eq(purchases.supplierId, supplierId));

  const [paymentsTotal] = await db
    .select({ total: sum(supplierPayments.amount) })
    .from(supplierPayments)
    .where(eq(supplierPayments.supplierId, supplierId));

  const totalPurchases = Number(purchasesTotal?.total ?? 0);
  const totalPaid = Number(paymentsTotal?.total ?? 0);

  return totalPurchases - totalPaid;
}

export async function deactivateSupplier(id: number) {
  const db = getDb();
  const existing = await db.query.suppliers.findFirst({ where: eq(suppliers.id, id) });
  if (!existing) throw new NotFoundError("المورّد غير موجود.");

  await db.update(suppliers).set({ isActive: false }).where(eq(suppliers.id, id));
  return { success: true };
}
