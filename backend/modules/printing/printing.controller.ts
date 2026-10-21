// modules/printing/printing.controller.ts
import { withValidation } from "../../middleware/ipcValidate";
import { requireAuth } from "../../middleware/ipcAuthGuard";
import { requireRole } from "../../middleware/ipcAuthorize";
import { printSaleTicketSchema, printBarcodeLabelSchema } from "./printing.schema";
import * as printingService from "./printing.service";

// طباعة تذكرة البيع متاحة لكل الأدوار (owner + cashier)
export const printSaleTicketController = requireAuth(
  async (input: any) =>
    withValidation(printSaleTicketSchema, (validInput) =>
      printingService.printSaleTicket(validInput.saleId)
    )(input)
);

// طباعة labels الباركود → owner فقط
export const printBarcodeLabelController = requireAuth(
  requireRole(["owner"], async (input) =>
    withValidation(printBarcodeLabelSchema, (validInput) =>
      printingService.printBarcodeLabel(validInput.productId, validInput.copies)
    )(input)
  )
);

// ⭐ معاينة فاتورة موجودة → owner فقط
export const previewSaleTicketController = requireAuth(
  requireRole(["owner"], async (input: any) =>
    withValidation(printSaleTicketSchema, (validInput) =>
      printingService.previewSaleTicket(validInput.saleId)
    )(input)
  )
);

// ⭐ معاينة قالب الفاتورة (لشاشة الإعدادات) → owner فقط
export const previewReceiptTemplateController = requireAuth(
  requireRole(["owner"], async () => printingService.previewReceiptTemplate())
);