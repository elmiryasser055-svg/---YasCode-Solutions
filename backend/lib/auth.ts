// lib/auth.ts
//
// ⚠️ قرار معماري مهم (مشروح بالتفصيل في back-end.md § "لماذا لا JWT"):
// بما أن هذا تطبيق Electron يعمل بالكامل داخل عملية واحدة على جهاز المستخدم
// (main process لا يُعرَّض عبر الشبكة إطلاقًا)، لا حاجة لتوكنات JWT الموقّعة.
// نستخدم بدلاً منها جلسة تُحفظ في ذاكرة main process فقط، ولا تُرسل أبدًا
// للـ renderer ككائن كامل — الـ renderer يستدعي فقط IPC channels التي تتحقق
// داخليًا من الجلسة الحالية. هذا أبسط وأكثر أمانًا من "تخزين JWT في localStorage"
// وهو نمط شائع لكنه غير آمن أصلاً حتى في تطبيقات الويب.

import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";

const SALT_ROUNDS = 12;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 دقيقة خمول → تسجيل خروج تلقائي

export interface Session {
  token: string;
  userId: number;
  role: "owner" | "cashier";
  lastActivityAt: number;
}

// جلسة واحدة نشطة فقط في كل لحظة (مستخدم واحد فعليًا أمام الجهاز) —
// إن أردت لاحقًا دعم تبديل مستخدم سريع (owner ↔ cashier) بدون إغلاق التطبيق،
// هذا البناء يدعمه مباشرة عبر استبدال الجلسة الحالية.
let currentSession: Session | null = null;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function createSession(userId: number, role: "owner" | "cashier"): Session {
  currentSession = {
    token: randomUUID(),
    userId,
    role,
    lastActivityAt: Date.now(),
  };
  return currentSession;
}

export function getCurrentSession(): Session | null {
  if (!currentSession) return null;

  const idleFor = Date.now() - currentSession.lastActivityAt;
  if (idleFor > SESSION_IDLE_TIMEOUT_MS) {
    currentSession = null; // انتهت الجلسة تلقائيًا بسبب الخمول
    return null;
  }
  return currentSession;
}

export function touchSession() {
  if (currentSession) currentSession.lastActivityAt = Date.now();
}

export function clearSession() {
  currentSession = null;
}
