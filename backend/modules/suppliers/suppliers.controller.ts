// modules/suppliers/suppliers.controller.ts
// إدارة الموردين بيانات مالية/تجارية حسّاسة → owner فقط في كل عمليات هذا الموديول

import { withValidation } from "../../middleware/ipcValidate";
import { requireAuth } from "../../middleware/ipcAuthGuard";
import { requireRole } from "../../middleware/ipcAuthorize";
import { createSupplierSchema, updateSupplierSchema, supplierIdSchema } from "./suppliers.schema";
import * as suppliersService from "./suppliers.service";

export const createSupplierController = requireAuth(
  requireRole(["owner"], async (input) =>
    withValidation(createSupplierSchema, (validInput) =>
      suppliersService.createSupplier(validInput)
    )(input)
  )
);

export const updateSupplierController = requireAuth(
  requireRole(["owner"], async (input) =>
    withValidation(updateSupplierSchema, (validInput) =>
      suppliersService.updateSupplier(validInput)
    )(input)
  )
);

export const listSuppliersController = requireAuth(
  requireRole(["owner"], async () => suppliersService.listSuppliers())
);

export const getSupplierDebtController = requireAuth(
  requireRole(["owner"], async (input) =>
    withValidation(supplierIdSchema, (validInput) =>
      suppliersService.getSupplierDebt(validInput.id)
    )(input)
  )
);

export const deactivateSupplierController = requireAuth(
  requireRole(["owner"], async (input) =>
    withValidation(supplierIdSchema, (validInput) =>
      suppliersService.deactivateSupplier(validInput.id)
    )(input)
  )
);
