// src/store/cartStore.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "./cartStore";

const sampleProduct = {
  productId: 1,
  name: "خبز",
  barcode: "12345",
  unitType: "piece" as const,
  sellingPrice: 10,
};

beforeEach(() => {
  useCartStore.getState().clear();
});

describe("cartStore", () => {
  it("يبدأ فارغًا", () => {
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().subtotal()).toBe(0);
  });

  it("يضيف منتجًا جديدًا بكمية 1 افتراضيًا", () => {
    useCartStore.getState().addItem(sampleProduct);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(1);
  });

  it("⭐ يجمع الكمية عند إضافة نفس المنتج مرتين (لا يُنشئ سطرًا مكررًا)", () => {
    useCartStore.getState().addItem(sampleProduct);
    useCartStore.getState().addItem(sampleProduct, 2);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it("يحسب subtotal وtotal بشكل صحيح مع خصم", () => {
    useCartStore.getState().addItem(sampleProduct, 3); // 3 × 10 = 30
    useCartStore.getState().setDiscount(5);
    expect(useCartStore.getState().subtotal()).toBe(30);
    expect(useCartStore.getState().total()).toBe(25);
  });

  it("updateQuantity بقيمة صفر أو أقل يحذف العنصر بدل تركه بكمية غير منطقية", () => {
    useCartStore.getState().addItem(sampleProduct, 2);
    useCartStore.getState().updateQuantity(sampleProduct.productId, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("removeItem يحذف المنتج المحدد فقط", () => {
    useCartStore.getState().addItem(sampleProduct);
    useCartStore.getState().addItem({ ...sampleProduct, productId: 2, name: "حليب" });
    useCartStore.getState().removeItem(1);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe(2);
  });

  it("clear يفرّغ السلة والخصم معًا", () => {
    useCartStore.getState().addItem(sampleProduct);
    useCartStore.getState().setDiscount(10);
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().discount).toBe(0);
  });
});
