// modules/printing/printing.ipc.ts
import { ipcMain } from "electron";
import { withErrorHandling } from "../../middleware/ipcErrorHandler";
import * as controller from "./printing.controller";

export function registerPrintingIpcHandlers() {
  ipcMain.handle("printing:printSaleTicket", (_e, input) =>
    withErrorHandling("printing:printSaleTicket", controller.printSaleTicketController)(input)
  );
  ipcMain.handle("printing:printBarcodeLabel", (_e, input) =>
    withErrorHandling("printing:printBarcodeLabel", controller.printBarcodeLabelController)(input)
  );
}
