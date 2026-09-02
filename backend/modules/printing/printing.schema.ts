// modules/printing/printing.schema.ts
import { z } from "zod";

export const printSaleTicketSchema = z.object({
  saleId: z.number().int().positive(),
});
export type PrintSaleTicketInput = z.infer<typeof printSaleTicketSchema>;

export const printBarcodeLabelSchema = z.object({
  productId: z.number().int().positive(),
  copies: z.number().int().positive().max(50).default(1),
});
export type PrintBarcodeLabelInput = z.infer<typeof printBarcodeLabelSchema>;
