// backend/modules/products/products.service.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDb } from "../../test-utils/setupTestEnv";
import { products } from "../../../db/schema";
import { searchProducts } from "./products.service";

let db: ReturnType<typeof setupTestDb>;

beforeEach(async () => {
  db = setupTestDb();
  // 25 منتجًا يحتوي اسمها كلها على "قلم" لاختبار pagination بوضوح
  for (let i = 1; i <= 25; i++) {
    await db.insert(products).values({
      name: `قلم رقم ${i}`,
      unitType: "piece",
      purchasePrice: 1,
      sellingPrice: 2,
      currentQuantity: 10,
      lowStockThreshold: 2,
    });
  }
});

describe("products.service — searchProducts (pagination)", () => {
  it("⭐ يُعيد فقط pageSize من النتائج مع العدد الإجمالي الصحيح", async () => {
    const result = await searchProducts({ query: "قلم", page: 1, pageSize: 10 });
    expect(result.items).toHaveLength(10);
    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(1);
  });

  it("الصفحة الثانية تُعيد عناصر مختلفة عن الأولى", async () => {
    const page1 = await searchProducts({ query: "قلم", page: 1, pageSize: 10 });
    const page2 = await searchProducts({ query: "قلم", page: 2, pageSize: 10 });

    const page1Ids = page1.items.map((p) => p.id);
    const page2Ids = page2.items.map((p) => p.id);
    expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false); // لا تداخل إطلاقًا
  });

  it("الصفحة الأخيرة تُعيد الباقي فقط (5 عناصر من أصل 25 بحجم صفحة 10)", async () => {
    const page3 = await searchProducts({ query: "قلم", page: 3, pageSize: 10 });
    expect(page3.items).toHaveLength(5);
  });

  it("بحث بلا نتائج يُعيد total=0 وtotalPages=1 (وليس 0)", async () => {
    const result = await searchProducts({ query: "منتج غير موجود إطلاقًا", page: 1, pageSize: 10 });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
  });
});
