// src/lib/ipcClient.ts
//
// كل نتيجة قادمة من الباك-إند بصيغة موحّدة { ok: true, data } أو { ok: false, error }
// (راجع middleware/ipcErrorHandler.ts في الباك-إند). هذا الملف يوفّر نقطة واحدة
// لفكّ هذا الشكل وتحويله لنتيجة تُستهلك مباشرة أو خطأ يُرمى (يلتقطه useIpcMutation/useIpcQuery).

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string };

export class IpcCallError extends Error {}

export async function unwrap<T>(promise: Promise<IpcResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.ok) {
    throw new IpcCallError(result.error);
  }
  return result.data;
}

// تعريف الشكل الكامل للـ API المعروض من preload.ts — مصدر الحقيقة الوحيد للأنواع
// في كل الواجهة، حتى لا نكتب `any` عند استدعاء window.api في أي مكوّن.
export interface AppApi {
  auth: {
    login: (input: {
      username: string;
      password: string;
    }) => Promise<
      IpcResult<{ token: string; userId: number; role: "owner" | "cashier" }>
    >;
    logout: () => Promise<IpcResult<{ success: true }>>;
    isInitialized: () => Promise<IpcResult<{ isInitialized: boolean }>>;
    setupInitial: (input: {
      fullName: string;
      username: string;
      password: string;
    }) => Promise<IpcResult<{ success: true }>>;

    createUser: (input: unknown) => Promise<IpcResult<unknown>>;
    updateCredentials: (input: {
      currentPassword: string;
      newUsername?: string;
      newPassword?: string;
    }) => Promise<IpcResult<{ success: true }>>;
  };
  products: {
    create: (input: unknown) => Promise<IpcResult<unknown>>;
    update: (input: unknown) => Promise<IpcResult<unknown>>;
    deactivate: (input: unknown) => Promise<IpcResult<{ success: true }>>;
    search: (input: {
      query: string;
      page?: number;
      pageSize?: number;
    }) => Promise<
      IpcResult<{
        items: Array<Record<string, unknown>>;
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>
    >;
    get: (input: { id: number }) => Promise<IpcResult<Record<string, unknown>>>;
    exportCsv: () => Promise<
      IpcResult<{ success: boolean; path?: string; count?: number }>
    >;
    importCsv: () => Promise<
      IpcResult<
        | { canceled: true }
        | {
            created: number;
            skipped: number;
            errors: Array<{ line: number; reason?: string }>;
          }
      >
    >;
  };
  inventory: {
    adjustStock: (input: unknown) => Promise<IpcResult<number>>;
    correctInventory: (input: unknown) => Promise<IpcResult<number>>;
    getLowStock: () => Promise<IpcResult<Array<Record<string, unknown>>>>;
    getExpiringProducts: (
      input: unknown,
    ) => Promise<IpcResult<Array<Record<string, unknown>>>>;
    getExpiredProducts: () => Promise<
      IpcResult<Array<Record<string, unknown>>>
    >;
    getStockHistory: (
      productId: number,
    ) => Promise<IpcResult<Array<Record<string, unknown>>>>;
  };
  sales: {
    create: (input: {
      items: Array<{ productId: number; quantity: number }>;
      discount?: number;
      cashRegisterSessionId: number;
    }) => Promise<IpcResult<Record<string, unknown>>>;
    cancel: (input: {
      saleId: number;
      reason?: string;
    }) => Promise<IpcResult<{ success: true }>>;
    edit: (input: {
      saleId: number;
      items: Array<{ productId: number; quantity: number }>;
      discount?: number;
      reason?: string | null;
    }) => Promise<IpcResult<Record<string, unknown>>>;
    reprint: (input: {
      saleId: number;
    }) => Promise<IpcResult<Record<string, unknown>>>;
    get: (input: { saleId: number }) => Promise<
      IpcResult<{
        id: number;
        saleNumber: string;
        total: number;
        subtotal: number;
        discount: number;
        status: string;
        items: Array<{
          id: number;
          productId: number | null;
          productNameSnapshot: string;
          quantity: number;
          unitPrice: number;
        }>;
      }>
    >;
  };
  suppliers: {
    create: (input: unknown) => Promise<IpcResult<unknown>>;
    update: (input: unknown) => Promise<IpcResult<unknown>>;
    list: () => Promise<IpcResult<Array<Record<string, unknown>>>>;
    getDebt: (input: { id: number }) => Promise<IpcResult<number>>;
    deactivate: (input: {
      id: number;
    }) => Promise<IpcResult<{ success: true }>>;
  };
  purchases: {
    create: (input: unknown) => Promise<IpcResult<unknown>>;
    recordSupplierPayment: (
      input: unknown,
    ) => Promise<IpcResult<{ success: true }>>;
    listBySupplier: (
      supplierId: number,
    ) => Promise<IpcResult<Array<Record<string, unknown>>>>;
  };
  cashRegister: {
    open: (input: {
      openingAmount: number;
    }) => Promise<IpcResult<Record<string, unknown>>>;
    close: (input: unknown) => Promise<IpcResult<Record<string, unknown>>>;
    recordExpense: (input: unknown) => Promise<IpcResult<unknown>>;
    recordManualMovement: (input: unknown) => Promise<IpcResult<unknown>>;
    getOpenSession: () => Promise<
      IpcResult<Record<string, unknown> | undefined>
    >;
    getSessionSummary: (
      sessionId: number,
    ) => Promise<IpcResult<Record<string, unknown>>>;
  };

  reports: {
    getProfitTrend: (input: {
      period: "daily" | "weekly" | "monthly";
    }) => Promise<
      IpcResult<
        Array<{ label: string; revenue: number; cost: number; profit: number }>
      >
    >;
    getTodaySummary: () => Promise<
      IpcResult<{
        revenue: number;
        cost: number;
        profit: number;
        salesCount: number;
      }>
    >;
    // ⭐ إضافة التقارير الجديدة
    getBestSellers: (input: { days: number; limit: number }) => Promise<
      IpcResult<
        Array<{
          productId: number | null;
          name: string;
          barcode: string | null;
          totalQuantitySold: number;
          totalRevenue: number;
          currentStock: number;
        }>
      >
    >;
    getDeadStock: (input: { days: number; limit: number }) => Promise<
      IpcResult<
        Array<{
          productId: number;
          name: string;
          barcode: string | null;
          currentStock: number;
          totalSoldInPeriod: number;
          frozenCapital: number;
        }>
      >
    >;
  };
  printing: {
    printSaleTicket: (input: {
      saleId: number;
    }) => Promise<IpcResult<{ success: true }>>;
    printBarcodeLabel: (input: {
      productId: number;
      copies?: number;
    }) => Promise<IpcResult<{ barcode: string; copiesPrinted: number }>>;
  };
  settings: {
    get: (input: { key: string }) => Promise<IpcResult<string>>;
    getAll: () => Promise<IpcResult<Record<string, string>>>;
    set: (input: {
      key: string;
      value: string;
    }) => Promise<IpcResult<{ key: string; value: string }>>;
    changePassword: (input: {
      currentPassword: string;
      newPassword: string;
    }) => Promise<IpcResult<{ success: true }>>;
  };
  returns: {
    create: (input: {
      saleItemId: number;
      quantity: number;
      reason?: string;
    }) => Promise<IpcResult<Record<string, unknown>>>;
    getForSale: (
      saleId: number,
    ) => Promise<IpcResult<Array<Record<string, unknown>>>>;
  };
  categories: {
    create: (input: {
      name: string;
    }) => Promise<IpcResult<{ id: number; name: string }>>;
    update: (input: {
      id: number;
      name: string;
    }) => Promise<IpcResult<{ id: number; name: string }>>;
    delete: (input: { id: number }) => Promise<IpcResult<{ success: true }>>;
    list: () => Promise<IpcResult<Array<{ id: number; name: string }>>>;
  };
  backup: {
    list: () => Promise<
      IpcResult<
        Array<{ fileName: string; sizeBytes: number; createdAt: string }>
      >
    >;
    restore: (input: {
      fileName: string;
    }) => Promise<IpcResult<{ success: true }>>;
  };
}

declare global {
  interface Window {
    api: AppApi;
  }
}

export const api = () => window.api;
