// modules/backup/backup.schema.ts
import { z } from "zod";

export const restoreBackupSchema = z.object({
  // اسم الملف فقط (بدون مسار) — يُتحقق لاحقًا في service من عدم احتوائه
  // على فواصل مسار لمنع path traversal
  fileName: z.string().min(1).max(255),
});
export type RestoreBackupInput = z.infer<typeof restoreBackupSchema>;
