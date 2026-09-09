// modules/auth/auth.controller.ts
// الـ controller ينسّق فقط بين validation → auth guards → service.
// لا منطق أعمال هنا إطلاقًا (كله في service.ts).

import { withValidation } from "../../middleware/ipcValidate";
import { requireAuth } from "../../middleware/ipcAuthGuard";
import { requireRole } from "../../middleware/ipcAuthorize";
import { loginSchema, createUserSchema , setupInitialOwnerSchema } from "./auth.schema";
import * as authService from "./auth.service";
import { updateCredentialsSchema } from "./auth.schema";


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
export const updateCredentialsController = requireAuth(async (input, session) =>
  withValidation(updateCredentialsSchema, (validInput) =>
    authService.updateCredentials(validInput, session)
  )(input)
);


export const checkSystemInitializedController = async () => {
  return { isInitialized: await authService.isSystemInitialized() };
};

// إضافة دالة إنشاء المسؤول الأول
export const setupInitialOwnerController = withValidation(
  setupInitialOwnerSchema,
  async (input) => authService.setupInitialOwner(input)
);