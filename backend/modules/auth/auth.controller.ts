// modules/auth/auth.controller.ts
// الـ controller ينسّق فقط بين validation → auth guards → service.
// لا منطق أعمال هنا إطلاقًا (كله في service.ts).

import { withValidation } from "../../middleware/ipcValidate";
import { requireAuth } from "../../middleware/ipcAuthGuard";
import { requireRole } from "../../middleware/ipcAuthorize";
import { loginSchema, createUserSchema } from "./auth.schema";
import * as authService from "./auth.service";

export const loginController = withValidation(loginSchema, async (input) => {
  return authService.login(input);
});

export const logoutController = requireAuth(async () => {
  authService.logout();
  return { success: true };
});

export const createUserController = requireAuth(
  requireRole(["owner"], async (input, session) => {
    return withValidation(createUserSchema, (validInput) =>
      authService.createUser(validInput, session)
    )(input);
  })
);
