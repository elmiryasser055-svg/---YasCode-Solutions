// electron/preload.ts
//
// contextBridge هو الحد الفاصل الأمني الوحيد بين الواجهة (renderer، كود React
// غير موثوق من حيث المبدأ) وأي وصول لـ Node/نظام الملفات. الـ renderer لا يرى
// أبدًا ipcRenderer مباشرة، فقط الدوال المحدودة المعرَّفة هنا صراحة.
// (contextIsolation: true و nodeIntegration: false إجباريان في BrowserWindow، راجع front-end.md § الأمان)

import { contextBridge, ipcRenderer } from "electron";

// كل استدعاء يمرّ عبر invoke (طلب/رد)، لا أحداث حرة غير مقيّدة
const invoke = (channel: string, payload?: unknown) => ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld("api", {
  auth: {
    login: (input: unknown) => invoke("auth:login", input),
    logout: () => invoke("auth:logout"),
    createUser: (input: unknown) => invoke("auth:createUser", input),
     updateCredentials: (input: unknown) => invoke("auth:updateCredentials", input),
  },
  products: {
    create: (input: unknown) => invoke("products:create", input),
    update: (input: unknown) => invoke("products:update", input),
    deactivate: (input: unknown) => invoke("products:deactivate", input),
    search: (input: unknown) => invoke("products:search", input),
    get: (input: unknown) => invoke("products:get", input),
    exportCsv: () => invoke("products:exportCsv"),
    importCsv: () => invoke("products:importCsv"),
  },
  inventory: {
    adjustStock: (input: unknown) => invoke("inventory:adjustStock", input),
    correctInventory: (input: unknown) => invoke("inventory:correctInventory", input),
    getLowStock: () => invoke("inventory:getLowStock"),
    getExpiringProducts: (input: unknown) => invoke("inventory:getExpiringProducts", input),
    getExpiredProducts: () => invoke("inventory:getExpiredProducts"),
    getStockHistory: (productId: number) => invoke("inventory:getStockHistory", productId),
  },
  sales: {
    create: (input: unknown) => invoke("sales:create", input),
    cancel: (input: unknown) => invoke("sales:cancel", input),
    edit: (input: unknown) => invoke("sales:edit", input),
    reprint: (input: unknown) => invoke("sales:reprint", input),
    get: (input: unknown) => invoke("sales:get", input),
  },
  suppliers: {
    create: (input: unknown) => invoke("suppliers:create", input),
    update: (input: unknown) => invoke("suppliers:update", input),
    list: () => invoke("suppliers:list"),
    getDebt: (input: unknown) => invoke("suppliers:getDebt", input),
    deactivate: (input: unknown) => invoke("suppliers:deactivate", input),
  },
  purchases: {
    create: (input: unknown) => invoke("purchases:create", input),
    recordSupplierPayment: (input: unknown) => invoke("purchases:recordSupplierPayment", input),
    listBySupplier: (supplierId: number) => invoke("purchases:listBySupplier", supplierId),
  },
  cashRegister: {
    open: (input: unknown) => invoke("cashRegister:open", input),
    close: (input: unknown) => invoke("cashRegister:close", input),
    recordExpense: (input: unknown) => invoke("cashRegister:recordExpense", input),
    recordManualMovement: (input: unknown) => invoke("cashRegister:recordManualMovement", input),
    getOpenSession: () => invoke("cashRegister:getOpenSession"),
    getSessionSummary: (sessionId: number) => invoke("cashRegister:getSessionSummary", sessionId),
  },
  reports: {
    getProfitTrend: (input: unknown) => invoke("reports:getProfitTrend", input),
    getTodaySummary: () => invoke("reports:getTodaySummary"),
         getBestSellers: (input: unknown) => invoke("reports:getBestSellers", input),
    getDeadStock: (input: unknown) => invoke("reports:getDeadStock", input),
  },
  printing: {
    printSaleTicket: (input: unknown) => invoke("printing:printSaleTicket", input),
    printBarcodeLabel: (input: unknown) => invoke("printing:printBarcodeLabel", input),

  },
  settings: {
    get: (input: unknown) => invoke("settings:get", input),
    getAll: () => invoke("settings:getAll"),
    set: (input: unknown) => invoke("settings:set", input),
  },
  returns: {
    create: (input: unknown) => invoke("returns:create", input),
    getForSale: (saleId: number) => invoke("returns:getForSale", saleId),
  },
  categories: {
    create: (input: unknown) => invoke("categories:create", input),
    update: (input: unknown) => invoke("categories:update", input),
    delete: (input: unknown) => invoke("categories:delete", input),
    list: () => invoke("categories:list"),
  },
  backup: {
    list: () => invoke("backup:list"),
    restore: (input: unknown) => invoke("backup:restore", input),
  },
});
