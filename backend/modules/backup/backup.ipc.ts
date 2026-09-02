// modules/backup/backup.ipc.ts
import { ipcMain } from "electron";
import { withErrorHandling } from "../../middleware/ipcErrorHandler";
import * as controller from "./backup.controller";

export function registerBackupIpcHandlers() {
  ipcMain.handle("backup:list", (_e) =>
    withErrorHandling("backup:list", controller.listBackupsController)(undefined as never)
  );
  ipcMain.handle("backup:restore", (_e, input) =>
    withErrorHandling("backup:restore", controller.restoreBackupController)(input)
  );
}
