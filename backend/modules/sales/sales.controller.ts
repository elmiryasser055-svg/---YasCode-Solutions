// modules/sales/sales.controller.ts
import { withValidation } from "../../middleware/ipcValidate";
import { requireAuth } from "../../middleware/ipcAuthGuard";
import { requireRole } from "../../middleware/ipcAuthorize";
import { createSaleSchema, cancelSaleSchema, editSaleSchema, reprintSaleSchema, getSaleSchema } from "./sales.schema";
import * as salesService from "./sales.service";

// البيع متاح لكل من owner وcashier (حسب أدوار المرحلة 1)
export const createSaleController = requireAuth(async (input, session) =>
  withValidation(createSaleSchema, (validInput) => salesService.createSale(validInput, session))(
    input
  )
);

// إلغاء البيع: عملية حسّاسة تؤثر على التقارير المالية والصندوق → owner فقط
export const cancelSaleController = requireAuth(
  requireRole(["owner"], async (input, session) =>
    withValidation(cancelSaleSchema, (validInput) => salesService.cancelSale(validInput, session))(
      input
    )
  )
);

// تعديل البيع: نفس حساسية الإلغاء (يؤثر على المخزون والصندوق) → owner فقط
export const editSaleController = requireAuth(
  requireRole(["owner"], async (input, session) =>
    withValidation(editSaleSchema, (validInput) => salesService.editSale(validInput, session))(
      input
    )
  )
);

export const reprintSaleController = requireAuth(async (input) =>
  withValidation(reprintSaleSchema, (validInput) =>
    salesService.getSaleForReprint(validInput.saleId)
  )(input)
);

// قراءة فقط، بلا أي أثر جانبي — متاحة لكل الأدوار (تُستخدم في ReturnForm لعرض بنود الفاتورة)
export const getSaleController = requireAuth(async (input) =>
  withValidation(getSaleSchema, (validInput) => salesService.getSaleById(validInput.saleId))(input)
);
