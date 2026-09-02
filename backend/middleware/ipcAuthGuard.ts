// middleware/ipcAuthGuard.ts
// يكافئ authenticate.ts في تطبيق REST: يتحقق أن هناك جلسة نشطة قبل تنفيذ أي عملية حسّاسة.

import { getCurrentSession, touchSession, type Session } from "../lib/auth";
import { UnauthorizedError } from "./errors";

export function requireAuth<TInput, TOutput>(
  handler: (input: TInput, session: Session) => Promise<TOutput>
) {
  return async (input: TInput): Promise<TOutput> => {
    const session = getCurrentSession();
    if (!session) {
      throw new UnauthorizedError();
    }
    touchSession(); // تحديث آخر نشاط في كل عملية محمية → منع timeout أثناء الاستخدام الفعلي
    return handler(input, session);
  };
}
