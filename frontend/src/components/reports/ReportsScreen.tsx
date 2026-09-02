// src/components/reports/ReportsScreen.tsx
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "../../lib/ipcClient";
import { useIpcQuery } from "../../hooks/useIpcQuery";

type Period = "daily" | "weekly" | "monthly";

export function ReportsScreen() {
  const [period, setPeriod] = useState<Period>("daily");

  const trend = useIpcQuery(() => api().reports.getProfitTrend({ period }), [period]);
  const today = useIpcQuery(() => api().reports.getTodaySummary());

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-bold">التقارير والأرباح</h1>

      {/* بطاقات ملخص اليوم */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard label="مبيعات اليوم" value={today.data?.salesCount ?? "-"} />
        <SummaryCard label="الإيرادات" value={today.data?.revenue?.toFixed(2) ?? "-"} />
        <SummaryCard label="التكلفة" value={today.data?.cost?.toFixed(2) ?? "-"} />
        <SummaryCard
          label="الربح الصافي"
          value={today.data?.profit?.toFixed(2) ?? "-"}
          highlight
        />
      </div>

      {/* تبديل الفترة */}
      <div className="flex gap-2">
        {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-md px-4 py-2 text-sm ${
              period === p ? "bg-blue-600 text-white" : "border"
            }`}
          >
            {{ daily: "يومي", weekly: "أسبوعي", monthly: "شهري" }[p]}
          </button>
        ))}
      </div>

      {trend.isLoading && <p>جاري التحميل...</p>}
      {trend.error && <p className="text-red-600">{trend.error}</p>}

      {trend.data && trend.data.length > 0 ? (
        <div className="h-80 rounded-lg border p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="الإيرادات" stroke="#2563eb" />
              <Line type="monotone" dataKey="cost" name="التكلفة" stroke="#f97316" />
              <Line type="monotone" dataKey="profit" name="الربح الصافي" stroke="#16a34a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        !trend.isLoading && <p className="text-gray-400">لا توجد بيانات كافية لهذه الفترة بعد</p>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-green-600 bg-green-50" : ""}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
