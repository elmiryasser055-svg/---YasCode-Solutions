// modules/settings/settings.controller.ts
//
// ⚠️ قرار متعمّد: getAllSettings/getSetting بلا requireAuth — اللغة الافتراضية
// يجب أن تُقرأ قبل حتى ظهور شاشة تسجيل الدخول (راجع front-end.md، i18n يُهيَّأ
// عند إقلاع الواجهة). هذه القيم (لغة، اسم طابعة) ليست بيانات حسّاسة أصلاً.
// الكتابة (setSetting) تبقى owner فقط لأنها تغيّر سلوك التطبيق فعليًا.

import { withValidation } from "../../middleware/ipcValidate";
import { requireAuth } from "../../middleware/ipcAuthGuard";
import { requireRole } from "../../middleware/ipcAuthorize";
import { getSettingSchema, setSettingSchema } from "./settings.schema";
import * as settingsService from "./settings.service";

export const getSettingController = withValidation(getSettingSchema, (input) =>
  settingsService.getSetting(input.key)
);

export const getAllSettingsController = async () => settingsService.getAllSettings();

export const setSettingController = requireAuth(
  requireRole(["owner"], async (input, session) =>
    withValidation(setSettingSchema, (validInput) =>
      settingsService.setSetting(validInput, session)
    )(input)
  )
);
