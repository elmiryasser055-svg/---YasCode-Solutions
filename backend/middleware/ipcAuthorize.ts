// middleware/ipcAuthorize.ts
// يكافئ authorize.ts: يُستخدم فوق requireAuth لتقييد عملية بدور معيّن.
// مثال: تعديل الأسعار أو عرض التقارير المالية → owner فقط.

import type { Session } from "../lib/auth";
import { ForbiddenError } from "./errors";

export function requireRole<TInput, TOutput>(
  allowedRoles: Array<Session["role"]>,
  handler: (input: TInput, session: Session) => Promise<TOutput>
) {
  return async (input: TInput, session: Session): Promise<TOutput> => {
    if (!allowedRoles.includes(session.role)) {
      throw new ForbiddenError();
    }
    return handler(input, session);
  };
}
