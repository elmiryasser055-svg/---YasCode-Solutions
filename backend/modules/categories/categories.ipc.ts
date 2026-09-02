// modules/categories/categories.ipc.ts
import { ipcMain } from "electron";
import { withErrorHandling } from "../../middleware/ipcErrorHandler";
import * as controller from "./categories.controller";

export function registerCategoriesIpcHandlers() {
  ipcMain.handle("categories:create", (_e, input) =>
    withErrorHandling("categories:create", controller.createCategoryController)(input)
  );
  ipcMain.handle("categories:update", (_e, input) =>
    withErrorHandling("categories:update", controller.updateCategoryController)(input)
  );
  ipcMain.handle("categories:delete", (_e, input) =>
    withErrorHandling("categories:delete", controller.deleteCategoryController)(input)
  );
  ipcMain.handle("categories:list", (_e) =>
    withErrorHandling("categories:list", controller.listCategoriesController)(undefined as never)
  );
}
