// scripts/seed-all.ts
//
// ⭐ سكربت شامل لملء قاعدة البيانات ببيانات تجريبية واقعية.
// يُنشئ: مستخدمين، فئات، منتجات، موردين، مشتريات، جلسة صندوق، مبيعات، إعدادات.
//
// الاستخدام:
//   npx tsx scripts/seed-all.ts
//
// ⚠️ يمحو البيانات السابقة إذا كانت قاعدة البيانات جديدة (أول تشغيل).
//    إن كانت قاعدة البيانات تحتوي بيانات، يتخطى المستخدمين فقط ويضيف الباقي.

import path from "node:path";
import os from "node:os";
import { eq } from "drizzle-orm";
import { loadEnv } from "../backend/lib/env";
import { initDatabase, closeDatabase, getDb } from "../backend/lib/db";
import { hashPassword } from "../backend/lib/auth";
import {
  users,
  categories,
  products,
  suppliers,
  purchases,
  purchaseItems,
  supplierPayments,
  cashRegisterSessions,
  cashMovements,
  sales,
  saleItems,
  stockMovements,
  appSettings,
} from "../db/schema";

function getDefaultDbPath(): string {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  const platform = process.platform;
  let baseDir: string;
  if (platform === "win32") {
    baseDir = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  } else if (platform === "darwin") {
    baseDir = path.join(os.homedir(), "Library", "Application Support");
  } else {
    baseDir = path.join(os.homedir(), ".config");
  }
  return path.join(baseDir, "yascode-supperette", "store.sqlite");
}

