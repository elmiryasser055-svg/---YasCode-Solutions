// modules/reports/reports.service.ts
import { and, eq, gte, sum, desc, isNotNull, gt } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { sales, saleItems, products } from "../../../db/schema";
import type { ProfitTrendInput, ProductPerformanceInput } from "./reports.schema";

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
  if (period === "daily") return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  if (period === "weekly") return new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);
  const monthsAgo = new Date(now);
  monthsAgo.setMonth(monthsAgo.getMonth() - 12);
  return monthsAgo;
}

export async function getProfitTrend(input: ProfitTrendInput): Promise<Bucket[]> {
  const db = getDb();
  const start = getRangeStart(input.period);

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

/**
 * الأكثر مبيعاً (Best Sellers)
 */
export async function getBestSellers(input: ProductPerformanceInput) {
  const db = getDb();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - input.days);

  const result = await db
    .select({
      productId: saleItems.productId,
      name: products.name,
      barcode: products.barcode,
      totalQuantitySold: sum(saleItems.quantity),
      totalRevenue: sum(saleItems.lineTotal),
      currentStock: products.currentQuantity,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(
      and(
        eq(sales.status, "completed"),
        gte(sales.createdAt, startDate.toISOString()),
        isNotNull(saleItems.productId)
      )
    )
    .groupBy(saleItems.productId, products.name, products.barcode, products.currentQuantity)
    .orderBy(desc(sum(saleItems.quantity)))
    .limit(input.limit);

  return result.map((row) => ({
    ...row,
    totalQuantitySold: Number(row.totalQuantitySold ?? 0),
    totalRevenue: Number(row.totalRevenue ?? 0),
  }));
}

/**
 * البضاعة الراكدة (Dead Stock)
 */
export async function getDeadStock(input: ProductPerformanceInput) {
  const db = getDb();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - input.days);

  const activeProducts = await db.query.products.findMany({
    where: and(
      eq(products.isActive, true),
      gt(products.currentQuantity, 0)
    ),
  });

  const soldProductsData = await db
    .select({
      productId: saleItems.productId,
      totalSold: sum(saleItems.quantity),
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(
      and(
        eq(sales.status, "completed"),
        gte(sales.createdAt, startDate.toISOString()),
        isNotNull(saleItems.productId)
      )
    )
    .groupBy(saleItems.productId);

  const soldMap = new Map<number, number>();
  for (const item of soldProductsData) {
    // ⭐ تصحيح خطأ TypeScript: التأكد من أن productId ليس null
    if (item.productId) {
      soldMap.set(item.productId, Number(item.totalSold ?? 0));
    }
  }

  const deadStock = activeProducts
    .map((product) => {
      const soldQty = soldMap.get(product.id) ?? 0;
      return {
        productId: product.id,
        name: product.name,
        barcode: product.barcode,
        currentStock: product.currentQuantity,
        totalSoldInPeriod: soldQty,
        frozenCapital: product.currentQuantity * product.purchasePrice,
      };
    })
    .filter((p) => p.totalSoldInPeriod === 0)
    .sort((a, b) => b.frozenCapital - a.frozenCapital)
    .slice(0, input.limit);

  return deadStock;
}