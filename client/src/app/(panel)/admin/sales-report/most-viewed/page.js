"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Eye,
  TrendingUp,
  Package,
  RefreshCw,
  LayoutList,
} from "lucide-react";
import ReportExportMenu from "@/components/admin/common/ReportExportMenu";
import PageHeader from "@/components/admin/layout/PageHeader";
import MostViewedItems from "@/components/admin/sales/MostViewedItems";
import { getMostViewedProducts } from "@/services/productService";
import { getPaginationRange } from "@/utils/pagination";
import { downloadCsvReport, downloadPdfReport } from "@/utils/reportExport";

const LIMIT_OPTIONS = [5, 10, 25];
const PERIOD_OPTIONS = ["overall", "weekly", "monthly", "yearly"];

const getPeriodDateRangeLabel = (period) => {
  if (period === "overall") return "All time";

  const end = new Date();
  const start = new Date(end);

  if (period === "monthly") {
    start.setDate(start.getDate() - 27);
  } else if (period === "yearly") {
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
  } else {
    start.setDate(start.getDate() - 6);
  }

  const formatOptions =
    period === "yearly"
      ? { month: "short", year: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" };

  return `${start.toLocaleDateString("en-US", formatOptions)} - ${end.toLocaleDateString("en-US", formatOptions)}`;
};

export default function MostViewedPage() {
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [period, setPeriod] = useState("overall");

  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState({
    totalViews: 0,
    topProduct: "-",
    topCategory: "-",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMostViewedProducts(25, period);
      setAllItems(data);

      const totalViews = data.reduce((sum, p) => sum + (p.views || 0), 0);
      const categoryMap = data.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + p.views;
        return acc;
      }, {});
      const topCategory =
        Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

      setStats({ totalViews, topProduct: data[0]?.name || "-", topCategory });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const limitFromUrl = parseInt(params.get("limit")) || 10;
    const pageFromUrl = parseInt(params.get("page")) || 1;
    const periodFromUrl = params.get("period") || "overall";

    setLimit(LIMIT_OPTIONS.includes(limitFromUrl) ? limitFromUrl : 10);
    setCurrentPage(pageFromUrl);
    setPeriod(
      PERIOD_OPTIONS.includes(periodFromUrl) ? periodFromUrl : "overall",
    );
  }, []);

  const syncUrl = (newLimit, newPage, newPeriod = period) => {
    const params = new URLSearchParams(window.location.search);
    params.set("limit", String(newLimit));
    params.set("page", String(newPage));
    params.set("period", newPeriod);
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`,
    );
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setCurrentPage(1);
    syncUrl(newLimit, 1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    syncUrl(limit, newPage);
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    setCurrentPage(1);
    syncUrl(limit, 1, newPeriod);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(allItems.length / limit);
  const paginatedItems = allItems.slice(
    (currentPage - 1) * limit,
    currentPage * limit,
  );

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await downloadPdfReport({
        filename: `most_viewed_${period}_${new Date().toISOString().split("T")[0]}`,
        title: "Most Viewed Products Report",
        meta: [
          `Period: ${period}`,
          `Date Range: ${getPeriodDateRangeLabel(period)}`,
          `Generated on: ${new Date().toLocaleString()}`,
        ],
        columns: [
          { key: "name", label: "Product" },
          { key: "category", label: "Category" },
          { key: "views", label: "Views" },
        ],
        rows: allItems.map((item) => ({
          name: item.name || "-",
          category: item.category || "-",
          views: (item.views || 0).toLocaleString("en-IN"),
        })),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      downloadCsvReport({
        filename: `most_viewed_${period}_${new Date().toISOString().split("T")[0]}`,
        columns: [
          { key: "name", label: "Product" },
          { key: "category", label: "Category" },
          { key: "views", label: "Views" },
        ],
        rows: allItems.map((item) => ({
          name: item.name || "-",
          category: item.category || "-",
          views: item.views || 0,
        })),
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen w-full animate-in fade-in duration-500">
      <PageHeader
        title="Most Viewed Products"
        subtitle={`${period.charAt(0).toUpperCase() + period.slice(1)} product views`}
        action={
          <div className="flex items-center gap-2">
            <ReportExportMenu
              disabled={loading || allItems.length === 0}
              busy={isExporting}
              onExportPdf={handleExportPdf}
              onExportExcel={handleExportExcel}
            />
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Showing"
          value={`Top ${limit}`}
          icon={<LayoutList size={20} />}
          color="indigo"
          isText
        />
        <StatCard
          title="Total Views"
          value={stats.totalViews.toLocaleString()}
          icon={<Eye size={20} />}
          color="emerald"
        />
        <StatCard
          title="Most Viewed"
          value={stats.topProduct}
          icon={<TrendingUp size={20} />}
          color="amber"
          isText
        />
        <StatCard
          title="Top Category"
          value={stats.topCategory}
          icon={<Package size={20} />}
          color="blue"
          isText
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => handlePeriodChange(option)}
            className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
              period === option
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mb-6 inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
        Date Range: {getPeriodDateRangeLabel(period)}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <MostViewedItems
          items={paginatedItems}
          loading={loading}
          error={error}
        />

        {!loading && !error && allItems.length > 0 && (
          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Rows
              </span>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="text-xs font-black text-slate-900 bg-transparent outline-none cursor-pointer"
              >
                {LIMIT_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              {getPaginationRange(currentPage, totalPages).map((page, i) =>
                page === "..." ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="h-9 min-w-[36px] flex items-center justify-center text-xs font-black text-slate-400"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`h-9 min-w-[36px] cursor-pointer rounded-xl text-xs font-black transition-all ${
                      currentPage === page
                        ? "bg-slate-900 text-white shadow-lg"
                        : "bg-white border border-slate-200 text-slate-500 hover:border-slate-400"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, isText = false }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };

  return (
    <div className="bg-white p-5 border border-slate-200 rounded-xl flex items-center gap-4 hover:shadow-md transition-shadow duration-300">
      <div className={`p-3 rounded-lg border flex-shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
          {title}
        </p>
        <p
          className={`font-black text-slate-900 mt-1.5 leading-none truncate ${isText ? "text-sm" : "text-2xl"}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