async function main() {
  const dbPath = getDefaultDbPath();
  console.log(`📂 قاعدة البيانات: ${dbPath}`);

  loadEnv({ DB_PATH: dbPath });
  initDatabase();
  const db = getDb();

  // ───────────────────────────────────────────────
  // 1) المستخدمون
  // ───────────────────────────────────────────────
  console.log("👤 إنشاء المستخدمين...");
  const existingOwner = await db.query.users.findFirst({ where: eq(users.role, "owner") });
  let ownerId: number;
  let cashierId: number;

  if (!existingOwner) {
    const ownerHash = await hashPassword("admin123");
    const [owner] = await db.insert(users).values({
      username: "admin",
      passwordHash: ownerHash,
      fullName: "صاحب المحل",
      role: "owner",
      isActive: true,
    }).returning();
    ownerId = owner.id;
    console.log(`   ✅ Owner: admin / admin123 (ID: ${ownerId})`);

    const cashierHash = await hashPassword("cashier123");
    const [cashier] = await db.insert(users).values({
      username: "cashier",
      passwordHash: cashierHash,
      fullName: "أحمد الكاشير",
      role: "cashier",
      isActive: true,
    }).returning();
    cashierId = cashier.id;
    console.log(`   ✅ Cashier: cashier / cashier123 (ID: ${cashierId})`);
  } else {
    ownerId = existingOwner.id;
    const existingCashier = await db.query.users.findFirst({ where: eq(users.role, "cashier") });
    cashierId = existingCashier?.id ?? ownerId;
    console.log("   ℹ️ المستخدمون موجودون بالفعل — تم تخطيهم.");
  }

  // ───────────────────────────────────────────────
  // 2) الفئات
  // ───────────────────────────────────────────────
  console.log("📂 إنشاء الفئات...");
  const existingCats = await db.query.categories.findMany();
  if (existingCats.length === 0) {
    const catData = [
      { name: "خضروات وفواكه" },
      { name: "ألبان وبيض" },
      { name: "مخبوزات" },
      { name: "مشروبات" },
      { name: "منظفات" },
      { name: "حلويات" },
      { name: "لحوم ودواجن" },
    ];
    await db.insert(categories).values(catData);
    console.log(`   ✅ ${catData.length} فئات`);
  } else {
    console.log("   ℹ️ الفئات موجودة — تم تخطيها.");
  }
  const allCats = await db.query.categories.findMany();

  // ───────────────────────────────────────────────
  // 3) المنتجات
  // ───────────────────────────────────────────────
  console.log("📦 إنشاء المنتجات...");
  const existingProducts = await db.query.products.findMany();
  if (existingProducts.length === 0) {
    const productsData = [
      // خضروات
      { barcode: "6111234567890", name: "طماطم", categoryId: allCats[0].id, unitType: "weight" as const, weightUnit: "kg" as const, purchasePrice: 8, sellingPrice: 12, currentQuantity: 25, lowStockThreshold: 5, expiryDate: "2026-09-15" },
      { barcode: "6111234567891", name: "خيار", categoryId: allCats[0].id, unitType: "weight" as const, weightUnit: "kg" as const, purchasePrice: 5, sellingPrice: 8, currentQuantity: 20, lowStockThreshold: 5, expiryDate: "2026-09-12" },
      { barcode: "6111234567892", name: "بطاطس", categoryId: allCats[0].id, unitType: "weight" as const, weightUnit: "kg" as const, purchasePrice: 6, sellingPrice: 10, currentQuantity: 30, lowStockThreshold: 10, expiryDate: "2026-09-20" },
      { barcode: "6111234567893", name: "تفاح أحمر", categoryId: allCats[0].id, unitType: "weight" as const, weightUnit: "kg" as const, purchasePrice: 15, sellingPrice: 22, currentQuantity: 15, lowStockThreshold: 5, expiryDate: "2026-09-25" },
      // ألبان
      { barcode: "6111234567894", name: "حليب كامل الدسم 1ل", categoryId: allCats[1].id, unitType: "piece" as const, purchasePrice: 9, sellingPrice: 13, currentQuantity: 40, lowStockThreshold: 10, expiryDate: "2026-09-10" },
      { barcode: "6111234567895", name: "جبن أبيض 500غ", categoryId: allCats[1].id, unitType: "piece" as const, purchasePrice: 25, sellingPrice: 35, currentQuantity: 12, lowStockThreshold: 5, expiryDate: "2026-10-01" },
      { barcode: "6111234567896", name: "زبدة 200غ", categoryId: allCats[1].id, unitType: "piece" as const, purchasePrice: 18, sellingPrice: 25, currentQuantity: 8, lowStockThreshold: 5, expiryDate: "2026-11-01" },
      // مخبوزات
      { barcode: "6111234567897", name: "خبز بلدي", categoryId: allCats[2].id, unitType: "piece" as const, purchasePrice: 1.5, sellingPrice: 2.5, currentQuantity: 50, lowStockThreshold: 15, expiryDate: "2026-09-03" },
      { barcode: "6111234567898", name: "خبز توست", categoryId: allCats[2].id, unitType: "piece" as const, purchasePrice: 6, sellingPrice: 9, currentQuantity: 20, lowStockThreshold: 5, expiryDate: "2026-09-08" },
      // مشروبات
      { barcode: "6111234567899", name: "ماء معدني 1.5ل", categoryId: allCats[3].id, unitType: "piece" as const, purchasePrice: 3, sellingPrice: 5, currentQuantity: 60, lowStockThreshold: 15, expiryDate: "2027-01-01" },
      { barcode: "6111234567900", name: "عصير برتقال 1ل", categoryId: allCats[3].id, unitType: "piece" as const, purchasePrice: 12, sellingPrice: 18, currentQuantity: 18, lowStockThreshold: 5, expiryDate: "2026-12-01" },
      { barcode: "6111234567901", name: "كوكا كولا 330مل", categoryId: allCats[3].id, unitType: "piece" as const, purchasePrice: 4, sellingPrice: 7, currentQuantity: 48, lowStockThreshold: 12, expiryDate: "2027-06-01" },
      // منظفات
      { barcode: "6111234567902", name: "صابون غسيل 1ل", categoryId: allCats[4].id, unitType: "piece" as const, purchasePrice: 20, sellingPrice: 30, currentQuantity: 10, lowStockThreshold: 5 },
      { barcode: "6111234567903", name: "منظف زجاج 500مل", categoryId: allCats[4].id, unitType: "piece" as const, purchasePrice: 8, sellingPrice: 14, currentQuantity: 6, lowStockThreshold: 5 },
      // حلويات
      { barcode: "6111234567904", name: "شوكولاتة 100غ", categoryId: allCats[5].id, unitType: "piece" as const, purchasePrice: 15, sellingPrice: 22, currentQuantity: 25, lowStockThreshold: 5, expiryDate: "2027-03-01" },
      // لحوم
      { barcode: "6111234567905", name: "دجاج كامل", categoryId: allCats[6].id, unitType: "weight" as const, weightUnit: "kg" as const, purchasePrice: 35, sellingPrice: 50, currentQuantity: 10, lowStockThreshold: 3, expiryDate: "2026-09-05" },
    ];

    for (const p of productsData) {
      await db.insert(products).values(p);
    }
    console.log(`   ✅ ${productsData.length} منتج`);
  } else {
    console.log("   ℹ️ المنتجات موجودة — تم تخطيها.");
  }
  const allProducts = await db.query.products.findMany();

  // ───────────────────────────────────────────────
  // 4) الموردون
  // ───────────────────────────────────────────────
  console.log("🏭 إنشاء الموردين...");
  const existingSuppliers = await db.query.suppliers.findMany();
  if (existingSuppliers.length === 0) {
    const suppliersData = [
      { name: "شركة الخضروات المركزية", phone: "05 55 12 34 56", address: "حي الصناعة، الجزائر العاصمة", notes: "توصيل يومي 6 صباحاً" },
      { name: "ألبان النور", phone: "05 66 78 90 12", address: "وهران، حي السانية", notes: "دفع آجل 15 يوم" },
      { name: "مخبوزات السعادة", phone: "05 44 33 22 11", address: "قسنطينة" },
      { name: "مشروبات الصحراء", phone: "05 77 88 99 00", address: "باتنة" },
    ];
    await db.insert(suppliers).values(suppliersData);
    console.log(`   ✅ ${suppliersData.length} مورد`);
  } else {
    console.log("   ℹ️ الموردون موجودون — تم تخطيهم.");
  }
  const allSuppliers = await db.query.suppliers.findMany();

  // ───────────────────────────────────────────────
  // 5) فواتير شراء
  // ───────────────────────────────────────────────
  console.log("📋 إنشاء فواتير الشراء...");
  const existingPurchases = await db.query.purchases.findMany();
  if (existingPurchases.length === 0 && allSuppliers.length > 0 && allProducts.length > 0) {
    // فاتورة 1: خضروات
    const [p1] = await db.insert(purchases).values({
      supplierId: allSuppliers[0].id,
      invoiceNumber: "INV-2026-001",
      totalAmount: 850,
      amountPaid: 500,
      status: "partial",
      userId: ownerId,
    }).returning();

    await db.insert(purchaseItems).values([
      { purchaseId: p1.id, productId: allProducts[0].id, quantity: 50, unitCost: 8, lineTotal: 400 },   // طماطم
      { purchaseId: p1.id, productId: allProducts[1].id, quantity: 30, unitCost: 5, lineTotal: 150 },   // خيار
      { purchaseId: p1.id, productId: allProducts[2].id, quantity: 50, unitCost: 6, lineTotal: 300 },   // بطاطس
    ]);

    await db.insert(supplierPayments).values({
      supplierId: allSuppliers[0].id,
      purchaseId: p1.id,
      amount: 500,
      notes: "دفعة أولى",
      userId: ownerId,
    });

    // فاتورة 2: ألبان
    const [p2] = await db.insert(purchases).values({
      supplierId: allSuppliers[1].id,
      invoiceNumber: "INV-2026-002",
      totalAmount: 620,
      amountPaid: 620,
      status: "paid",
      userId: ownerId,
    }).returning();

    await db.insert(purchaseItems).values([
      { purchaseId: p2.id, productId: allProducts[4].id, quantity: 50, unitCost: 9, lineTotal: 450 },   // حليب
      { purchaseId: p2.id, productId: allProducts[5].id, quantity: 10, unitCost: 25, lineTotal: 250 },  // جبن
    ]);

    await db.insert(supplierPayments).values({
      supplierId: allSuppliers[1].id,
      purchaseId: p2.id,
      amount: 620,
      notes: "دفعة كاملة",
      userId: ownerId,
    });

    // فاتورة 3: مشروبات
    const [p3] = await db.insert(purchases).values({
      supplierId: allSuppliers[3].id,
      invoiceNumber: "INV-2026-003",
      totalAmount: 400,
      amountPaid: 0,
      status: "unpaid",
      userId: ownerId,
    }).returning();

    await db.insert(purchaseItems).values([
      { purchaseId: p3.id, productId: allProducts[9].id, quantity: 100, unitCost: 3, lineTotal: 300 },   // ماء
      { purchaseId: p3.id, productId: allProducts[11].id, quantity: 50, unitCost: 4, lineTotal: 200 },  // كولا
    ]);

    console.log("   ✅ 3 فواتير شراء");
  } else {
    console.log("   ℹ️ فواتير الشراء موجودة — تم تخطيها.");
  }

  // ───────────────────────────────────────────────
  // 6) جلسة صندوق مفتوحة
  // ───────────────────────────────────────────────
  console.log("💰 إنشاء جلسة صندوق...");
  const existingSession = await db.query.cashRegisterSessions.findFirst({
    where: eq(cashRegisterSessions.status, "open"),
  });

  let sessionId: number;
  if (!existingSession) {
    const [session] = await db.insert(cashRegisterSessions).values({
      openedBy: ownerId,
      openingAmount: 500,
      status: "open",
    }).returning();
    sessionId = session.id;
    console.log(`   ✅ جلسة صندوق مفتوحة (ID: ${sessionId}) — مبلغ ابتدائي: 500`);
  } else {
    sessionId = existingSession.id;
    console.log(`   ℹ️ جلسة صندوق موجودة (ID: ${sessionId}) — تم تخطيها.`);
  }

  // ───────────────────────────────────────────────
  // 7) مبيعات تجريبية
  // ───────────────────────────────────────────────
  console.log("🛒 إنشاء مبيعات تجريبية...");
  const existingSales = await db.query.sales.findMany();
  if (existingSales.length === 0 && allProducts.length > 0) {
    // بيع 1: بيع نموذجي
    const subtotal1 = 12 + 13 + 2.5 + 5;
    const discount1 = 0;
    const total1 = subtotal1 - discount1;
    const [sale1] = await db.insert(sales).values({
      saleNumber: "20260902-143000-123",
      cashierId: cashierId,
      cashRegisterSessionId: sessionId,
      subtotal: subtotal1,
      discount: discount1,
      total: total1,
      paymentMethod: "cash",
      status: "completed",
    }).returning();

    await db.insert(saleItems).values([
      { saleId: sale1.id, productId: allProducts[0].id, productNameSnapshot: allProducts[0].name, barcodeSnapshot: allProducts[0].barcode, unitType: "weight", quantity: 1, unitPrice: 12, costPriceSnapshot: 8, lineTotal: 12 },
      { saleId: sale1.id, productId: allProducts[4].id, productNameSnapshot: allProducts[4].name, barcodeSnapshot: allProducts[4].barcode, unitType: "piece", quantity: 1, unitPrice: 13, costPriceSnapshot: 9, lineTotal: 13 },
      { saleId: sale1.id, productId: allProducts[7].id, productNameSnapshot: allProducts[7].name, barcodeSnapshot: allProducts[7].barcode, unitType: "piece", quantity: 1, unitPrice: 2.5, costPriceSnapshot: 1.5, lineTotal: 2.5 },
      { saleId: sale1.id, productId: allProducts[9].id, productNameSnapshot: allProducts[9].name, barcodeSnapshot: allProducts[9].barcode, unitType: "piece", quantity: 1, unitPrice: 5, costPriceSnapshot: 3, lineTotal: 5 },
    ]);

    await db.insert(cashMovements).values({
      sessionId,
      type: "sale",
      amount: total1,
      relatedSaleId: sale1.id,
      description: `بيع #${sale1.saleNumber}`,
      userId: cashierId,
    });

    // تحديث المخزون
    for (const item of [
      { productId: allProducts[0].id, qty: -1 },
      { productId: allProducts[4].id, qty: -1 },
      { productId: allProducts[7].id, qty: -1 },
      { productId: allProducts[9].id, qty: -1 },
    ]) {
      const prod = allProducts.find(p => p.id === item.productId)!;
      await db.insert(stockMovements).values({
        productId: item.productId,
        type: "sale",
        quantityChange: item.qty,
        quantityAfter: prod.currentQuantity + item.qty,
        referenceType: "sale",
        referenceId: sale1.id,
        userId: cashierId,
      });
      await db.update(products).set({ currentQuantity: prod.currentQuantity + item.qty }).where(eq(products.id, item.productId));
    }

    // بيع 2: مع خصم
    const subtotal2 = 22 + 35 + 9;
    const discount2 = 5;
    const total2 = subtotal2 - discount2;
    const [sale2] = await db.insert(sales).values({
      saleNumber: "20260902-150000-456",
      cashierId: cashierId,
      cashRegisterSessionId: sessionId,
      subtotal: subtotal2,
      discount: discount2,
      total: total2,
      paymentMethod: "cash",
      status: "completed",
    }).returning();

    await db.insert(saleItems).values([
      { saleId: sale2.id, productId: allProducts[3].id, productNameSnapshot: allProducts[3].name, barcodeSnapshot: allProducts[3].barcode, unitType: "weight", quantity: 1, unitPrice: 22, costPriceSnapshot: 15, lineTotal: 22 },
      { saleId: sale2.id, productId: allProducts[5].id, productNameSnapshot: allProducts[5].name, barcodeSnapshot: allProducts[5].barcode, unitType: "piece", quantity: 1, unitPrice: 35, costPriceSnapshot: 25, lineTotal: 35 },
      { saleId: sale2.id, productId: allProducts[8].id, productNameSnapshot: allProducts[8].name, barcodeSnapshot: allProducts[8].barcode, unitType: "piece", quantity: 1, unitPrice: 9, costPriceSnapshot: 6, lineTotal: 9 },
    ]);

    await db.insert(cashMovements).values({
      sessionId,
      type: "sale",
      amount: total2,
      relatedSaleId: sale2.id,
      description: `بيع #${sale2.saleNumber}`,
      userId: cashierId,
    });

    for (const item of [
      { productId: allProducts[3].id, qty: -1 },
      { productId: allProducts[5].id, qty: -1 },
      { productId: allProducts[8].id, qty: -1 },
    ]) {
      const prod = allProducts.find(p => p.id === item.productId)!;
      await db.insert(stockMovements).values({
        productId: item.productId,
        type: "sale",
        quantityChange: item.qty,
        quantityAfter: prod.currentQuantity + item.qty,
        referenceType: "sale",
        referenceId: sale2.id,
        userId: cashierId,
      });
      await db.update(products).set({ currentQuantity: prod.currentQuantity + item.qty }).where(eq(products.id, item.productId));
    }

    // بيع 3: بيع صغير
    const subtotal3 = 7 + 14;
    const total3 = subtotal3;
    const [sale3] = await db.insert(sales).values({
      saleNumber: "20260902-153000-789",
      cashierId: cashierId,
      cashRegisterSessionId: sessionId,
      subtotal: subtotal3,
      discount: 0,
      total: total3,
      paymentMethod: "cash",
      status: "completed",
    }).returning();

    await db.insert(saleItems).values([
      { saleId: sale3.id, productId: allProducts[11].id, productNameSnapshot: allProducts[11].name, barcodeSnapshot: allProducts[11].barcode, unitType: "piece", quantity: 1, unitPrice: 7, costPriceSnapshot: 4, lineTotal: 7 },
      { saleId: sale3.id, productId: allProducts[13].id, productNameSnapshot: allProducts[13].name, barcodeSnapshot: allProducts[13].barcode, unitType: "piece", quantity: 1, unitPrice: 14, costPriceSnapshot: 8, lineTotal: 14 },
    ]);

    await db.insert(cashMovements).values({
      sessionId,
      type: "sale",
      amount: total3,
      relatedSaleId: sale3.id,
      description: `بيع #${sale3.saleNumber}`,
      userId: cashierId,
    });

    for (const item of [
      { productId: allProducts[11].id, qty: -1 },
      { productId: allProducts[13].id, qty: -1 },
    ]) {
      const prod = allProducts.find(p => p.id === item.productId)!;
      await db.insert(stockMovements).values({
        productId: item.productId,
        type: "sale",
        quantityChange: item.qty,
        quantityAfter: prod.currentQuantity + item.qty,
        referenceType: "sale",
        referenceId: sale3.id,
        userId: cashierId,
      });
      await db.update(products).set({ currentQuantity: prod.currentQuantity + item.qty }).where(eq(products.id, item.productId));
    }

    console.log("   ✅ 3 مبيعات تجريبية");
  } else {
    console.log("   ℹ️ المبيعات موجودة — تم تخطيها.");
  }

  // ───────────────────────────────────────────────
  // 8) إعدادات افتراضية
  // ───────────────────────────────────────────────
  console.log("⚙️ إنشاء الإعدادات...");
  const existingSettings = await db.query.appSettings.findMany();
  if (existingSettings.length === 0) {
    await db.insert(appSettings).values([
      { key: "language", value: "ar" },
      { key: "printerName", value: "" },
      { key: "expiryWarningDays", value: "7" },
      { key: "storeName", value: "سوبرماركت ياس كود" },
      { key: "storeAddress", value: "الجزائر العاصمة" },
      { key: "storePhone", value: "05 55 00 00 00" },
    ]);
    console.log("   ✅ 6 إعدادات افتراضية");
  } else {
    console.log("   ℹ️ الإعدادات موجودة — تم تخطيها.");
  }

  // ───────────────────────────────────────────────
  // ملخص
  // ───────────────────────────────────────────────
  console.log("\n" + "=".repeat(50));
  console.log("✅ تم ملء قاعدة البيانات بنجاح!");
  console.log("=".repeat(50));
  console.log("👤 تسجيل الدخول:");
  console.log("   Owner:    admin / admin123");
  console.log("   Cashier:  cashier / cashier123");
  console.log("📦 المنتجات: 16 منتج في 7 فئات");
  console.log("🏭 الموردون: 4 موردين");
  console.log("📋 المشتريات: 3 فواتير شراء");
  console.log("💰 الصندوق: جلسة مفتوحة بمبلغ 500");
  console.log("🛒 المبيعات: 3 فواتير بيع");
  console.log("=".repeat(50));

  closeDatabase();
}

main().catch((err) => {
  console.error("❌ حدث خطأ غير متوقع:", err);
  process.exit(1);
});
