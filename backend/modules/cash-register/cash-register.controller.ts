// modules/cash-register/cash-register.controller.ts
// فتح/إغلاق الصندوق والمصاريف: عمليات مالية حسّاسة → owner فقط.
// (لو أردت لاحقًا السماح للكاشير بفتح جلسته الخاصة، يكفي تعديل requireRole هنا فقط)

import { withValidation } from "../../middleware/ipcValidate";
import { requireAuth } from "../../middleware/ipcAuthGuard";
import { requireRole } from "../../middleware/ipcAuthorize";
import {
  openSessionSchema,
  closeSessionSchema,
  recordExpenseSchema,
  manualCashMovementSchema,
} from "./cash-register.schema";
import * as cashRegisterService from "./cash-register.service";

export const openSessionController = requireAuth(
   async (input, session) =>
    withValidation(openSessionSchema, (validInput) =>
      cashRegisterService.openSession(validInput, session)
    )(input)
  
);

export const closeSessionController = requireAuth(
   async (input, session) =>
    withValidation(closeSessionSchema, (validInput) =>
      cashRegisterService.closeSession(validInput, session)
    )(input)
  
);

export const recordExpenseController = requireAuth(
  requireRole(["owner"], async (input, session) =>
    withValidation(recordExpenseSchema, (validInput) =>
      cashRegisterService.recordExpense(validInput, session)
    )(input)
  )
);

export const recordManualMovementController = requireAuth(
  requireRole(["owner"], async (input, session) =>
    withValidation(manualCashMovementSchema, (validInput) =>
      cashRegisterService.recordManualMovement(validInput, session)
    )(input)
  )
);

// الحصول على الجلسة المفتوحة حاليًا: يحتاجه الكاشير أيضًا (ليعرف رقم الجلسة عند البيع)
export const getOpenSessionController = requireAuth(async () =>
  cashRegisterService.getOpenSession()
);

export const getSessionSummaryController = requireAuth(
  requireRole(["owner"], async (sessionId: number) =>
    cashRegisterService.getSessionSummary(sessionId)
  )
);
