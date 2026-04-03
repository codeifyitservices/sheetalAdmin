"use client";
import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getChartData } from "@/services/salesService";

const LINES = {
  sales: { color: "#6366f1", label: "Sales" },
  revenue: { color: "#94a3b8", label: "Revenue" },
};

const PERIODS = [
  { key: "weekly", label: "Week" },
  { key: "monthly", label: "Month" },
  { key: "yearly", label: "Year" },
];

const CustomTooltip = ({ active, payload, label, activeLine }) => {
  if (!active || !payload?.length) return null;
  const entry = payload.find((p) => p.dataKey === activeLine);
  if (!entry) return null;
  const cfg = LINES[activeLine];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[130px]">
      <p className="font-semibold text-slate-500 mb-2">{label}</p>
      <div className="flex items-center justify-between gap-4">
        <span
          className="flex items-center gap-1.5"
          style={{ color: cfg.color }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: cfg.color }}
          />
          {cfg.label}
        </span>
        <span className="font-bold text-slate-800">
          {activeLine === "revenue"
            ? `₹${entry.value.toLocaleString()}`
            : entry.value.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

function SkeletonChart() {
  return (
    <div className="h-[200px] flex items-end gap-2 px-2 animate-pulse">
      {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-slate-100 rounded-t-md"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

export default function SalesRevenueChart({ onPeriodChange, onDataChange }) {
  const [period, setPeriod] = useState("weekly");
  const [refDate, setRefDate] = useState(new Date());
  const [activeLine, setActiveLine] = useState("sales");
  const [chartData, setChartData] = useState([]);
  const [totals, setTotals] = useState({ sales: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handlePeriodChange = (p) => {
    setPeriod(p);
    setRefDate(new Date());
    onPeriodChange?.(p);
  };

  const handlePrev = () => {
    const d = new Date(refDate);
    if (period === "weekly") d.setDate(d.getDate() - 1);
    else if (period === "monthly") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setRefDate(d);
  };

  const handleNext = () => {
    const d = new Date(refDate);
    if (period === "weekly") d.setDate(d.getDate() + 1);
    else if (period === "monthly") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    
    // Cap at current date
    if (d > new Date()) setRefDate(new Date());
    else setRefDate(d);
  };

  const isAtLatest = refDate.toDateString() === new Date().toDateString() || refDate > new Date();

  const getDateRangeLabel = () => {
    const d2 = new Date(refDate);
    const d1 = new Date(refDate);
    if (period === "weekly") {
      d1.setDate(d1.getDate() - 6);
    } else if (period === "monthly") {
      d1.setDate(d1.getDate() - 27);
    } else if (period === "yearly") {
      d1.setMonth(d1.getMonth() - 11);
      d1.setDate(1);
    }
    
    if (period === "yearly") {
      return `${d1.toLocaleDateString("en-US", { month: "short", year: "numeric" })} - ${d2.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
    }
    return `${d1.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${d2.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getChartData({ period, refDate: refDate.toISOString() });
      if (res.success) {
        const raw = res.data || [];
        // Recharts needs ≥2 points to draw a line.
        // If there's only one entry, prepend a zero-value anchor so the
        // line rises from 0 up to the real data point.
        const padded =
          raw.length === 1
            ? [{ ...raw[0], name: "", sales: 0, revenue: 0 }, raw[0]]
            : raw;
        setChartData(padded);
        setTotals(res.totals || { sales: 0, revenue: 0 });
      } else {
        setError("Failed to load chart data");
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [period, refDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    onDataChange?.({
      period,
      refDate: refDate.toISOString(),
      data: chartData,
      totals,
      loading,
      error,
    });
  }, [chartData, error, loading, onDataChange, period, refDate, totals]);

  return (
    <div id="sales-revenue-chart-export" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-bold text-slate-900 text-base">
            Sales & Revenue Trends
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Comparative growth over the selected period
          </p>
        </div>

        {/* Date Selector + Period toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-200 shadow-sm rounded-lg p-0.5">
             <button onClick={handlePrev} className="p-1 cursor-pointer hover:bg-slate-50 rounded transition text-slate-400 hover:text-slate-700">
                <ChevronLeft size={16} strokeWidth={2.5} />
             </button>
             <span className="text-[11px] font-bold text-slate-600 px-1 min-w-[125px] text-center">
                {getDateRangeLabel()}
             </span>
             <button onClick={handleNext} disabled={isAtLatest} className="p-1 cursor-pointer hover:bg-slate-50 rounded transition text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-auto disabled:hover:bg-transparent">
                <ChevronRight size={16} strokeWidth={2.5} />
             </button>
          </div>

          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => handlePeriodChange(p.key)}
                className={`px-3 cursor-pointer py-1.5 rounded-md text-xs font-semibold transition-all ${
                  period === p.key
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Line selector + totals */}
      <div className="flex gap-1 mb-5 bg-slate-100 rounded-lg p-0.5 w-fit">
        {Object.entries(LINES).map(([key, cfg]) => {
          const isActive = activeLine === key;
          return (
            <button
              key={key}
              onClick={() => setActiveLine(key)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all select-none ${
                isActive
                  ? "bg-white shadow-sm text-slate-800"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: cfg.color,
                  opacity: isActive ? 1 : 0.4,
                }}
              />
              {cfg.label}
              {isActive && !loading && (
                <span className="font-bold" style={{ color: cfg.color }}>
                  {key === "revenue"
                    ? `₹${totals.revenue.toLocaleString()}`
                    : totals.sales.toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Chart body */}
      {error ? (
        <div className="h-[200px] flex items-center justify-center text-xs text-red-400 gap-2">
          <span>⚠</span> {error}
          <button
            onClick={fetchData}
            className="underline text-indigo-500 ml-1"
          >
            Retry
          </button>
        </div>
      ) : loading && chartData.length === 0 ? (
        <SkeletonChart />
      ) : chartData.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">
          No data for this period
        </div>
      ) : (
        <div className={`h-[200px] cursor-crosshair transition-opacity duration-300 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="#6366f1"
                    stopOpacity={activeLine === "sales" ? 0.18 : 0.04}
                  />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="revenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#94a3b8"
                    stopOpacity={activeLine === "revenue" ? 0.14 : 0.04}
                  />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              {/* One YAxis per metric so each scales independently */}
              <YAxis
                yAxisId="sales"
                orientation="left"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                }
                hide={activeLine !== "sales"}
              />
              <YAxis
                yAxisId="revenue"
                orientation="left"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`
                }
                hide={activeLine !== "revenue"}
              />
              <Tooltip content={<CustomTooltip activeLine={activeLine} />} />

              <Area
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke={LINES.revenue.color}
                strokeWidth={activeLine === "revenue" ? 2 : 1}
                strokeOpacity={activeLine === "revenue" ? 1 : 0.25}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={
                  activeLine === "revenue"
                    ? { r: 4, fill: LINES.revenue.color, strokeWidth: 0 }
                    : false
                }
              />
              <Area
                yAxisId="sales"
                type="monotone"
                dataKey="sales"
                stroke={LINES.sales.color}
                strokeWidth={activeLine === "sales" ? 2.5 : 1}
                strokeOpacity={activeLine === "sales" ? 1 : 0.25}
                fill="url(#salesGradient)"
                dot={false}
                activeDot={
                  activeLine === "sales"
                    ? { r: 5, fill: LINES.sales.color, strokeWidth: 0 }
                    : false
                }
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
