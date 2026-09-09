// schema.ts
// سكيمة قاعدة البيانات — نظام تسيير محلات المواد الغذائية
// ORM: Drizzle ORM | DB: SQLite (better-sqlite3)

import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ============================================================
// 1. المستخدمون والأدوار (Users & Roles)
// ============================================================

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: ["owner", "cashier"] }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => ({
  usernameIdx: uniqueIndex("users_username_idx").on(table.username),
}));

// ============================================================
// 2. الفئات والمنتجات (Categories & Products)
// ============================================================

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // الباركود قد يكون فارغًا لمنتجات بدون باركود (بحث بالاسم فقط)
  barcode: text("barcode"),
  isBarcodeGenerated: integer("is_barcode_generated", { mode: "boolean" })
    .notNull()
    .default(false),
  name: text("name").notNull(),
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  // بيع بالقطعة أو بالوزن
  unitType: text("unit_type", { enum: ["piece", "weight"] }).notNull(),
  // للمنتجات بالوزن: الوحدة المرجعية (kg/g) — تُستخدم في العرض والحسابات
  weightUnit: text("weight_unit", { enum: ["kg", "g"] }),

  purchasePrice: real("purchase_price").notNull().default(0),
  sellingPrice: real("selling_price").notNull(),

  // الكمية الحالية مخزّنة مباشرة للسرعة، ومصدر الحقيقة الكامل هو stock_movements
  currentQuantity: real("current_quantity").notNull().default(0),
  lowStockThreshold: real("low_stock_threshold").notNull().default(5),

  expiryDate: text("expiry_date"), // ISO date, nullable (منتجات بدون تاريخ صلاحية)

  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => ({
  barcodeIdx: uniqueIndex("products_barcode_idx").on(table.barcode),
  nameIdx: index("products_name_idx").on(table.name),
  expiryIdx: index("products_expiry_idx").on(table.expiryDate),
  categoryIdx: index("products_category_idx").on(table.categoryId),
}));

// ============================================================
// 3. حركات المخزون (Stock Movements) — سجل تدقيق كامل
// ============================================================

export const stockMovements = sqliteTable("stock_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: [
      "stock_in",       // إدخال يدوي للمخزون
      "stock_out",      // إخراج يدوي (تلف، هدية...)
      "sale",           // خصم بسبب بيع
      "sale_cancel",    // إعادة بسبب إلغاء بيع
      "return",         // إرجاع من زبون
      "purchase",       // زيادة بسبب فاتورة شراء
      "adjustment",     // تصحيح جرد (inventory adjustment)
    ],
  }).notNull(),
  quantityChange: real("quantity_change").notNull(), // + أو -
  quantityAfter: real("quantity_after").notNull(),   // الكمية بعد هذه الحركة
  reason: text("reason"),
  // مرجع اختياري للعملية المصدر (رقم بيع أو شراء) — نص حر لتفادي foreign keys متعددة اختيارية
  referenceType: text("reference_type", { enum: ["sale", "purchase", "manual"] }),
  referenceId: integer("reference_id"),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => ({
  productIdx: index("stock_movements_product_idx").on(table.productId),
  createdAtIdx: index("stock_movements_created_at_idx").on(table.createdAt),
}));

// ============================================================
// 4. جلسات الصندوق (Cash Register Sessions)
// ============================================================

export const cashRegisterSessions = sqliteTable("cash_register_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openedBy: integer("opened_by")
    .notNull()
    .references(() => users.id),
  openedAt: text("opened_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  openingAmount: real("opening_amount").notNull().default(0),

  closedBy: integer("closed_by").references(() => users.id),
  closedAt: text("closed_at"),
  expectedAmount: real("expected_amount"), // محسوب: opening + مبيعات نقدية - مصاريف - مرتجعات
  actualAmount: real("actual_amount"),     // ما تم عدّه يدويًا
  difference: real("difference"),          // actual - expected

  status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
  notes: text("notes"),
}, (table) => ({
  statusIdx: index("cash_sessions_status_idx").on(table.status),
}));

export const cashMovements = sqliteTable("cash_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => cashRegisterSessions.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["sale", "expense", "return", "manual_in", "manual_out"],
  }).notNull(),
  amount: real("amount").notNull(),
  relatedSaleId: integer("related_sale_id").references(() => sales.id, {
    onDelete: "set null",
  }),
  description: text("description"),
  userId: integer("user_id").references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => ({
  sessionIdx: index("cash_movements_session_idx").on(table.sessionId),
}));

export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").references(() => cashRegisterSessions.id, {
    onDelete: "set null",
  }),
  category: text("category").notNull(), // كهرباء، نقل، صيانة...
  amount: real("amount").notNull(),
  description: text("description"),
  userId: integer("user_id").references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

// ============================================================
// 5. المبيعات (Sales)
// ============================================================

export const sales = sqliteTable("sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saleNumber: text("sale_number").notNull(), // رقم تسلسلي قابل للعرض على التذكرة
  cashierId: integer("cashier_id")
    .notNull()
    .references(() => users.id),
  cashRegisterSessionId: integer("cash_register_session_id")
    .notNull()
    .references(() => cashRegisterSessions.id),

  subtotal: real("subtotal").notNull(),
  discount: real("discount").notNull().default(0),
  total: real("total").notNull(),
  paymentMethod: text("payment_method", { enum: ["cash"] })
    .notNull()
    .default("cash"), // قابل للتوسعة لاحقًا (بطاقة، آجل...)

  status: text("status", { enum: ["completed", "cancelled"] })
    .notNull()
    .default("completed"),
  cancelledAt: text("cancelled_at"),
  cancelledBy: integer("cancelled_by").references(() => users.id),
  cancelReason: text("cancel_reason"),

  printCount: integer("print_count").notNull().default(1), // لتتبع كم مرة أُعيدت طباعة الفاتورة

  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => ({
  saleNumberIdx: uniqueIndex("sales_sale_number_idx").on(table.saleNumber),
  createdAtIdx: index("sales_created_at_idx").on(table.createdAt),
  sessionIdx: index("sales_session_idx").on(table.cashRegisterSessionId),
}));

