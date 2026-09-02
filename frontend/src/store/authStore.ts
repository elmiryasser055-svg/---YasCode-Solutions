// src/store/authStore.ts
import { create } from "zustand";
import { api } from "../lib/ipcClient";
import { unwrap } from "../lib/ipcClient";

interface AuthState {
  userId: number | null;
  role: "owner" | "cashier" | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  role: null,
  isAuthenticated: false,

  login: async (username, password) => {
    const result = await unwrap(api().auth.login({ username, password }));
    set({ userId: result.userId, role: result.role, isAuthenticated: true });
  },

  logout: async () => {
    await unwrap(api().auth.logout());
    set({ userId: null, role: null, isAuthenticated: false });
  },
}));

// Selector جاهز يُستخدم لإخفاء/تعطيل عناصر واجهة خاصة بـ owner فقط
// مثال: {isOwner && <PricesButton />}
export const useIsOwner = () => useAuthStore((s) => s.role === "owner");
