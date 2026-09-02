// modules/reports/reports.service.ts
//
// الربح لكل عملية بيع = sale.total - مجموع (costPriceSnapshot × quantity) لبنودها.
// نعتمد على sale.total (وليس subtotal) لأنه يخصم الخصم أصلاً — فالربح المحسوب
// هنا صافٍ من الخصم تلقائيًا دون أي حساب إضافي. الاعتماد على costPriceSnapshot
// (وليس products.purchasePrice الحالي) يضمن دقة الأرباح التاريخية حتى لو تغيّر
// سعر الشراء لاحقًا — نفس المبدأ الموثّق في schemaDB.md § سيناريو 1.

import { and, eq, gte } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { sales } from "../../../db/schema";
import type { ProfitTrendInput } from "./reports.schema";

interface Bucket {
  label: string;
  revenue: number;
  cost: number;
  profit: number;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function getIsoWeekLabel(date: Date): string {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${pad(weekNo)}`;
}

function getBucketLabel(date: Date, period: ProfitTrendInput["period"]): string {
  if (period === "daily") return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  if (period === "weekly") return getIsoWeekLabel(date);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function getRangeStart(period: ProfitTrendInput["period"]): Date {
  const now = new Date();
  if (period === "daily") return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // آخر 14 يوم
  if (period === "weekly") return new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000); // آخر 8 أسابيع
  const monthsAgo = new Date(now);
  monthsAgo.setMonth(monthsAgo.getMonth() - 12); // آخر 12 شهر
  return monthsAgo;
}

export async function getProfitTrend(input: ProfitTrendInput): Promise<Bucket[]> {
  const db = getDb();
  const start = getRangeStart(input.period);

  // نجلب المبيعات المكتملة ضمن الفترة مع بنودها دفعة واحدة (مقبول لحجم بيانات محل واحد)
  const salesInRange = await db.query.sales.findMany({
    where: and(eq(sales.status, "completed"), gte(sales.createdAt, start.toISOString())),
    with: { items: true },
  });

  const buckets = new Map<string, Bucket>();

  for (const sale of salesInRange) {
    const label = getBucketLabel(new Date(sale.createdAt), input.period);
    const cost = sale.items.reduce((sum, item) => sum + item.costPriceSnapshot * item.quantity, 0);
    const revenue = sale.total;
    const profit = revenue - cost;

    const bucket = buckets.get(label) ?? { label, revenue: 0, cost: 0, profit: 0 };
    bucket.revenue += revenue;
    bucket.cost += cost;
    bucket.profit += profit;
    buckets.set(label, bucket);
  }

  return Array.from(buckets.values()).sort((a, b) => a.label.localeCompare(b.label));
}

/** ملخص سريع لليوم الحالي — يُستخدم في بطاقات أعلى شاشة التقارير */
export async function getTodaySummary() {
  const db = getDb();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todaySales = await db.query.sales.findMany({
    where: and(eq(sales.status, "completed"), gte(sales.createdAt, startOfDay.toISOString())),
    with: { items: true },
  });

  const revenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const cost = todaySales.reduce(
    (sum, s) => sum + s.items.reduce((s2, i) => s2 + i.costPriceSnapshot * i.quantity, 0),
    0
  );

  return { revenue, cost, profit: revenue - cost, salesCount: todaySales.length };
}
