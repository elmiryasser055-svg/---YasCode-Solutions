// modules/settings/settings.ipc.ts
import { ipcMain } from "electron";
import { withErrorHandling } from "../../middleware/ipcErrorHandler";
import * as controller from "./settings.controller";

export function registerSettingsIpcHandlers() {
  ipcMain.handle("settings:get", (_e, input) =>
    withErrorHandling("settings:get", controller.getSettingController)(input)
  );
  ipcMain.handle("settings:getAll", (_e) =>
    withErrorHandling("settings:getAll", controller.getAllSettingsController)(undefined as never)
  );
  ipcMain.handle("settings:set", (_e, input) =>
    withErrorHandling("settings:set", controller.setSettingController)(input)
  );
}
