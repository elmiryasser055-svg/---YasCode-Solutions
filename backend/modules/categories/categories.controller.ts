// modules/categories/categories.controller.ts
import { withValidation } from "../../middleware/ipcValidate";
import { requireAuth } from "../../middleware/ipcAuthGuard";
import { requireRole } from "../../middleware/ipcAuthorize";
import { createCategorySchema, updateCategorySchema, categoryIdSchema } from "./categories.schema";
import * as categoriesService from "./categories.service";

// الكتابة (إنشاء/تعديل/حذف فئة) مرتبطة بإدارة المنتجات → owner فقط
export const createCategoryController = requireAuth(
  requireRole(["owner"], async (input) =>
    withValidation(createCategorySchema, (validInput) =>
      categoriesService.createCategory(validInput)
    )(input)
  )
);

export const updateCategoryController = requireAuth(
  requireRole(["owner"], async (input) =>
    withValidation(updateCategorySchema, (validInput) =>
      categoriesService.updateCategory(validInput)
    )(input)
  )
);

export const deleteCategoryController = requireAuth(
  requireRole(["owner"], async (input) =>
    withValidation(categoryIdSchema, (validInput) =>
      categoriesService.deleteCategory(validInput.id)
    )(input)
  )
);

// القراءة متاحة لكل الأدوار — الكاشير قد يحتاج رؤية الفئة أثناء عرض منتج (وليس تعديلها)
export const listCategoriesController = requireAuth(async () => categoriesService.listCategories());
