// modules/auth/auth.ipc.ts
// يكافئ route.ts في REST API: تعريف "المسارات" (هنا: قنوات IPC) وربطها بالـ controllers.

import { ipcMain } from "electron";
import { withErrorHandling } from "../../middleware/ipcErrorHandler";
import * as controller from "./auth.controller";

export function registerAuthIpcHandlers() {
  ipcMain.handle("auth:login", (_event, input) =>
    withErrorHandling("auth:login", controller.loginController)(input)
  );

  ipcMain.handle("auth:logout", (_event) =>
    withErrorHandling("auth:logout", controller.logoutController)(undefined as never)
  );

  ipcMain.handle("auth:createUser", (_event, input) =>
    withErrorHandling("auth:createUser", controller.createUserController)(input)
  );
    ipcMain.handle("auth:updateCredentials", (_event, input) =>
    withErrorHandling("auth:updateCredentials", controller.updateCredentialsController)(input)
  );
}
