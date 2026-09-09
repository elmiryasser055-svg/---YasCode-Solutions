// backend/modules/licensing/licensing.ipc.ts
//
// بنفس نمط باقي *.ipc.ts — يُستورد من registerAllIpcHandlers.ts
//
// ⚠️ نقطة حرجة: withValidation ترجع دالة توقيعها (rawInput: unknown) => Promise<TOutput>
// — مدخل واحد فقط. بينما ipcMain.handle يستدعي الـ handler دائمًا بالشكل (event, ...args)،
// فإذا مررت withValidation(...) مباشرة كـ handler، فإن `event` (كائن Electron الداخلي)
// هو الذي يصل لـ Zod كـ rawInput بدل البيانات الحقيقية، فيفشل safeParse دائمًا برسالة
// "بيانات مدخلة غير صالحة" بغض النظر عن صحة ما يرسله الـ renderer.
//
// الحل: دالة وسيطة صغيرة (activateLicenseHandler) تُنشأ مرة واحدة، وتُستدعى من
// داخل سهم (event, rawInput) => ... الذي يتجاهل event صراحة.

import { ipcMain } from "electron";
import { activateLicenseSchema } from "./licensing.schema";
import { activateLicense, checkLicenseStatus } from "./licensing.controller";
import { withValidation } from "../../middleware/ipcValidate";

const activateLicenseHandler = withValidation(activateLicenseSchema, async (input) => {
  return activateLicense(input);
});

export function registerLicensingIpcHandlers() {
  ipcMain.handle("license:status", () => {
    return checkLicenseStatus();
  });

  // ✅ صحيح: (_event, rawInput) => ... يتجاهل event ويمرر rawInput فقط لـ activateLicenseHandler
  ipcMain.handle("license:activate", (_event, rawInput) => activateLicenseHandler(rawInput));
}