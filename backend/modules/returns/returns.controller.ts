// modules/returns/returns.controller.ts
// إرجاع منتج يؤثر على المخزون والصندوق → owner فقط (نفس حساسية إلغاء/تعديل البيع)

import { withValidation } from "../../middleware/ipcValidate";
import { requireAuth } from "../../middleware/ipcAuthGuard";
import { requireRole } from "../../middleware/ipcAuthorize";
import { createReturnSchema } from "./returns.schema";
import * as returnsService from "./returns.service";

export const createReturnController = requireAuth(
  requireRole(["owner"], async (input, session) =>
    withValidation(createReturnSchema, (validInput) =>
      returnsService.createReturn(validInput, session)
    )(input)
  )
);

export const getReturnsForSaleController = requireAuth(async (saleId: number) =>
  returnsService.getReturnsForSale(saleId)
);
