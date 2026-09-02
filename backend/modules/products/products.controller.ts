// modules/products/products.controller.ts
import { withValidation } from "../../middleware/ipcValidate";
import { requireAuth } from "../../middleware/ipcAuthGuard";
import { requireRole } from "../../middleware/ipcAuthorize";
import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  searchProductsSchema,
} from "./products.schema";
import * as productsService from "./products.service";
import * as productsCsvService from "./products.csv.service";

// إضافة/تعديل/تعطيل منتج: يشمل تعديل الأسعار → owner فقط
export const createProductController = requireAuth(
  requireRole(["owner"], async (input, session) =>
    withValidation(createProductSchema, (validInput) =>
      productsService.createProduct(validInput, session)
    )(input)
  )
);

export const updateProductController = requireAuth(
  requireRole(["owner"], async (input, session) =>
    withValidation(updateProductSchema, (validInput) =>
      productsService.updateProduct(validInput, session)
    )(input)
  )
);

export const deactivateProductController = requireAuth(
  requireRole(["owner"], async (input, session) =>
    withValidation(productIdSchema, (validInput) =>
      productsService.deactivateProduct(validInput.id, session)
    )(input)
  )
);

// البحث متاح لكل الأدوار — الكاشير يحتاجه أثناء عملية البيع
export const searchProductsController = requireAuth(async (input) =>
  withValidation(searchProductsSchema, (validInput) => productsService.searchProducts(validInput))(
    input
  )
);

export const getProductController = requireAuth(async (input) =>
  withValidation(productIdSchema, (validInput) => productsService.getProductById(validInput.id))(
    input
  )
);

// استيراد/تصدير بالجملة: عملية إدارية حسّاسة (وصول لنظام الملفات) → owner فقط
export const exportProductsCsvController = requireAuth(
  requireRole(["owner"], async () => productsCsvService.exportProductsToCsv())
);

export const importProductsCsvController = requireAuth(
  requireRole(["owner"], async () => productsCsvService.importProductsFromCsv())
);
