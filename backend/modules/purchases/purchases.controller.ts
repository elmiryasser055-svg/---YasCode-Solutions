// modules/purchases/purchases.controller.ts
// كل عمليات الشراء والدفع للموردين → owner فقط (بيانات مالية حسّاسة)

import { withValidation } from "../../middleware/ipcValidate";
import { requireAuth } from "../../middleware/ipcAuthGuard";
import { requireRole } from "../../middleware/ipcAuthorize";
import { createPurchaseSchema, recordSupplierPaymentSchema } from "./purchases.schema";
import * as purchasesService from "./purchases.service";

export const createPurchaseController = requireAuth(
  requireRole(["owner"], async (input, session) =>
    withValidation(createPurchaseSchema, (validInput) =>
      purchasesService.createPurchase(validInput, session)
    )(input)
  )
);

export const recordSupplierPaymentController = requireAuth(
  requireRole(["owner"], async (input, session) =>
    withValidation(recordSupplierPaymentSchema, (validInput) =>
      purchasesService.recordSupplierPayment(validInput, session)
    )(input)
  )
);

export const listPurchasesBySupplierController = requireAuth(
  requireRole(["owner"], async (supplierId: number) =>
    purchasesService.listPurchasesBySupplier(supplierId)
  )
);
