// scripts/seed-owner.ts
//
// يسدّ فجوة: لا يوجد حساب Owner افتراضي مبني مسبقًا (تجنبًا لكلمة مرور
// معروفة في كل نسخة مثبَّتة). هذا سكربت مرة واحدة يُشغَّل يدويًا بعد أول
// تثبيت لإنشاء أول حساب فعليًا.
//
// ✅ مُبسَّط بعد إصلاح lib/env.ts: كان هذا السكربت يعيد تنفيذ منطق فتح
// قاعدة البيانات يدويًا لأن env.ts كان يستورد electron.app مباشرة (يكسر أي
// سياق خارج Electron). الآن env.ts لا يعرف شيئًا عن Electron، فيمكن استخدام
// lib/env.ts و lib/db.ts هنا مباشرة كما تُستخدم في التطبيق نفسه تمامًا.
//
// الاستخدام:
//   npx tsx scripts/seed-owner.ts <username> <password> "<الاسم الكامل>"
// مثال:
//   npx tsx scripts/seed-owner.ts admin "MyStrongPass123" "صاحب المحل"

import path from "node:path";
import os from "node:os";
import { eq } from "drizzle-orm";
import { loadEnv } from "../backend/lib/env";
import { initDatabase, closeDatabase } from "../backend/lib/db";
import { hashPassword } from "../backend/lib/auth";
import { users } from "../db/schema";

/** يطابق منطق تحديد مسار Electron userData، لكن دون الاعتماد على electron.app (غير متاح هنا) */
function getDefaultDbPath(): string {
  if (process.env.DB_PATH) return process.env.DB_PATH;

  const platform = process.platform;
  let base: string;
  if (platform === "win32") {
    base = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  } else if (platform === "darwin") {
    base = path.join(os.homedir(), "Library", "Application Support");
  } else {
    base = path.join(os.homedir(), ".config");
  }
  return path.join(base, "yascode-supperette", "store.sqlite");
}

async function main() {
  const [username, password, fullName] = process.argv.slice(2);

  if (!username || !password || !fullName) {
    console.error(
      'الاستخدام: npx tsx scripts/seed-owner.ts <username> <password> "<الاسم الكامل>"'
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("❌ كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
    process.exit(1);
  }

  const dbPath = getDefaultDbPath();
  console.log(`📂 قاعدة البيانات: ${dbPath}`);

  loadEnv({ DB_PATH: dbPath });
  const db = initDatabase(); // يطبّق migrations تلقائيًا إن لم تكن مطبَّقة بعد

  const existingOwner = await db.query.users.findFirst({ where: eq(users.role, "owner") });
  if (existingOwner) {
    console.error(
      `❌ يوجد حساب Owner بالفعل باسم المستخدم "${existingOwner.username}". لن يُنشأ حساب جديد.`
    );
    closeDatabase();
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ username, passwordHash, fullName, role: "owner" });

  console.log(`✅ تم إنشاء حساب Owner بنجاح: "${username}" (${fullName})`);
  console.log("يمكنك الآن تسجيل الدخول بهذا الحساب من التطبيق.");

  closeDatabase();
}

main().catch((err) => {
  console.error("❌ حدث خطأ غير متوقع:", err);
  process.exit(1);
});
