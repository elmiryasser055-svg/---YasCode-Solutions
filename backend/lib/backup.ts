// lib/backup.ts
// نسخ احتياطي محلي دوري — الحماية الوحيدة الفعلية للبيانات في تطبيق
// offline-first بدون أي مزامنة سحابية (راجع "المخاطر التقنية" في ProjectAnalysis.md).

import fs from "node:fs";
import path from "node:path";
import { getEnv } from "./env";
import { logger } from "./logger";

const BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // كل 6 ساعات أثناء عمل التطبيق
const MAX_BACKUPS_KEPT = 30; // يمنع امتلاء القرص بنسخ لا نهائية

function backupDir(): string {
  const { DB_PATH } = getEnv();
  const dir = path.join(path.dirname(DB_PATH), "backups");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** يُصدَّر للاستخدام من موديول backup (استعادة النسخ) — نفس المجلد بالضبط */
export function getBackupDir(): string {
  return backupDir();
}

export function runBackupNow() {
  const { DB_PATH } = getEnv();
  if (!fs.existsSync(DB_PATH)) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = path.join(backupDir(), `store-${timestamp}.sqlite`);

  try {
    fs.copyFileSync(DB_PATH, target);
    logger.info(`نسخة احتياطية دورية تمت بنجاح: ${target}`);
    cleanupOldBackups();
  } catch (err) {
    logger.error("فشل أخذ نسخة احتياطية دورية", err);
  }
}

function cleanupOldBackups() {
  const dir = backupDir();
  const files = fs
    .readdirSync(dir)
    .map((f) => ({ name: f, time: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  for (const file of files.slice(MAX_BACKUPS_KEPT)) {
    fs.unlinkSync(path.join(dir, file.name));
  }
}

export function startBackupScheduler() {
  runBackupNow(); // نسخة فورية عند بدء التشغيل
  setInterval(runBackupNow, BACKUP_INTERVAL_MS);
}
