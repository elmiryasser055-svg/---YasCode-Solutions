// modules/cash-register/cash-register.service.ts
//
// مبدأ التصميم: عمود cash_movements.amount يُخزَّن دائمًا بإشارة تعكس أثره
// الفعلي على النقد داخل الدرج (موجب = دخول نقد، سالب = خروج نقد).
// - sales.service.createSale يُدخل amount موجب (type: sale)
// - sales.service.cancelSale يُدخل amount سالب (type: return)
// - هنا: expense دائمًا سالب، manual_in موجب، manual_out سالب
// هذا يجعل expectedAmount = openingAmount + SUM(amount) بسيطًا ومباشرًا دون
// شروط IF متفرقة حسب النوع.

import { eq, and, sum } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { cashRegisterSessions, cashMovements, expenses } from "../../../db/schema";
import { BusinessRuleError, NotFoundError } from "../../middleware/errors";
import type { Session } from "../../lib/auth";
import type {
  OpenSessionInput,
  CloseSessionInput,
  RecordExpenseInput,
  ManualCashMovementInput,
} from "./cash-register.schema";

export async function getOpenSession() {
  const db = getDb();
  return db.query.cashRegisterSessions.findFirst({
    where: eq(cashRegisterSessions.status, "open"),
  });
}

export async function openSession(input: OpenSessionInput, session: Session) {
  const db = getDb();

  const alreadyOpen = await getOpenSession();
  if (alreadyOpen) {
    throw new BusinessRuleError(
      "توجد جلسة صندوق مفتوحة بالفعل. الرجاء إغلاقها قبل فتح جلسة جديدة."
    );
  }

  const [created] = await db
    .insert(cashRegisterSessions)
    .values({
      openedBy: session.userId,
      openingAmount: input.openingAmount,
      status: "open",
    })
    .returning();

  return created;
}

export async function recordExpense(input: RecordExpenseInput, session: Session) {
  const db = getDb();

  // ⚠️ إصلاح حرج (نفس مشكلة sales.service.ts): db.transaction() يجب أن يكون
  // متزامنًا بالكامل مع better-sqlite3 — راجع الشرح المفصَّل هناك
  return db.transaction((tx) => {
    const cashSession = tx.query.cashRegisterSessions
      .findFirst({ where: eq(cashRegisterSessions.id, input.sessionId) })
      .sync();
    if (!cashSession || cashSession.status !== "open") {
      throw new BusinessRuleError("لا يمكن تسجيل مصروف على جلسة صندوق غير مفتوحة.");
    }

    const expense = tx
      .insert(expenses)
      .values({
        sessionId: input.sessionId,
        category: input.category,
        amount: input.amount,
        description: input.description ?? null,
        userId: session.userId,
      })
      .returning()
      .get();

    tx.insert(cashMovements)
      .values({
        sessionId: input.sessionId,
        type: "expense",
        amount: -input.amount, // سالب: يخرج من الصندوق
        description: input.description ?? input.category,
        userId: session.userId,
      })
      .run();

    return expense;
  });
}

export async function recordManualMovement(input: ManualCashMovementInput, session: Session) {
  const db = getDb();

  const cashSession = await db.query.cashRegisterSessions.findFirst({
    where: eq(cashRegisterSessions.id, input.sessionId),
  });
  if (!cashSession || cashSession.status !== "open") {
    throw new BusinessRuleError("لا يمكن تسجيل حركة على جلسة صندوق غير مفتوحة.");
  }

  const signedAmount = input.direction === "in" ? input.amount : -input.amount;

  const [movement] = await db
    .insert(cashMovements)
    .values({
      sessionId: input.sessionId,
      type: input.direction === "in" ? "manual_in" : "manual_out",
      amount: signedAmount,
      description: input.description,
      userId: session.userId,
    })
    .returning();

  return movement;
}

async function computeExpectedAmount(sessionId: number, openingAmount: number): Promise<number> {
  const db = getDb();
  const [result] = await db
    .select({ total: sum(cashMovements.amount) })
    .from(cashMovements)
    .where(eq(cashMovements.sessionId, sessionId));

  return openingAmount + Number(result?.total ?? 0);
}

export async function closeSession(input: CloseSessionInput, session: Session) {
  const db = getDb();

  const cashSession = await db.query.cashRegisterSessions.findFirst({
    where: eq(cashRegisterSessions.id, input.sessionId),
  });
  if (!cashSession) throw new NotFoundError("جلسة الصندوق غير موجودة.");
  if (cashSession.status === "closed") {
    throw new BusinessRuleError("هذه الجلسة مغلقة بالفعل.");
  }

  const expectedAmount = await computeExpectedAmount(input.sessionId, cashSession.openingAmount);
  const difference = input.actualAmount - expectedAmount;

  const [closed] = await db
    .update(cashRegisterSessions)
    .set({
      status: "closed",
      closedBy: session.userId,
      closedAt: new Date().toISOString(),
      expectedAmount,
      actualAmount: input.actualAmount,
      difference,
      notes: input.notes ?? null,
    })
    .where(eq(cashRegisterSessions.id, input.sessionId))
    .returning();

  return closed;
}

export async function getSessionSummary(sessionId: number) {
  const db = getDb();
  const cashSession = await db.query.cashRegisterSessions.findFirst({
    where: eq(cashRegisterSessions.id, sessionId),
    with: { movements: true, sales: true },
  });
  if (!cashSession) throw new NotFoundError("جلسة الصندوق غير موجودة.");
  return cashSession;
}
