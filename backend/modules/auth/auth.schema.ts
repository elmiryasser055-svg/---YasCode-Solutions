// modules/auth/auth.schema.ts
import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100), // أطول من حد تسجيل الدخول العام: كلمة مرور جديدة يجب أن تكون أقوى
  fullName: z.string().min(2).max(100),
  role: z.enum(["owner", "cashier"]),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;
