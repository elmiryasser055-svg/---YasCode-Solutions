// scripts/seed-reports.ts
//
// 📈 يملأ قاعدة البيانات بمبيعات تاريخية (افتراضياً آخر 120 يوماً) ليظهر:
//   - منحنى الإيرادات / التكلفة / الربح (يومي، أسبوعي، شهري)
//   - بطاقات ملخص اليوم
//   - الأكثر مبيعاً (آخر 30 يوماً)
//   - المخزون الراكد (منتجات لم تُبَع منذ 30 يوماً ولها مخزون)
//
// الاستخدام:
//   npx tsx scripts/seed-reports.ts              # 120 يوماً
//   npx tsx scripts/seed-reports.ts --days=200   # عدد أيام مخصص
//   npx tsx scripts/seed-reports.ts --reset      # يحذف بيانات هذا السكربت ثم يعيد إنشاءها
//
// ⚠️ شغّل seed-all.ts أولاً (يحتاج المستخدمين والمنتجات).
// ℹ️ لا يمسّ مخزون المنتجات الحالي (الكميات تبقى كما هي).
//    مبيعاته تحمل saleNumber يبدأ بـ "SEED-" وجلساته notes = "seed-reports"،
//    لذلك يمكن حذفها بأمان عبر --reset.

import path from "node:path";
import os from "node:os";
import { eq, like } from "drizzle-orm";
import { loadEnv } from "../backend/lib/env";
import { initDatabase, closeDatabase, getDb } from "../backend/lib/db";
import {
  users,
  products,
  cashRegisterSessions,
  cashMovements,
  sales,
  saleItems,
} from "../db/schema";

// ───────────────────────────────────────────────
// أدوات مساعدة
// ───────────────────────────────────────────────

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

// مولّد أرقام عشوائية ثابت (نفس النتيجة في كل تشغيل)
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260929);
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const round2 = (n: number) => Math.round(n * 100) / 100;
const pad = (n: number, l = 2) => String(n).padStart(l, "0");

// صيغة CURRENT_TIMESTAMP في SQLite: "YYYY-MM-DD HH:MM:SS" (UTC)
function toSqlTs(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const daysArg = args.find((a) => a.startsWith("--days="));
  return {
    days: daysArg ? Math.max(7, parseInt(daysArg.split("=")[1], 10) || 120) : 120,
    reset: args.includes("--reset"),
  };
}

// أوزان الشعبية حسب الباركود (المنتج الأعلى وزناً = الأكثر مبيعاً)
const POPULARITY: Record<string, number> = {
  "6111234567890": 9, // طماطم
  "6111234567891": 5, // خيار
  "6111234567892": 6, // بطاطس
  "6111234567893": 3, // تفاح
  "6111234567894": 10, // حليب
  "6111234567895": 3, // جبن
  "6111234567897": 12, // خبز بلدي
  "6111234567898": 4, // خبز توست
  "6111234567899": 9, // ماء
  "6111234567900": 3, // عصير
  "6111234567901": 7, // كولا
  "6111234567903": 2, // منظف زجاج
};

// منتجات "راكدة": تُباع فقط قبل 45 يوماً أو أكثر → تظهر في تقرير المخزون الراكد
const DEAD_BARCODES = new Set([
  "6111234567896", // زبدة
  "6111234567902", // صابون غسيل
  "6111234567904", // شوكولاتة
  "6111234567905", // دجاج كامل
]);

const SALE_NUMBER_PREFIX = "SEED-";
const SESSION_NOTE = "seed-reports";

// ───────────────────────────────────────────────

