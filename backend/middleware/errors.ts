// middleware/errors.ts
// أخطاء "متوقعة" (business logic) يمكن عرض رسالتها للمستخدم مباشرة بأمان،
// بعكس الأخطاء غير المتوقعة التي يعالجها ipcErrorHandler.ts بإخفاء تفاصيلها.

export class AppError extends Error {}

export class ValidationError extends AppError {
  constructor(message = "بيانات مدخلة غير صالحة.") {
    super(message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "الرجاء تسجيل الدخول أولاً.") {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "لا تملك صلاحية القيام بهذه العملية.") {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "العنصر المطلوب غير موجود.") {
    super(message);
  }
}

export class BusinessRuleError extends AppError {
  // مثال: "الكمية المطلوبة أكبر من المتوفر بالمخزون"
  constructor(message: string) {
    super(message);
  }
}
