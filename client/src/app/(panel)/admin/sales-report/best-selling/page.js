"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingBag,
  TrendingUp,
  PackageCheck,
  IndianRupee,
  RefreshCw,
} from "lucide-react";
import ReportExportMenu from "@/components/admin/common/ReportExportMenu";
import PageHeader from "@/components/admin/layout/PageHeader";
import BestSellingProducts from "@/components/admin/sales/BestSellingProducts";
import { getBestSellingItems } from "@/services/salesService";
import { getPaginationRange } from "@/utils/pagination";
import { downloadCsvReport, downloadPdfReport } from "@/utils/reportExport";

const LIMIT_OPTIONS = [5, 10, 25];
const PERIOD_OPTIONS = ["overall", "weekly", "monthly", "yearly"];
const SORT_OPTIONS = [
  { value: "units", label: "By Units Sold", icon: PackageCheck },
  { value: "revenue", label: "By Revenue", icon: IndianRupee },
];

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

export default function BestSellingPage() {
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("units");
  const [period, setPeriod] = useState("overall");

  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalUnitsSold: 0,
    totalRevenue: 0,
    topProduct: "-",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getBestSellingItems({ period });
      const data = res.data || [];
      setAllProducts(data);

      setStats({
        totalProducts: data.length,
        totalUnitsSold: data.reduce((sum, p) => sum + (p.unitsSold || 0), 0),
        totalRevenue: data.reduce((sum, p) => sum + (p.totalRevenue || 0), 0),
        topProduct: data[0]?.name || "-",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const limitFromUrl = parseInt(params.get("limit")) || 5;
    const pageFromUrl = parseInt(params.get("page")) || 1;
    const sortFromUrl = params.get("sort") || "units";
    const periodFromUrl = params.get("period") || "overall";

    setLimit(LIMIT_OPTIONS.includes(limitFromUrl) ? limitFromUrl : 10);
    setCurrentPage(pageFromUrl);
    setSortBy(
      SORT_OPTIONS.some((option) => option.value === sortFromUrl)
        ? sortFromUrl
        : "units",
    );
    setPeriod(
      PERIOD_OPTIONS.includes(periodFromUrl) ? periodFromUrl : "overall",
    );
  }, []);

  const syncUrl = (
    newLimit,
    newPage,
    newSortBy = sortBy,
    newPeriod = period,
  ) => {
    const params = new URLSearchParams(window.location.search);
    params.set("limit", String(newLimit));
    params.set("page", String(newPage));
    params.set("sort", newSortBy);
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

  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
    setCurrentPage(1);
    syncUrl(limit, 1, newSortBy);
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    setCurrentPage(1);
    syncUrl(limit, 1, sortBy, newPeriod);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedProducts = [...allProducts].sort((a, b) => {
    if (sortBy === "units") {
      return (
        (b.unitsSold || 0) - (a.unitsSold || 0) ||
        (b.totalRevenue || 0) - (a.totalRevenue || 0)
      );
    }

    return (
      (b.totalRevenue || 0) - (a.totalRevenue || 0) ||
      (b.unitsSold || 0) - (a.unitsSold || 0)
    );
  });

  const totalPages = Math.ceil(sortedProducts.length / limit);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * limit,
    currentPage * limit,
  );
  const activeTopProduct = sortedProducts[0]?.name || "-";

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await downloadPdfReport({
        filename: `best_selling_${period}_${new Date().toISOString().split("T")[0]}`,
        title: "Best Selling Products Report",
        meta: [
          `Period: ${period}`,
          `Date Range: ${getPeriodDateRangeLabel(period)}`,
          `Generated on: ${new Date().toLocaleString()}`,
        ],
        columns: [
          { key: "name", label: "Product" },
          { key: "unitsSold", label: "Units Sold" },
          { key: "totalRevenue", label: "Revenue" },
        ],
        rows: sortedProducts.map((product) => ({
          name: product.name || "-",
          unitsSold: (product.unitsSold || 0).toLocaleString("en-IN"),
          totalRevenue: `Rs. ${(product.totalRevenue || 0).toLocaleString("en-IN")}`,
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
        filename: `best_selling_${period}_${new Date().toISOString().split("T")[0]}`,
        columns: [
          { key: "name", label: "Product" },
          { key: "unitsSold", label: "Units Sold" },
          { key: "totalRevenue", label: "Revenue" },
        ],
        rows: sortedProducts.map((product) => ({
          name: product.name || "-",
          unitsSold: product.unitsSold || 0,
          totalRevenue: product.totalRevenue || 0,
        })),
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen w-full animate-in fade-in duration-500">
      <PageHeader
        title="Best Selling Products"
        subtitle={`${period.charAt(0).toUpperCase() + period.slice(1)} ranking by units sold and revenue generated`}
        action={
          <div className="flex items-center gap-2">
            <ReportExportMenu
              disabled={loading || sortedProducts.length === 0}
              busy={isExporting}
              onExportPdf={handleExportPdf}
              onExportExcel={handleExportExcel}
            />
            <button
              onClick={fetchData}
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
          title="Total Products"
          value={stats.totalProducts}
          icon={<ShoppingBag size={20} />}
          color="indigo"
        />
        <StatCard
          title="Total Units Sold"
          value={stats.totalUnitsSold.toLocaleString()}
          icon={<PackageCheck size={20} />}
          color="emerald"
        />
        <StatCard
          title="Total Revenue"
          value={`Rs. ${stats.totalRevenue.toLocaleString()}`}
          icon={<IndianRupee size={20} />}
          color="amber"
        />
        <StatCard
          title="Top Product"
          value={activeTopProduct}
          icon={<TrendingUp size={20} />}
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

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Sort By
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = sortBy === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSortChange(option.value)}
                className={`cursor-pointer flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition-all active:scale-95 ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white shadow-md"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                }`}
              >
                <Icon size={14} />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <BestSellingProducts
          products={paginatedProducts}
          isLoading={loading}
          error={error}
        />

        {!loading && !error && allProducts.length > 0 && (
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
          className={`font-black text-slate-900 mt-1.5 leading-none truncate ${
            isText ? "text-sm" : "text-2xl"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
