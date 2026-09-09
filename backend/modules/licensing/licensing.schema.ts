// backend/modules/licensing/licensing.schema.ts
//
// بنفس نمط باقي الموديولات (مثل auth.schema.ts) — يُستخدم من طرف ipcValidate middleware.

import { z } from "zod";

export const activateLicenseSchema = z.object({
  licenseKey: z.string().trim().min(1, "مفتاح الترخيص مطلوب"),
});

export type ActivateLicenseInput = z.infer<typeof activateLicenseSchema>;