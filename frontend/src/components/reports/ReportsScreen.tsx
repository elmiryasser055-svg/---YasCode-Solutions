// src/components/reports/ReportsScreen.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "../../lib/ipcClient";
import { useIpcQuery } from "../../hooks/useIpcQuery";
import { toast } from "../../lib/toast";
import { useTranslation } from "react-i18next";

type Period = "daily" | "weekly" | "monthly";
type ProductReportType = "best" | "dead";

export function ReportsScreen() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>("daily");
  const [reportType, setReportType] = useState<ProductReportType>("best");

  const trend = useIpcQuery(() => api().reports.getProfitTrend({ period }), [period]);
  const today = useIpcQuery(() => api().reports.getTodaySummary());
  
  const bestSellers = useIpcQuery(() => api().reports.getBestSellers({ days: 30, limit: 10 }), [reportType]);
  const deadStock = useIpcQuery(() => api().reports.getDeadStock({ days: 30, limit: 10 }), [reportType]);

  useEffect(() => {
    if (trend.error) toast.error(trend.error);
    if (today.error) toast.error(today.error);
    if (bestSellers.error) toast.error(bestSellers.error);
    if (deadStock.error) toast.error(deadStock.error);
  }, [trend.error, today.error, bestSellers.error, deadStock.error]);

  const getPeriodLabel = (p: Period) => {
    if (p === "daily") return t("reports.period_daily");
    if (p === "weekly") return t("reports.period_weekly");
    return t("reports.period_monthly");
  };

  const cards = [
    { 
      label: t("reports.today_sales"), 
      value: today.data?.salesCount ?? "-", 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>,
      bg: "bg-[var(--color-primary-50)]",
      color: "text-[var(--color-primary-600)]"
    },
    { 
      label: t("reports.revenue"), 
      value: today.data?.revenue?.toFixed(2) ?? "-", 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>,
      bg: "bg-[var(--color-success-50)]",
      color: "text-[var(--color-success-600)]"
    },
    { 
      label: t("reports.cost"), 
      value: today.data?.cost?.toFixed(2) ?? "-", 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>,
      bg: "bg-[var(--color-warning-50)]",
      color: "text-[var(--color-warning-600)]"
    },
    { 
      label: t("reports.net_profit"), 
      value: today.data?.profit?.toFixed(2) ?? "-", 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>,
      bg: "bg-[var(--color-success-50)]",
      color: "text-[var(--color-success-600)]",
      highlight: true
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t("app.screen.reports")}</h1>
        
        <div className="inline-flex p-1 bg-[var(--color-gray-100)] rounded-lg">
          {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                period === p ? "text-[var(--color-primary-700)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {period === p && (
                <motion.div
                  layoutId="reportsPeriodIndicator"
                  className="absolute inset-0 bg-white rounded-md shadow-sm"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10">{getPeriodLabel(p)}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`yc-card ${card.highlight ? "border-[var(--color-success-200)]" : ""}`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-[var(--text-secondary)]">{card.label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg} ${card.color}`}>
                {card.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {card.value}
              {typeof card.value === "string" && card.value !== "-" && card.label !== t("reports.today_sales") && (
                <span className="text-sm font-normal text-[var(--text-muted)] mr-1">{t("reports.currency")}</span>
              )}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Chart Area */}
      <AnimatePresence mode="wait">
        {trend.isLoading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="yc-card h-96 flex items-center justify-center"
          >
            <div className="animate-spin-slow h-8 w-8 rounded-full border-4 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)]"></div>
          </motion.div>
        ) : trend.data && trend.data.length > 0 ? (
          <motion.div 
            key="chart"
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0 }}
            className="yc-card h-96 p-6"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)'
                  }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Line type="monotone" dataKey="revenue" name={t("reports.chart_legend_revenue")} stroke="var(--color-primary-500)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="cost" name={t("reports.chart_legend_cost")} stroke="var(--color-warning-500)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="profit" name={t("reports.chart_legend_profit")} stroke="var(--color-success-500)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        ) : (
          <motion.div 
            key="empty"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="yc-card h-96 flex flex-col items-center justify-center text-[var(--text-muted)] gap-2"
          >
            <svg className="w-12 h-12 text-[var(--color-gray-300)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            <p>{t("reports.empty_chart")}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Analysis */}
      <div className="yc-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{t("reports.product_analysis_title")}</h2>
          
          <div className="inline-flex p-1 bg-[var(--color-gray-100)] rounded-lg">
            <button
              onClick={() => setReportType("best")}
              className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                reportType === "best" ? "text-[var(--color-success-700)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {reportType === "best" && (
                <motion.div
                  layoutId="productReportIndicator"
                  className="absolute inset-0 bg-white rounded-md shadow-sm"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                {t("reports.best_sellers")}
              </span>
            </button>
            <button
              onClick={() => setReportType("dead")}
              className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                reportType === "dead" ? "text-[var(--color-warning-700)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {reportType === "dead" && (
                <motion.div
                  layoutId="productReportIndicator"
                  className="absolute inset-0 bg-white rounded-md shadow-sm"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                {t("reports.dead_stock")}
              </span>
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {reportType === "best" ? (
            <motion.div
              key="best-sellers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {bestSellers.isLoading ? (
                <div className="py-10 flex justify-center">
                  <div className="animate-spin-slow h-6 w-6 rounded-full border-4 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)]"></div>
                </div>
              ) : bestSellers.data && bestSellers.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="text-[var(--text-muted)] border-b border-[var(--border-light)]">
                      <tr>
                        <th className="pb-3 font-medium">{t("reports.col_product")}</th>
                        <th className="pb-3 font-medium text-center">{t("reports.col_sold_qty")}</th>
                        <th className="pb-3 font-medium text-center">{t("reports.col_revenue")}</th>
                        <th className="pb-3 font-medium text-center">{t("reports.col_current_stock")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-light)]">
                      {bestSellers.data.map((item) => (
                        <tr key={item.productId} className="hover:bg-[var(--color-gray-50)]">
                          <td className="py-3 font-medium text-[var(--text-primary)]">{item.name}</td>
                          <td className="py-3 text-center text-[var(--color-success-600)] font-bold">{item.totalQuantitySold}</td>
                          <td className="py-3 text-center text-[var(--text-secondary)]">{item.totalRevenue.toFixed(2)} {t("reports.currency")}</td>
                          <td className="py-3 text-center text-[var(--text-secondary)]">{item.currentStock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center text-[var(--text-muted)]">{t("reports.empty_best_sellers")}</div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="dead-stock"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {deadStock.isLoading ? (
                <div className="py-10 flex justify-center">
                  <div className="animate-spin-slow h-6 w-6 rounded-full border-4 border-[var(--color-warning-200)] border-t-[var(--color-warning-600)]"></div>
                </div>
              ) : deadStock.data && deadStock.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="text-[var(--text-muted)] border-b border-[var(--border-light)]">
                      <tr>
                        <th className="pb-3 font-medium">{t("reports.col_product")}</th>
                        <th className="pb-3 font-medium text-center">{t("reports.col_remaining_stock")}</th>
                        <th className="pb-3 font-medium text-center">{t("reports.col_sales_30days")}</th>
                        <th className="pb-3 font-medium text-center">{t("reports.col_frozen_capital")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-light)]">
                      {deadStock.data.map((item) => (
                        <tr key={item.productId} className="hover:bg-[var(--color-gray-50)]">
                          <td className="py-3 font-medium text-[var(--text-primary)]">{item.name}</td>
                          <td className="py-3 text-center text-[var(--color-warning-600)] font-bold">{item.currentStock}</td>
                          <td className="py-3 text-center text-[var(--text-muted)]">{item.totalSoldInPeriod}</td>
                          <td className="py-3 text-center text-[var(--color-danger-600)] font-medium">{item.frozenCapital.toFixed(2)} {t("reports.currency")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center text-[var(--text-muted)]">{t("reports.empty_dead_stock")}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}