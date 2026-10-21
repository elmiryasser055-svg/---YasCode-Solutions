// backend/modules/licensing/licensing.controller.ts
//
// إصلاحان عن النسخة السابقة:
//   1) LICENSE_SERVER_URL كان يشير للجذر فقط بدون /api/license/activate،
//      فكان يضرب صفحة الـ Next.js الرئيسية (GET فقط) بدل الـ API route،
//      يرجع 405 كصفحة HTML، فيفشل res.json() ويظهر خطأ "يحتاج اتصال بالإنترنت"
//      حتى لو السيرفر شغّال فعليًا.
//   2) isDev كانت تقارن NODE_ENV بـ "dev"، لكن سكريبت التشغيل يضبطه على
//      "development" (راجع package.json: cross-env NODE_ENV=development) —
//      فكانت المقارنة تفشل دائمًا وتستخدم رابط الإنتاج حتى في وضع التطوير.

import { verifyLicense } from "../../lib/licenseCrypto";
import { getCurrentLicense, replaceLicense, touchLastSeen } from "./licensing.service";
import { getDeviceId } from "../../lib/deviceId";
import type { ActivateLicenseInput } from "./licensing.schema";

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEARpZm+Xo/Ca9Hqc/HEpy1U3q6HtxS1SiiuQRg/wRkV+k=
-----END PUBLIC KEY-----`;

const isDev = process.env.NODE_ENV === "development";

// ⚠️ لازم يشير مباشرة لـ API route، مو للجذر
const LICENSE_SERVER_URL = 
   "https://yascode-license-server.vercel.app/api/license/activate"
  ;

const CLOCK_TOLERANCE_MS = 5 * 60 * 1000;

export type LicenseStatus =
  | { state: "NOT_ACTIVATED" }
  | { state: "ACTIVE"; clientName: string; expiresAt: string; daysLeft: number }
  | { state: "EXPIRED"; clientName: string; expiresAt: string }
  | { state: "TAMPERED" };

export async function activateLicense(
  input: ActivateLicenseInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  // 1) تحقق محلي من التوقيع أولاً (سريع، ما يحتاج إنترنت)
  const result = verifyLicense(input.licenseKey, PUBLIC_KEY_PEM);
  if (!result.valid) {
    return {
      ok: false,
      error: result.reason === "MALFORMED" ? "صيغة المفتاح غير صحيحة" : "المفتاح غير صالح أو تم التلاعب به",
    };
  }

  const now = new Date();
  if (new Date(result.payload.expiresAt).getTime() < now.getTime()) {
    return { ok: false, error: "هذا المفتاح منتهي الصلاحية أصلاً" };
  }

  // 2) تحقق من السيرفر — هنا فقط نحتاج إنترنت، ومرة واحدة فقط عند التفعيل
  const deviceId = getDeviceId();
  let serverResponse: { ok: boolean; error?: string };
  try {
    const res = await fetch(LICENSE_SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey: input.licenseKey, deviceId }),
      signal: AbortSignal.timeout(15_000),
    });
    serverResponse = await res.json();
    console.log("Server response:", serverResponse);
  } catch (err) {
    console.error("License server request failed:", err);
    return {
      ok: false,
      error: "يحتاج التفعيل اتصالاً بالإنترنت. تأكد من اتصالك وأعد المحاولة (الاستخدام اليومي بعدها يبقى offline بالكامل).",
    };
  }

  if (!serverResponse.ok) {
    return { ok: false, error: serverResponse.error ?? "تعذّر التحقق من الترخيص عبر السيرفر" };
  }

  // 3) بعد موافقة السيرفر، نثبّت الترخيص محليًا كالمعتاد
  replaceLicense({
    licenseKey: input.licenseKey,
    clientId: result.payload.clientId,
    clientName: result.payload.clientName,
    activatedAt: now.toISOString(),
    expiresAt: result.payload.expiresAt,
    lastSeenAt: now.toISOString(),
  });

  return { ok: true };
}

export function checkLicenseStatus(): LicenseStatus {
  const row = getCurrentLicense();
  if (!row) return { state: "NOT_ACTIVATED" };

  const now = new Date();
  const nowMs = now.getTime();
  const lastSeenMs = new Date(row.lastSeenAt).getTime();

  if (nowMs < lastSeenMs - CLOCK_TOLERANCE_MS) {
    return { state: "TAMPERED" };
  }

  touchLastSeen(row.id, now.toISOString());

  const expiresMs = new Date(row.expiresAt).getTime();
  if (nowMs > expiresMs) {
    return { state: "EXPIRED", clientName: row.clientName, expiresAt: row.expiresAt };
  }

  const daysLeft = Math.ceil((expiresMs - nowMs) / (24 * 60 * 60 * 1000));
  return { state: "ACTIVE", clientName: row.clientName, expiresAt: row.expiresAt, daysLeft };
}

export function assertLicenseActive(): void {
  const status = checkLicenseStatus();
  if (status.state !== "ACTIVE") {
    throw new Error("LICENSE_INACTIVE");
  }
}