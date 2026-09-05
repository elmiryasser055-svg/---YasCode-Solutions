// src/store/cartStore.ts
//
// سلة البيع تعيش بالكامل في ذاكرة الواجهة (renderer state) — لا تُكتب أي بيانات
// في قاعدة البيانات إلا عند "إتمام البيع" (استدعاء sales:create). هذا يطابق
// تصميم الباك-إند في sales.service.ts الذي يحسب كل شيء من مدخلات نظيفة دفعة واحدة.

import { create } from "zustand";
import type { EditableSaleItem } from '../components/pos/EditSaleForm';


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



export type SaleRecord = {
  id: number;
  saleNumber: string;
  total: number;
  discount: number;
  items: EditableSaleItem[];
};

export interface ReturnData {
  productId: number;
  returnedQty: number;
  unitPrice: number;
}

const MAX_RECENT_SALES = 5;

interface SalesState {
  recentSales: SaleRecord[];
  addRecentSale: (sale: SaleRecord) => void;
  updateRecentSale: (sale: SaleRecord) => void;
  removeRecentSale: (saleId: number) => void;
  updateRecentSaleAfterReturn: (saleId: number, data: ReturnData) => void; // ⭐ دالة جديدة
}

export const useSalesStore = create<SalesState>((set) => ({
  recentSales: [],
  
  addRecentSale: (sale) =>
    set((state) => ({
      recentSales: [sale, ...state.recentSales].slice(0, MAX_RECENT_SALES),
    })),
  
  updateRecentSale: (updatedSale) =>
    set((state) => ({
      recentSales: state.recentSales.map((s) =>
        s.id === updatedSale.id ? { ...s, ...updatedSale } : s
      ),
    })),
    
  removeRecentSale: (saleId) =>
    set((state) => ({
      recentSales: state.recentSales.filter((s) => s.id !== saleId),
    })),

  // ⭐ دالة خصم الكمية المرتجعة وإعادة حساب الإجمالي
  updateRecentSaleAfterReturn: (saleId, data) =>
    set((state) => ({
      recentSales: state.recentSales.map((sale) => {
        if (sale.id !== saleId) return sale;

        // خصم الكمية المرتجعة من المنتج المحدد
        const newItems = sale.items
          .map((item) =>
            item.productId === data.productId
              ? { ...item, quantity: item.quantity - data.returnedQty }
              : item
          )
          .filter((item) => item.quantity > 0); // حذف المنتج إذا وصلت كميته إلى 0

        // إعادة حساب الإجمالي بناءً على الكميات الجديدة
        const newSubtotal = newItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
        const newTotal = Math.max(0, newSubtotal - sale.discount);

        return { ...sale, items: newItems, total: newTotal };
      }),
    })),
}));