// lib/rateLimit.ts
//
// Rate limiting محلي داخل main process (in-memory، لا حاجة لـ Redis هنا —
// عملية واحدة، مستخدم واحد). الهدف: منع محاولات تخمين كلمة مرور متكررة
// على حساب "Owner" خصوصًا (وهو الحساب صاحب الصلاحيات الكاملة).

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const attempts = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 دقيقة
const LOCKOUT_MS = 15 * 60 * 1000; // قفل الحساب 15 دقيقة بعد تجاوز الحد

export class RateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super("عدد محاولات تسجيل الدخول تجاوز الحد المسموح، الرجاء المحاولة لاحقًا.");
  }
}

/** يُستدعى قبل محاولة تسجيل الدخول */
export function assertNotRateLimited(username: string) {
  const record = attempts.get(username);
  if (!record) return;

  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    throw new RateLimitError(record.lockedUntil - Date.now());
  }
}

/** يُستدعى بعد فشل محاولة تسجيل الدخول */
export function recordFailedAttempt(username: string) {
  const now = Date.now();
  const record = attempts.get(username);

  if (!record || now - record.firstAttemptAt > WINDOW_MS) {
    attempts.set(username, { count: 1, firstAttemptAt: now, lockedUntil: null });
    return;
  }

  record.count += 1;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
  }
}

/** يُستدعى بعد نجاح تسجيل الدخول لتصفير العدّاد */
export function clearAttempts(username: string) {
  attempts.delete(username);
}
