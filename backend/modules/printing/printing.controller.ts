// modules/printing/printing.controller.ts
import { withValidation } from "../../middleware/ipcValidate";
import { requireAuth } from "../../middleware/ipcAuthGuard";
import { requireRole } from "../../middleware/ipcAuthorize";
import { printSaleTicketSchema, printBarcodeLabelSchema } from "./printing.schema";
import * as printingService from "./printing.service";

// طباعة تذكرة البيع متاحة لكل الأدوار — الكاشير يطبع تذاكر باستمرار أثناء البيع العادي
export const printSaleTicketController = requireAuth(async (input) =>
  withValidation(printSaleTicketSchema, (validInput) =>
    printingService.printSaleTicket(validInput.saleId)
  )(input)
);

// طباعة labels الباركود مرتبطة بإدارة المنتجات → owner فقط
export const printBarcodeLabelController = requireAuth(
  requireRole(["owner"], async (input) =>
    withValidation(printBarcodeLabelSchema, (validInput) =>
      printingService.printBarcodeLabel(validInput.productId, validInput.copies)
    )(input)
  )
);
