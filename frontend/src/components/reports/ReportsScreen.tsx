// src/components/reports/ReportsScreen.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "../../lib/ipcClient";
import { useIpcQuery } from "../../hooks/useIpcQuery";
import { toast } from "../../lib/toast";

type Period = "daily" | "weekly" | "monthly";

const PERIOD_LABELS: Record<Period, string> = {
  daily: "يومي",
  weekly: "أسبوعي",
  monthly: "شهري",
};

export function ReportsScreen() {
  const [period, setPeriod] = useState<Period>("daily");

  const trend = useIpcQuery(() => api().reports.getProfitTrend({ period }), [period]);
  const today = useIpcQuery(() => api().reports.getTodaySummary());

  // إظهار الأخطاء عبر الـ Toast
  useEffect(() => {
    if (trend.error) toast.error(trend.error);
    if (today.error) toast.error(today.error);
  }, [trend.error, today.error]);

  const cards = [
    { 
      label: "مبيعات اليوم", 
      value: today.data?.salesCount ?? "-", 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>,
      bg: "bg-[var(--color-primary-50)]",
      color: "text-[var(--color-primary-600)]"
    },
    { 
      label: "الإيرادات", 
      value: today.data?.revenue?.toFixed(2) ?? "-", 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>,
      bg: "bg-[var(--color-success-50)]",
      color: "text-[var(--color-success-600)]"
    },
    { 
      label: "التكلفة", 
      value: today.data?.cost?.toFixed(2) ?? "-", 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>,
      bg: "bg-[var(--color-warning-50)]",
      color: "text-[var(--color-warning-600)]"
    },
    { 
      label: "الربح الصافي", 
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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">التقارير والأرباح</h1>
        
        {/* Period Selector (Segmented Control) */}
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
              <span className="relative z-10">{PERIOD_LABELS[p]}</span>
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
              {typeof card.value === "string" && card.value !== "-" && card.label !== "مبيعات اليوم" && (
                <span className="text-sm font-normal text-[var(--text-muted)] mr-1">د.أ</span>
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
                <Line type="monotone" dataKey="revenue" name="الإيرادات" stroke="var(--color-primary-500)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="cost" name="التكلفة" stroke="var(--color-warning-500)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="profit" name="الربح الصافي" stroke="var(--color-success-500)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
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
            <p>لا توجد بيانات كافية لهذه الفترة بعد</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}