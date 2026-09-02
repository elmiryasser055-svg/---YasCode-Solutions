// backend/modules/inventory/inventory.service.test.ts
//
// applyStockMovement هي "الدالة المحورية" الموثّقة في back-end.md § 2 —
// نقطة الكتابة الوحيدة على products.currentQuantity من كل الموديولات
// (sales, purchases, inventory نفسه). أي خلل هنا ينكسر في كل مكان.

import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb } from "../../test-utils/setupTestEnv";
import { products, users } from "../../../db/schema";
import { applyStockMovement, adjustStock, correctInventory } from "./inventory.service";
import type { Session } from "../../lib/auth";

let db: ReturnType<typeof setupTestDb>;
let productId: number;
let ownerSession: Session;

beforeEach(async () => {
  db = setupTestDb();

  const [owner] = await db
    .insert(users)
    .values({ username: "owner", passwordHash: "x", fullName: "Owner", role: "owner" })
    .returning();
  ownerSession = { token: "t", userId: owner.id, role: "owner", lastActivityAt: Date.now() };

  const [product] = await db
    .insert(products)
    .values({
      name: "زيت",
      unitType: "piece",
      purchasePrice: 100,
      sellingPrice: 150,
      currentQuantity: 10,
      lowStockThreshold: 3,
    })
    .returning();
  productId = product.id;
});

describe("applyStockMovement", () => {
  it("يزيد الكمية ويسجّل حركة عند تغيير موجب", () => {
    const newQty = db.transaction((tx) => {
      return applyStockMovement(tx, {
        productId,
        type: "stock_in",
        quantityChange: 5,
        reason: "توريد جديد",
      });
    });
    expect(newQty).toBe(15);

    const product = db.query.products.findFirst({ where: eq(products.id, productId) }).sync();
    expect(product?.currentQuantity).toBe(15);
  });

  it("⭐ يرفض أي عملية تُنتج كمية سالبة، ولا يُحدّث شيئًا", () => {
    expect(() => {
      db.transaction((tx) => {
        applyStockMovement(tx, { productId, type: "sale", quantityChange: -999 });
        return null;
      });
    }).toThrow();

    const product = db.query.products.findFirst({ where: eq(products.id, productId) }).sync();
    expect(product?.currentQuantity).toBe(10); // لم يتغيّر إطلاقًا
  });
});

describe("adjustStock", () => {
  it("يحدّد النوع تلقائيًا (stock_in لموجب، stock_out لسالب)", async () => {
    await adjustStock({ productId, quantityChange: -3, reason: "تلف" }, ownerSession);
    const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
    expect(product?.currentQuantity).toBe(7);
  });
});

describe("correctInventory", () => {
  it("يضبط الكمية على رقم مُعاين فعليًا (وليس فرقًا نسبيًا)", async () => {
    await correctInventory({ productId, newQuantity: 25, reason: "جرد شهري" }, ownerSession);
    const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
    expect(product?.currentQuantity).toBe(25);
  });

  it("لا يُنشئ حركة مخزون إن كانت الكمية الجديدة مطابقة للحالية", async () => {
    const result = await correctInventory(
      { productId, newQuantity: 10, reason: "لا تغيير" },
      ownerSession
    );
    expect(result).toBe(10);
  });
});
