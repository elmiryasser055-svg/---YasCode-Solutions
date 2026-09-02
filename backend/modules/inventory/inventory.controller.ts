// modules/inventory/inventory.controller.ts
import { withValidation } from "../../middleware/ipcValidate";
import { requireAuth } from "../../middleware/ipcAuthGuard";
import { requireRole } from "../../middleware/ipcAuthorize";
import {
  stockAdjustmentSchema,
  inventoryAdjustmentSchema,
  expiringProductsQuerySchema,
} from "./inventory.schema";
import * as inventoryService from "./inventory.service";

// تعديل المخزون (stock in/out) وتصحيح الجرد: عمليات حسّاسة تؤثر على التقارير المالية → owner فقط.
// (الكاشير يمكنه البيع فحسب، وفق نظام الأدوار المعتمد في المرحلة 1)

export const adjustStockController = requireAuth(
  requireRole(["owner"], async (input, session) =>
    withValidation(stockAdjustmentSchema, (validInput) =>
      inventoryService.adjustStock(validInput, session)
    )(input)
  )
);

export const correctInventoryController = requireAuth(
  requireRole(["owner"], async (input, session) =>
    withValidation(inventoryAdjustmentSchema, (validInput) =>
      inventoryService.correctInventory(validInput, session)
    )(input)
  )
);

export const getLowStockController = requireAuth(async () => inventoryService.getLowStockProducts());

export const getExpiringProductsController = requireAuth(async (input) =>
  withValidation(expiringProductsQuerySchema, (validInput) =>
    inventoryService.getExpiringProducts(validInput.withinDays)
  )(input)
);

export const getExpiredProductsController = requireAuth(async () =>
  inventoryService.getExpiredProducts()
);

export const getStockHistoryController = requireAuth(async (productId: number) =>
  inventoryService.getStockMovementHistory(productId)
);
