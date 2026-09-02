// modules/products/products.ipc.ts
import { ipcMain } from "electron";
import { withErrorHandling } from "../../middleware/ipcErrorHandler";
import * as controller from "./products.controller";

export function registerProductsIpcHandlers() {
  ipcMain.handle("products:create", (_e, input) =>
    withErrorHandling("products:create", controller.createProductController)(input)
  );
  ipcMain.handle("products:update", (_e, input) =>
    withErrorHandling("products:update", controller.updateProductController)(input)
  );
  ipcMain.handle("products:deactivate", (_e, input) =>
    withErrorHandling("products:deactivate", controller.deactivateProductController)(input)
  );
  ipcMain.handle("products:search", (_e, input) =>
    withErrorHandling("products:search", controller.searchProductsController)(input)
  );
  ipcMain.handle("products:get", (_e, input) =>
    withErrorHandling("products:get", controller.getProductController)(input)
  );
  ipcMain.handle("products:exportCsv", (_e) =>
    withErrorHandling("products:exportCsv", controller.exportProductsCsvController)(undefined as never)
  );
  ipcMain.handle("products:importCsv", (_e) =>
    withErrorHandling("products:importCsv", controller.importProductsCsvController)(undefined as never)
  );
}
