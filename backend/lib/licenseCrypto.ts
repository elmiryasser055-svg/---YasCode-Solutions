// backend/lib/licenseCrypto.ts
//
// يذهب هنا بجانب auth.ts, db.ts, backup.ts — أداة تشفير خام بدون أي منطق أعمال أو DB.
// مستوردة من licensing.controller.ts (verifyLicense) ومن أداة التوليد الداخلية خارج هذا الـ repo (signLicense).

import crypto from "node:crypto";

export interface LicensePayload {
  clientId: string;
  clientName: string;
  issuedAt: string;
  expiresAt: string;
}

interface SignedLicense {
  payload: LicensePayload;
  signature: string;
}

export type VerifyResult =
  | { valid: true; payload: LicensePayload }
  | { valid: false; reason: "MALFORMED" | "BAD_SIGNATURE" };

/** يتحقق من صحة مفتاح الترخيص بالمفتاح العام — هذا فقط ما يُستخدم داخل التطبيق الموزَّع */
export function verifyLicense(licenseKey: string, publicKeyPem: string): VerifyResult {
  let signed: SignedLicense;
  try {
    const json = Buffer.from(licenseKey, "base64url").toString("utf-8");
    signed = JSON.parse(json);
    if (!signed.payload || !signed.signature) throw new Error("shape");
  } catch {
    return { valid: false, reason: "MALFORMED" };
  }

  try {
    const publicKey = crypto.createPublicKey(publicKeyPem);
    const data = Buffer.from(JSON.stringify(signed.payload), "utf-8");
    const signatureBuf = Buffer.from(signed.signature, "base64");
    const ok = crypto.verify(null, data, publicKey, signatureBuf);
    return ok ? { valid: true, payload: signed.payload } : { valid: false, reason: "BAD_SIGNATURE" };
  } catch {
    return { valid: false, reason: "BAD_SIGNATURE" };
  }
}

// ملاحظة: دالتا generateKeyPair() و signLicense() عمدًا غير موجودتين هنا.
// هما موجودتان فقط في أداة التوليد الداخلية (خارج هذا الـ repo) لأن أي كود توقيع
// لا يجب أبدًا أن يكون جزءًا من التطبيق الموزَّع على أجهزة الزبائن.