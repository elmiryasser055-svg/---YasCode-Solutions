// backend/lib/deviceId.ts
//
// بصمة جهاز مستقرة (لا تتغيّر بين مرات التشغيل) تُستخدم فقط لربط الترخيص بجهاز واحد.
// نستخدم node-machine-id (يعتمد على معرّفات نظام التشغيل الثابتة: Windows Registry
// MachineGuid على Windows تحديدًا، وهو المطلوب هنا لأن كل زبائنك على Windows فقط).
//
// نُشفّر الناتج بـ SHA-256 قبل إرساله للسيرفر — لا داعي لإرسال المعرّف الخام لنظام التشغيل.

import { machineIdSync } from "node-machine-id"; // npm install node-machine-id
import crypto from "node:crypto";

let cachedDeviceId: string | null = null;

export function getDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId;
  const rawId = machineIdSync(); // مستقر عبر إعادة التشغيل، يتغيّر فقط لو أُعيدت تهيئة النظام
  cachedDeviceId = crypto.createHash("sha256").update(rawId).digest("hex");
  return cachedDeviceId;
}