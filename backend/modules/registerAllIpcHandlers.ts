// modules/registerAllIpcHandlers.ts
// يُستدعى مرة واحدة من main.ts بعد initDatabase() مباشرة عند إقلاع التطبيق.

import { registerAuthIpcHandlers } from "./auth/auth.ipc";
import { registerInventoryIpcHandlers } from "./inventory/inventory.ipc";
import { registerSalesIpcHandlers } from "./sales/sales.ipc";
import { registerProductsIpcHandlers } from "./products/products.ipc";
import { registerSuppliersIpcHandlers } from "./suppliers/suppliers.ipc";
import { registerPurchasesIpcHandlers } from "./purchases/purchases.ipc";
import { registerCashRegisterIpcHandlers } from "./cash-register/cash-register.ipc";
import { registerReportsIpcHandlers } from "./reports/reports.ipc";
import { registerPrintingIpcHandlers } from "./printing/printing.ipc";
import { registerSettingsIpcHandlers } from "./settings/settings.ipc";
import { registerReturnsIpcHandlers } from "./returns/returns.ipc";
import { registerCategoriesIpcHandlers } from "./categories/categories.ipc";
import { registerLicensingIpcHandlers } from "./licensing/licensing.ipc";

import { registerBackupIpcHandlers } from "./backup/backup.ipc";

export function registerAllIpcHandlers() {
  registerAuthIpcHandlers();
  registerInventoryIpcHandlers();
  registerSalesIpcHandlers();
  registerProductsIpcHandlers();
  registerSuppliersIpcHandlers();
  registerPurchasesIpcHandlers();
  registerCashRegisterIpcHandlers();
  registerReportsIpcHandlers();
  registerPrintingIpcHandlers();
  registerSettingsIpcHandlers();
  registerReturnsIpcHandlers();
  registerCategoriesIpcHandlers();
  registerBackupIpcHandlers();
  registerLicensingIpcHandlers();
}