export const saleItems = sqliteTable("sale_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saleId: integer("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  // Snapshots: نحفظ نسخة من بيانات المنتج وقت البيع حتى لا تتأثر الفواتير القديمة
  // إذا تغيّر اسم المنتج أو سعره لاحقًا
  productNameSnapshot: text("product_name_snapshot").notNull(),
  barcodeSnapshot: text("barcode_snapshot"),
  unitType: text("unit_type", { enum: ["piece", "weight"] }).notNull(),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),      // سعر البيع وقت العملية
  costPriceSnapshot: real("cost_price_snapshot").notNull(), // سعر الشراء وقت العملية (لحساب الربح لاحقًا بدقة)
  lineTotal: real("line_total").notNull(),
}, (table) => ({
  saleIdx: index("sale_items_sale_idx").on(table.saleId),
  productIdx: index("sale_items_product_idx").on(table.productId),
}));

export const returns = sqliteTable("returns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saleItemId: integer("sale_item_id")
    .notNull()
    .references(() => saleItems.id),
  quantity: real("quantity").notNull(),
  reason: text("reason"),
  refundAmount: real("refund_amount").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

// ============================================================
// 6. الموردون والمشتريات (Suppliers & Purchases)
// ============================================================

export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const purchases = sqliteTable("purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  invoiceNumber: text("invoice_number"),
  totalAmount: real("total_amount").notNull(),
  amountPaid: real("amount_paid").notNull().default(0),
  status: text("status", { enum: ["paid", "partial", "unpaid"] })
    .notNull()
    .default("unpaid"),
  purchaseDate: text("purchase_date")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  userId: integer("user_id").references(() => users.id), // من أدخل الفاتورة
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => ({
  supplierIdx: index("purchases_supplier_idx").on(table.supplierId),
  statusIdx: index("purchases_status_idx").on(table.status),
}));

export const purchaseItems = sqliteTable("purchase_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  purchaseId: integer("purchase_id")
    .notNull()
    .references(() => purchases.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: real("quantity").notNull(),
  unitCost: real("unit_cost").notNull(),
  lineTotal: real("line_total").notNull(),
});

// تتبّع دفعات ديون الموردين عبر الزمن (دفعة قد تكون لفاتورة محددة أو دفعة عامة)
export const supplierPayments = sqliteTable("supplier_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  purchaseId: integer("purchase_id").references(() => purchases.id, {
    onDelete: "set null",
  }),
  amount: real("amount").notNull(),
  paymentDate: text("payment_date")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  notes: text("notes"),
  userId: integer("user_id").references(() => users.id),
}, (table) => ({
  supplierIdx: index("supplier_payments_supplier_idx").on(table.supplierId),
}));

// ============================================================
// 7. سجل التدقيق العام (Audit Log)
// ============================================================
// يغطي عمليات حساسة لا تُغطّى بالكامل عبر stock_movements
// مثل: تعديل سعر منتج، تعديل/إلغاء بيع، إنشاء/تعطيل مستخدم

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action", {
    enum: [
      "price_change",
      "sale_edit",
      "sale_cancel",
      "user_create",
      "user_deactivate",
      "settings_change",
    ],
  }).notNull(),
  entityType: text("entity_type").notNull(), // "product", "sale", "user"...
  entityId: integer("entity_id").notNull(),
  oldValue: text("old_value"), // JSON stringified
  newValue: text("new_value"), // JSON stringified
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => ({
  entityIdx: index("audit_log_entity_idx").on(table.entityType, table.entityId),
}));

// ============================================================
// 8. إعدادات التطبيق (App Settings) — key/value عام
// ============================================================

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON stringified إن لزم
});

// ============================================================
// العلاقات (Relations) — لدعم الاستعلامات المتداخلة في Drizzle
// ============================================================

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  stockMovements: many(stockMovements),
  saleItems: many(saleItems),
  purchaseItems: many(purchaseItems),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  cashier: one(users, { fields: [sales.cashierId], references: [users.id] }),
  session: one(cashRegisterSessions, {
    fields: [sales.cashRegisterSessionId],
    references: [cashRegisterSessions.id],
  }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one, many }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
  returns: many(returns),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchases: many(purchases),
  payments: many(supplierPayments),
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id],
  }),
  items: many(purchaseItems),
  payments: many(supplierPayments),
}));

export const cashRegisterSessionsRelations = relations(
  cashRegisterSessions,
  ({ many }) => ({
    movements: many(cashMovements),
    sales: many(sales),
  })
);

// أضف هذه العلاقة لحل مشكلة Ambiguous Relations في Drizzle
export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id],
  }),
  product: one(products, {
    fields: [purchaseItems.productId],
    references: [products.id],
  }),
}));



export const licenseTable = sqliteTable("license", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  licenseKey: text("license_key").notNull(),
  clientId: text("client_id").notNull(),
  clientName: text("client_name").notNull(),
  activatedAt: text("activated_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
});