async function main() {
  const { days, reset } = parseArgs();
  const dbPath = getDefaultDbPath();
  console.log(`📂 قاعدة البيانات: ${dbPath}`);

  loadEnv({ DB_PATH: dbPath });
  initDatabase();
  const db = getDb();

  // 0) إعادة الضبط اختيارياً
  if (reset) {
    console.log("🧹 حذف بيانات seed-reports السابقة...");
    await db.delete(sales).where(like(sales.saleNumber, `${SALE_NUMBER_PREFIX}%`));
    await db.delete(cashRegisterSessions).where(eq(cashRegisterSessions.notes, SESSION_NOTE));
  }

  const already = await db.query.sales.findFirst({
    where: like(sales.saleNumber, `${SALE_NUMBER_PREFIX}%`),
  });
  if (already) {
    console.log("ℹ️ بيانات seed-reports موجودة بالفعل. استعمل --reset لإعادة إنشائها.");
    closeDatabase();
    return;
  }

  // 1) المتطلبات
  const owner = await db.query.users.findFirst({ where: eq(users.role, "owner") });
  if (!owner) {
    console.error("❌ لا يوجد مستخدم Owner. شغّل seed-all.ts أولاً.");
    process.exit(1);
  }
  const cashier = (await db.query.users.findFirst({ where: eq(users.role, "cashier") })) ?? owner;

  const allProducts = (await db.query.products.findMany()).filter((p) => p.isActive);
  if (allProducts.length === 0) {
    console.error("❌ لا توجد منتجات. شغّل seed-all.ts أولاً.");
    process.exit(1);
  }

  const isDead = (p: (typeof allProducts)[number]) => !!p.barcode && DEAD_BARCODES.has(p.barcode);
  const weightOf = (p: (typeof allProducts)[number]) => (p.barcode ? POPULARITY[p.barcode] ?? 1 : 1);

  // اختيار منتج عشوائي حسب الوزن
  function pickProduct(pool: typeof allProducts) {
    const total = pool.reduce((s, p) => s + weightOf(p), 0);
    let r = rand() * total;
    for (const p of pool) {
      r -= weightOf(p);
      if (r <= 0) return p;
    }
    return pool[pool.length - 1];
  }

  // جلسة اليوم (المفتوحة)
  let todaySession = await db.query.cashRegisterSessions.findFirst({
    where: eq(cashRegisterSessions.status, "open"),
  });
  if (!todaySession) {
    [todaySession] = await db
      .insert(cashRegisterSessions)
      .values({ openedBy: owner.id, openingAmount: 500, status: "open" })
      .returning();
  }

  // 2) توليد الأيام
  console.log(`🛒 توليد مبيعات آخر ${days} يوماً...`);
  const now = new Date();
  let totalSales = 0;
  let totalRevenue = 0;
  let seq = 0;

  for (let daysAgo = days; daysAgo >= 0; daysAgo--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    const isToday = daysAgo === 0;
    const dow = day.getDay(); // 0=Sun ... 5=Fri, 6=Sat

    // المنتجات المتاحة للبيع في هذا اليوم
    const pool = allProducts.filter((p) => !(isDead(p) && daysAgo < 45));
    if (pool.length === 0) continue;

    // عدد المبيعات: اتجاه صاعد + ذروة نهاية الأسبوع + ضجيج
    const growth = 1 + 0.005 * (days - daysAgo);
    const weekend = dow === 5 ? 1.45 : dow === 6 ? 1.25 : 1;
    let count = Math.round(10 * growth * weekend * (0.75 + rand() * 0.5));
    if (isToday) count = Math.max(2, Math.round(count * 0.6));

    // نافذة الوقت (توقيت محلي): 08:00 → 21:00 (اليوم: حتى الآن)
    const startMin = 8 * 60;
    let endMin = 21 * 60;
    if (isToday) endMin = Math.min(endMin, now.getHours() * 60 + now.getMinutes());
    if (endMin - startMin < 10) continue;

    // جلسة الصندوق
    let sessionId: number;
    const openedAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 7, 55);
    const closedAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 21, 30);
    if (isToday) {
      sessionId = todaySession!.id;
    } else {
      const [s] = await db
        .insert(cashRegisterSessions)
        .values({
          openedBy: owner.id,
          openedAt: toSqlTs(openedAt),
          openingAmount: 500,
          status: "open", // نغلقها بعد حساب المجاميع
          notes: SESSION_NOTE,
        })
        .returning();
      sessionId = s.id;
    }

    // أوقات مرتبة تصاعدياً
    const minutes = Array.from({ length: count }, () => randInt(startMin, endMin)).sort((a, b) => a - b);
    let daySalesTotal = 0;

    for (const m of minutes) {
      const when = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60, randInt(0, 59));
      const ts = toSqlTs(when);

      // سلة: 1-5 أصناف مختلفة
      const itemsCount = randInt(1, 5);
      const chosen = new Map<number, (typeof allProducts)[number]>();
      for (let i = 0; i < itemsCount; i++) {
        const p = pickProduct(pool);
        chosen.set(p.id, p);
      }

      const lines = [...chosen.values()].map((p) => {
        const qty =
          p.unitType === "weight"
            ? Math.max(0.25, Math.round((0.5 + rand() * 2.5) * 4) / 4)
            : randInt(1, 4);
        const unitPrice = p.sellingPrice;
        const cost = round2(p.purchasePrice * (1 + (rand() - 0.5) * 0.1)); // تذبذب طفيف في التكلفة
        return {
          productId: p.id,
          productNameSnapshot: p.name,
          barcodeSnapshot: p.barcode,
          unitType: p.unitType,
          quantity: qty,
          unitPrice,
          costPriceSnapshot: cost,
          lineTotal: round2(qty * unitPrice),
        };
      });

      const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
      const discount = rand() < 0.1 ? Math.min(randInt(1, 5), Math.floor(subtotal * 0.2)) : 0;
      const total = round2(subtotal - discount);

      seq++;
      const saleNumber = `${SALE_NUMBER_PREFIX}${day.getFullYear()}${pad(day.getMonth() + 1)}${pad(day.getDate())}-${pad(when.getHours())}${pad(when.getMinutes())}${pad(when.getSeconds())}-${pad(seq, 5)}`;

      const [sale] = await db
        .insert(sales)
        .values({
          saleNumber,
          cashierId: cashier.id,
          cashRegisterSessionId: sessionId,
          subtotal,
          discount,
          total,
          paymentMethod: "cash",
          status: "completed",
          createdAt: ts,
        })
        .returning();

      await db.insert(saleItems).values(lines.map((l) => ({ ...l, saleId: sale.id })));

      await db.insert(cashMovements).values({
        sessionId,
        type: "sale",
        amount: total,
        relatedSaleId: sale.id,
        description: `بيع #${saleNumber}`,
        userId: cashier.id,
        createdAt: ts,
      });

      daySalesTotal += total;
      totalSales++;
      totalRevenue += total;
    }

    // إغلاق جلسات الأيام السابقة
    if (!isToday) {
      const expected = round2(500 + daySalesTotal);
      const diff = rand() < 0.25 ? randInt(-10, 10) : 0;
      await db
        .update(cashRegisterSessions)
        .set({
          status: "closed",
          closedBy: owner.id,
          closedAt: toSqlTs(closedAt),
          expectedAmount: expected,
          actualAmount: expected + diff,
          difference: diff,
        })
        .where(eq(cashRegisterSessions.id, sessionId));
    }

    if (daysAgo % 20 === 0) console.log(`   … متبقي ${daysAgo} يوماً`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ تم توليد بيانات التقارير بنجاح!");
  console.log("=".repeat(50));
  console.log(`🛒 عدد المبيعات: ${totalSales}`);
  console.log(`💵 إجمالي الإيرادات: ${round2(totalRevenue)}`);
  console.log(`📅 الفترة: آخر ${days} يوماً`);
  console.log(`🐢 منتجات راكدة (بلا مبيعات منذ 45+ يوماً): ${allProducts.filter(isDead).length}`);
  console.log("=".repeat(50));

  closeDatabase();
}

main().catch((err) => {
  console.error("❌ حدث خطأ غير متوقع:", err);
  process.exit(1);
});