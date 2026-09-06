// modules/auth/auth.service.ts
import { eq } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { users, auditLog } from "../../../db/schema";
import { hashPassword, verifyPassword, createSession, clearSession, type Session } from "../../lib/auth";
import { assertNotRateLimited, recordFailedAttempt, clearAttempts } from "../../lib/rateLimit";

import { UnauthorizedError, ForbiddenError, NotFoundError, BusinessRuleError } from "../../middleware/errors";
import type { LoginInput, CreateUserInput, UpdateCredentialsInput } from "./auth.schema";

export async function login(input: LoginInput): Promise<Session> {
  assertNotRateLimited(input.username);

  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.username, input.username),
  });

  // رسالة موحّدة سواء كان المستخدم غير موجود أو كلمة المرور خاطئة —
  // لا نُسرّب معلومة "هل اسم المستخدم موجود أصلاً" (user enumeration)
  const genericError = () => {
    recordFailedAttempt(input.username);
    throw new UnauthorizedError("اسم المستخدم أو كلمة المرور غير صحيحة.");
  };

  if (!user || !user.isActive) genericError();

  const validPassword = await verifyPassword(input.password, user!.passwordHash);
  if (!validPassword) genericError();

  clearAttempts(input.username);
  return createSession(user!.id, user!.role as Session["role"]);
}

export function logout() {
  clearSession();
}

/** إنشاء حساب Cashier جديد — يجب أن يُستدعى فقط عبر handler محمي بـ requireRole(["owner"]) */
export async function createUser(input: CreateUserInput, actorSession: Session) {
  if (actorSession.role !== "owner") {
    // حماية مضاعفة: حتى لو نُسي تطبيق requireRole على مستوى الـ IPC،
    // الـ service نفسه يرفض العملية
    throw new ForbiddenError("فقط صاحب المحل يمكنه إنشاء حسابات جديدة.");
  }

  const db = getDb();
  const passwordHash = await hashPassword(input.password);

  const [created] = await db
    .insert(users)
    .values({
      username: input.username,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
    })
    .returning();

  await db.insert(auditLog).values({
    userId: actorSession.userId,
    action: "user_create",
    entityType: "user",
    entityId: created.id,
    newValue: JSON.stringify({ username: input.username, role: input.role }),
  });

  return { id: created.id, username: created.username, role: created.role };
}


export async function updateCredentials(input: UpdateCredentialsInput, session: Session) {
  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  
  if (!user) throw new NotFoundError("المستخدم غير موجود.");

  const validPassword = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!validPassword) {
    throw new UnauthorizedError("كلمة المرور الحالية غير صحيحة.");
  }

  const updateData: Partial<typeof users.$inferInsert> = {};

  if (input.newUsername && input.newUsername !== user.username) {
    const existingUser = await db.query.users.findFirst({ where: eq(users.username, input.newUsername) });
    if (existingUser) {
      throw new BusinessRuleError("اسم المستخدم الجديد مستخدم بالفعل.");
    }
    updateData.username = input.newUsername;
  }

  if (input.newPassword) {
    if (input.currentPassword === input.newPassword) {
      throw new BusinessRuleError("لا يمكن استخدام كلمة المرور الحالية ككلمة مرور جديدة.");
    }
    updateData.passwordHash = await hashPassword(input.newPassword);
  }

  if (Object.keys(updateData).length > 0) {
    await db.update(users).set(updateData).where(eq(users.id, session.userId));
  }

  return { success: true };
}