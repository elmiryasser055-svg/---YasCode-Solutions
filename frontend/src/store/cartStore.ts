// src/store/cartStore.ts
//
// سلة البيع تعيش بالكامل في ذاكرة الواجهة (renderer state) — لا تُكتب أي بيانات
// في قاعدة البيانات إلا عند "إتمام البيع" (استدعاء sales:create). هذا يطابق
// تصميم الباك-إند في sales.service.ts الذي يحسب كل شيء من مدخلات نظيفة دفعة واحدة.

import { create } from "zustand";

export interface CartItem {
  productId: number;
  name: string;
  barcode: string | null;
  unitType: "piece" | "weight";
  sellingPrice: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  discount: number;
  addItem: (product: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  setDiscount: (discount: number) => void;
  clear: () => void;
  subtotal: () => number;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,

  addItem: (product, quantity = 1) => {
    set((state) => {
      const existing = state.items.find((i) => i.productId === product.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === product.productId ? { ...i, quantity: i.quantity + quantity } : i
          ),
        };
      }
      return { items: [...state.items, { ...product, quantity }] };
    });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    }));
  },

  removeItem: (productId) => {
    set((state) => ({ items: state.items.filter((i) => i.productId !== productId) }));
  },

  setDiscount: (discount) => set({ discount }),

  clear: () => set({ items: [], discount: 0 }),

  subtotal: () => get().items.reduce((sum, i) => sum + i.sellingPrice * i.quantity, 0),

  total: () => get().subtotal() - get().discount,
}));
