// modules/categories/categories.service.ts
//
// ⭐ يسدّ فجوة: جدول categories موجود في السكيمة منذ المرحلة 2 و
// products.categoryId يشير إليه، لكن لم يكن هناك أي service/ipc لإدارته —
// لا طريقة كانت موجودة لإنشاء فئة جديدة من أي مكان.

import { eq } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { categories } from "../../../db/schema";
import { NotFoundError } from "../../middleware/errors";
import type { CreateCategoryInput, UpdateCategoryInput } from "./categories.schema";

export async function createCategory(input: CreateCategoryInput) {
  const db = getDb();
  const [created] = await db.insert(categories).values({ name: input.name }).returning();
  return created;
}

export async function updateCategory(input: UpdateCategoryInput) {
  const db = getDb();
  const existing = await db.query.categories.findFirst({ where: eq(categories.id, input.id) });
  if (!existing) throw new NotFoundError("الفئة غير موجودة.");

  const [updated] = await db
    .update(categories)
    .set({ name: input.name })
    .where(eq(categories.id, input.id))
    .returning();
  return updated;
}

export async function listCategories() {
  const db = getDb();
  return db.query.categories.findMany({ orderBy: (c, { asc }) => [asc(c.name)] });
}

/**
 * حذف فعلي (وليس تعطيل منطقي) — يجوز هنا بعكس المنتجات لأن الفئة نفسها ليست
 * جزءًا من أي سجل مالي تاريخي؛ `products.categoryId` معرَّف بـ `onDelete: "set null"`
 * في السكيمة (المرحلة 2)، فحذف فئة تُستخدم حاليًا لا يكسر شيئًا — منتجاتها
 * تصبح ببساطة "بلا فئة" بدل أن تبقى مرتبطة بفئة محذوفة.
 */
export async function deleteCategory(id: number) {
  const db = getDb();
  const existing = await db.query.categories.findFirst({ where: eq(categories.id, id) });
  if (!existing) throw new NotFoundError("الفئة غير موجودة.");

  await db.delete(categories).where(eq(categories.id, id));
  return { success: true };
}
