// modules/backup/backup.service.ts
//
// ⭐ يسدّ فجوة: lib/backup.ts (المرحلة 3) يأخذ نسخًا احتياطية دورية تلقائية،
// لكن لم يكن هناك أي طريقة لاستعادة نسخة قديمة عند الحاجة — النسخ كانت
// موجودة على القرص لكن عديمة الفائدة عمليًا بلا واجهة استعادة.
//
// ⚠️ عملية حسّاسة جدًا: تستبدل قاعدة البيانات الحالية بالكامل. الاحتياطات
// المطبَّقة هنا:
// 1. منع path traversal (اسم الملف يجب ألا يحتوي فواصل مسار إطلاقًا)
// 2. نسخة أمان لحالة *ما قبل* الاستعادة نفسها — إن اختار المالك نسخة خاطئة
//    بالغلط، لا يزال بإمكانه التراجع لاحقًا يدويًا
// 3. إعادة تشغيل التطبيق بالكامل بعد الاستعادة (بدل محاولة إعادة تهيئة حية
//    لاتصال قاعدة البيانات) — أبسط وأكثر أمانًا من إدارة حالة انتقالية معقدة

import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { getBackupDir } from "../../lib/backup";
import { getEnv } from "../../lib/env";
import { closeDatabase } from "../../lib/db";
import { NotFoundError, BusinessRuleError } from "../../middleware/errors";
import type { RestoreBackupInput } from "./backup.schema";

export interface BackupFileInfo {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

export function listAvailableBackups(): BackupFileInfo[] {
  const dir = getBackupDir();
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sqlite"))
    .map((f) => {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      return { fileName: f, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // الأحدث أولاً
}

export async function restoreFromBackup(input: RestoreBackupInput) {
  // منع path traversal بشكل صريح — اسم الملف فقط، لا فواصل مسار مطلقًا
  if (input.fileName.includes("/") || input.fileName.includes("\\") || input.fileName.includes("..")) {
    throw new BusinessRuleError("اسم ملف غير صالح.");
  }

  const dir = getBackupDir();
  const backupPath = path.join(dir, input.fileName);
  if (!fs.existsSync(backupPath)) {
    throw new NotFoundError("ملف النسخة الاحتياطية غير موجود.");
  }

  const { DB_PATH } = getEnv();

  // نسخة أمان لحالة ما قبل الاستعادة — تحسبًا لاختيار خاطئ من المالك
  if (fs.existsSync(DB_PATH)) {
    const preRestorePath = `${DB_PATH}.pre-restore-${Date.now()}`;
    fs.copyFileSync(DB_PATH, preRestorePath);
  }

  closeDatabase(); // إغلاق الاتصال الحالي قبل الكتابة فوق الملف مباشرة
  fs.copyFileSync(backupPath, DB_PATH);

  // إعادة تشغيل التطبيق بالكامل — أبسط وأضمن من إعادة تهيئة حية لكل شيء
  // (قاعدة البيانات، الجلسة الحالية، كل الحالة في الذاكرة) دون ترك أي أثر قديم
  app.relaunch();
  app.exit(0);

  return { success: true }; // عمليًا لن يُستهلك هذا الرد بسبب app.exit أعلاه
}
