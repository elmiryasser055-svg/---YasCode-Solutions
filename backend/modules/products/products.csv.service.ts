// modules/products/products.csv.service.ts
//
// ⭐ يسدّ فجوة: لا توجد طريقة عملية لإدخال مخزون أولي كبير (مئات المنتجات)
// إلا يدويًا منتجًا تلو الآخر عبر ProductForm — غير عملي إطلاقًا عند أول
// تجهيز للنظام في محل قائم فعلاً بمئات الأصناف.
//
// التصميم: استخدام dialog.showSaveDialog/showOpenDialog من Electron مباشرة
// هنا في الباك-إند (main process) — الـ renderer لا يحتاج ولا يجب أن يصل
// لنظام الملفات مباشرة (نفس مبدأ contextIsolation المطبَّق في كل المشروع).
// تنسيق CSV بسيط ومباشر (بدون مكتبة خارجية) يكفي لحقول المنتج المسطّحة.

import { dialog } from "electron";
import fs from "node:fs";
import { getDb } from "../../lib/db";
import { products } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { BusinessRuleError } from "../../middleware/errors";

const CSV_COLUMNS = [
  "barcode",
  "name",
  "unitType",
  "weightUnit",
  "purchasePrice",
  "sellingPrice",
  "currentQuantity",
  "lowStockThreshold",
  "expiryDate",
] as const;

function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  // تهريب الفاصلة/الاقتباس/سطر جديد بمعيار CSV القياسي (RFC 4180 مبسّط)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCsvLine(line: string): string[] {
  // محلّل بسيط يدعم الحقول المقتبسة والفاصلة داخلها — كافٍ لتنسيقنا الخاص
  // (لسنا بحاجة لمحلّل CSV كامل المواصفات كمكتبة خارجية لهذا الاستخدام المحدود)
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ",") {
        result.push(current);
        current = "";
      } else current += char;
    }
  }
  result.push(current);
  return result;
}

/** يفتح نافذة "حفظ باسم" ويصدّر كل المنتجات النشطة إلى ملف CSV */
export async function exportProductsToCsv(): Promise<{ success: boolean; path?: string; count?: number }> {
  const db = getDb();
  const allProducts = await db.query.products.findMany({ where: eq(products.isActive, true) });

  const lines = [CSV_COLUMNS.join(",")];
  for (const p of allProducts) {
    lines.push(CSV_COLUMNS.map((col) => escapeCsvField((p as any)[col])).join(","));
  }
  const csvContent = lines.join("\n");

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "تصدير المنتجات إلى CSV",
    defaultPath: `products-export-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });

  if (canceled || !filePath) return { success: false };

  fs.writeFileSync(filePath, "\uFEFF" + csvContent, "utf-8"); // BOM لدعم فتح صحيح للعربية في Excel
  return { success: true, path: filePath, count: allProducts.length };
}

export interface CsvImportResult {
  created: number;
  skipped: number;
  errors: Array<{ line: number; reason: string }>;
}

/** يفتح نافذة "فتح ملف" ويستورد منتجات بالجملة، متجاهلاً الصفوف غير الصالحة مع تسجيل السبب */
export async function importProductsFromCsv(): Promise<CsvImportResult | { canceled: true }> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "استيراد منتجات من CSV",
    filters: [{ name: "CSV", extensions: ["csv"] }],
    properties: ["openFile"],
  });

  if (canceled || filePaths.length === 0) return { canceled: true };

  const content = fs.readFileSync(filePaths[0], "utf-8").replace(/^\uFEFF/, ""); // إزالة BOM إن وُجد
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    throw new BusinessRuleError("الملف فارغ أو لا يحتوي أي بيانات منتجات.");
  }

  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const missingColumns = ["name", "unitType", "sellingPrice"].filter((c) => !header.includes(c));
  if (missingColumns.length > 0) {
    throw new BusinessRuleError(
      `الملف ناقص أعمدة إلزامية: ${missingColumns.join(", ")}. الأعمدة المتوقعة: ${CSV_COLUMNS.join(", ")}`
    );
  }

  const db = getDb();
  const result: CsvImportResult = { created: 0, skipped: 0, errors: [] };

  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1; // للمطابقة مع رقم السطر الفعلي في الملف (1-indexed + رأس الجدول)
    try {
      const values = parseCsvLine(lines[i]);
      const row: Record<string, string> = {};
      header.forEach((col, idx) => (row[col] = values[idx] ?? ""));

      if (!row.name || row.name.trim().length < 2) {
        result.errors.push({ line: lineNumber, reason: "اسم المنتج مفقود أو قصير جدًا" });
        result.skipped++;
        continue;
      }
      const sellingPrice = Number(row.sellingPrice);
      if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
        result.errors.push({ line: lineNumber, reason: "سعر بيع غير صالح" });
        result.skipped++;
        continue;
      }
      const unitType = row.unitType === "weight" ? "weight" : "piece";
      const barcode = row.barcode?.trim() || null;

      if (barcode) {
        const existing = await db.query.products.findFirst({ where: eq(products.barcode, barcode) });
        if (existing) {
          result.errors.push({ line: lineNumber, reason: `الباركود "${barcode}" مستخدم بالفعل، تم تجاوز الصف` });
          result.skipped++;
          continue;
        }
      }

      await db.insert(products).values({
        barcode,
        name: row.name.trim(),
        unitType,
        weightUnit: unitType === "weight" ? (row.weightUnit === "g" ? "g" : "kg") : null,
        purchasePrice: Number(row.purchasePrice) || 0,
        sellingPrice,
        currentQuantity: Number(row.currentQuantity) || 0,
        lowStockThreshold: Number(row.lowStockThreshold) || 5,
        expiryDate: row.expiryDate?.trim() || null,
      });
      result.created++;
    } catch (err) {
      result.errors.push({
        line: lineNumber,
        reason: err instanceof Error ? err.message : "خطأ غير متوقع في هذا الصف",
      });
      result.skipped++;
    }
  }

  return result;
}
