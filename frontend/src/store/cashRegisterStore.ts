// src/store/cashRegisterStore.ts
import { create } from "zustand";
import { api, unwrap } from "../lib/ipcClient";

interface CashRegisterState {
  openSessionId: number | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

// الجلسة الحالية تُحمَّل مرة عند إقلاع التطبيق وتُحدَّث بعد فتح/إغلاق جلسة —
// كل الشاشات (بيع، مصاريف) تقرأها من هنا بدل استدعاء IPC في كل مكوّن على حدة
export const useCashRegisterStore = create<CashRegisterState>((set) => ({
  openSessionId: null,
  isLoading: true,

  refresh: async () => {
    set({ isLoading: true });
    const session = await unwrap(api().cashRegister.getOpenSession());
    set({ openSessionId: (session?.id as number) ?? null, isLoading: false });
  },
}));
