// modules/settings/settings.schema.ts
import { z } from "zod";

export const getSettingSchema = z.object({ key: z.string().min(1).max(100) });

export const setSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(500),
});
export type SetSettingInput = z.infer<typeof setSettingSchema>;
