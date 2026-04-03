"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Mail,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import ReportExportMenu from "@/components/admin/common/ReportExportMenu";
import SalesRevenueChart from "@/components/admin/layout/SalesRevenueChart";
import BestSellingProducts from "@/components/admin/sales/BestSellingProducts";
import TopReviews from "@/components/admin/layout/TopReviews";
import { getDashboardStats } from "@/services/adminService";
import { getBestSellingItems, getChartData } from "@/services/salesService";
import { getAllOrders } from "@/services/orderService";
import { downloadCsvReport, downloadPdfReport } from "@/utils/reportExport";

const statusStyles = {
  Shipped: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Cancelled: "bg-red-100 text-red-700",
  Processing: "bg-blue-100 text-blue-700",
};

// Hoisted outside component — avoids recreating on every render
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatCurrency = (amount) => currencyFormatter.format(amount || 0);
const formatPdfCurrency = (amount) =>
  `Rs. ${Math.round(amount || 0).toLocaleString("en-IN")}`;

const formatReportDateLabel = (entry) => {
  if (entry?.date && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    const date = new Date(`${entry.date}T00:00:00`);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return String(entry?.name || entry?.date || "-");
};

const formatTimeAgo = (dateString) => {
  const diffInSeconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return new Date(dateString).toLocaleDateString();
};

const PERIOD_LABEL = {
  weekly: "This week",
  monthly: "This month",
  yearly: "This year",
};

const getPeriodRange = (selectedPeriod, refDateValue, offset = 0) => {
  const end = refDateValue ? new Date(refDateValue) : new Date();
  const start = new Date(end);

  if (selectedPeriod === "monthly") {
    end.setDate(end.getDate() - offset * 28);
    start.setTime(end.getTime());
    start.setDate(start.getDate() - 27);
  } else if (selectedPeriod === "yearly") {
    end.setMonth(end.getMonth() - offset * 12);
    start.setTime(end.getTime());
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
  } else {
    end.setDate(end.getDate() - offset * 7);
    start.setDate(start.getDate() - (offset * 7 + 6));
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return {
    startDate: start,
    endDate: end,
  };
};

const getTrendBadge = (current, previous) => {
  if (current == null || previous == null) return null;
  if (current === 0 && previous === 0) return null;
  if (previous === 0)
    return current > 0 ? { positive: true, label: "New" } : null;

  const delta = current - previous;
  if (delta === 0) return null;

  return {
    positive: delta > 0,
    label: `${delta > 0 ? "+" : "-"}${Math.abs((delta / previous) * 100).toFixed(1)}%`,
  };
};

const getReportDateRangeLabel = (selectedPeriod, refDateValue) => {
  const { startDate: start, endDate: end } = getPeriodRange(
    selectedPeriod,
    refDateValue,
  );

  if (selectedPeriod === "yearly") {
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })} - ${end.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })}`;
  }

  return `${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} - ${end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    newUsers: 0,
    totalOrders: 0,
    todayOrders: 0,
    totalProducts: 0,
    latestUsers: [],
    stockData: [],
  });
  const [bestSellingProducts, setBestSellingProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [period, setPeriod] = useState("weekly");
  const [chartTotals, setChartTotals] = useState({ sales: 0, revenue: 0 });
  const [previousTotals, setPreviousTotals] = useState({
    sales: 0,
    revenue: 0,
  });
  const [totalsLoading, setTotalsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [chartExportData, setChartExportData] = useState({
    period: "weekly",
    refDate: null,
    data: [],
    totals: { sales: 0, revenue: 0 },
    loading: true,
    error: null,
  });

  const generatePDFReport = async () => {
    setIsGeneratingPDF(true);
    try {
      const rows = [
        {
          section: "Key Metrics",
          name: "Total Sales",
          value1: formatPdfCurrency(chartTotals.revenue),
          value2: PERIOD_LABEL[period],
        },
        {
          section: "Key Metrics",
          name: "Total Orders",
          value1: chartTotals.sales.toLocaleString(),
          value2: PERIOD_LABEL[period],
        },
        {
          section: "Key Metrics",
          name: "New Users",
          value1: stats.newUsers?.toLocaleString() || "0",
          value2: "-",
        },
        {
          section: "Key Metrics",
          name: "Total Products",
          value1: stats.totalProducts?.toLocaleString() || "0",
          value2: "-",
        },
        ...(Array.isArray(chartExportData.data)
          ? chartExportData.data.map((entry) => ({
              section: "Sales Trend",
              name: formatReportDateLabel(entry),
              value1: (entry.sales ?? 0).toLocaleString("en-IN"),
              value2: formatPdfCurrency(entry.revenue),
            }))
          : []),
        ...visibleBestSellingProducts.map((product) => ({
          section: "Top Selling Products",
          name: product.name || "-",
          value1: product.unitsSold?.toString() || "0",
          value2: formatPdfCurrency(product.totalRevenue),
        })),
      ];

      await downloadPdfReport({
        filename: `Sales_Report_${new Date().toISOString().split("T")[0]}`,
        title: "Sales & Performance Report",
        meta: [
          `Generated on: ${new Date().toLocaleString()}`,
          `Period: ${PERIOD_LABEL[period]}`,
          `Date Range: ${getReportDateRangeLabel(
            chartExportData.period || period,
            chartExportData.refDate,
          )}`,
        ],
        columns: [
          { key: "section", label: "Section" },
          { key: "name", label: "Name" },
          { key: "value1", label: "Value 1" },
          { key: "value2", label: "Value 2" },
        ],
        rows,
      });
    } catch (err) {
      console.error("PDF Generation Error:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const generateExcelReport = async () => {
    setIsGeneratingPDF(true);
    try {
      const rows = [
        {
          Section: "Key Metrics",
          Name: "Total Sales",
          "Value 1": chartTotals.revenue,
          "Value 2": PERIOD_LABEL[period],
        },
        {
          Section: "Key Metrics",
          Name: "Total Orders",
          "Value 1": chartTotals.sales,
          "Value 2": PERIOD_LABEL[period],
        },
        {
          Section: "Key Metrics",
          Name: "New Users",
          "Value 1": stats.newUsers || 0,
          "Value 2": "-",
        },
        {
          Section: "Key Metrics",
          Name: "Total Products",
          "Value 1": stats.totalProducts || 0,
          "Value 2": "-",
        },
        ...(Array.isArray(chartExportData.data)
          ? chartExportData.data.map((entry) => ({
              Section: "Sales Trend",
              Name: formatReportDateLabel(entry),
              "Value 1": entry.sales ?? 0,
              "Value 2": entry.revenue ?? 0,
            }))
          : []),
        ...visibleBestSellingProducts.map((product) => ({
          Section: "Top Selling Products",
          Name: product.name || "-",
          "Value 1": product.unitsSold || 0,
          "Value 2": product.totalRevenue || 0,
        })),
      ];

      downloadCsvReport({
        filename: `Sales_Report_${new Date().toISOString().split("T")[0]}`,
        columns: [
          { key: "Section", label: "Section" },
          { key: "Name", label: "Name" },
          { key: "Value 1", label: "Value 1" },
          { key: "Value 2", label: "Value 2" },
        ],
        rows,
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getBestSellingItems({ limit: 5 });
        setBestSellingProducts(data);
      } catch (err) {
        console.error("Error fetching best selling items", err);
      }
    };
    fetch();
  }, []);

  const visibleBestSellingProducts = Array.isArray(bestSellingProducts?.data)
    ? bestSellingProducts.data.filter(
        (product) =>
          product &&
          product.productId &&
          product.name &&
          product.totalRevenue != null,
      )
    : [];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const { startDate, endDate } = getPeriodRange(
          chartExportData.period || period,
          chartExportData.refDate,
        );
        const res = await getDashboardStats(
          startDate.toISOString(),
          endDate.toISOString(),
        );
        if (res.success) setStats(res.data);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [chartExportData.period, chartExportData.refDate, period]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Only fetch 5 orders — that's all the dashboard table shows
        const res = await getAllOrders(1, 5);
        if (res.success) setOrders(res.data.orders);
      } catch (err) {
        console.error("Error fetching orders:", err);
      }
    };
    fetchOrders();
  }, []);

  // Refetch totals whenever period changes — drives the stat cards
  useEffect(() => {
    const fetchTotals = async () => {
      setTotalsLoading(true);
      try {
        const selectedPeriod = chartExportData.period || period;
        const refDate = chartExportData.refDate;
        const previousRange = getPeriodRange(selectedPeriod, refDate, 1);

        setChartTotals(chartExportData.totals || { sales: 0, revenue: 0 });

        const previousRes = await getChartData({
          period: selectedPeriod,
          startDate: previousRange.startDate.toISOString(),
          endDate: previousRange.endDate.toISOString(),
        });

        if (previousRes.success)
          setPreviousTotals(previousRes.totals || { sales: 0, revenue: 0 });
      } catch (err) {
        console.error("Error fetching chart totals:", err);
      } finally {
        setTotalsLoading(false);
      }
    };
    fetchTotals();
  }, [
    chartExportData.period,
    chartExportData.refDate,
    chartExportData.totals,
    period,
  ]);

  const salesTrend = getTrendBadge(chartTotals.revenue, previousTotals.revenue);
  const ordersTrend = getTrendBadge(chartTotals.sales, previousTotals.sales);

  const topStats = [
    {
      label: "Total Sales",
      val: totalsLoading ? "..." : formatCurrency(chartTotals.revenue),
      change: salesTrend ? salesTrend.label : PERIOD_LABEL[period],
      positive: salesTrend?.positive ?? true,
      showArrow: Boolean(salesTrend),
    },
    {
      label: "Total Orders",
      val: totalsLoading ? "..." : chartTotals.sales.toLocaleString(),
      change: ordersTrend ? ordersTrend.label : PERIOD_LABEL[period],
      positive: ordersTrend?.positive ?? true,
      showArrow: Boolean(ordersTrend),
    },
    {
      label: "New Users",
      val: loading ? "..." : stats.newUsers?.toLocaleString() || "0",
      change: "",
      positive: true,
      showArrow: false,
    },
    {
      label: "Total Products",
      val: loading ? "..." : stats.totalProducts?.toLocaleString() || "0",
      change: "",
      positive: true,
      showArrow: false,
    },
  ];

  return (
    <div className="min-h-screen w-full animate-in fade-in duration-500">
      <div className="max-w-400 mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Overview Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Visualizing performance metrics and customer trends.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ReportExportMenu
              busy={isGeneratingPDF}
              busyLabel="Exporting..."
              onExportPdf={generatePDFReport}
              onExportExcel={generateExcelReport}
              label="Export Report"
            />
          </div>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {topStats.map((stat, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm hover:shadow-md transition-all"
            >
              <p className="text-xs font-medium text-slate-400 mb-2">
                {stat.label}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-wide leading-none">
                  {stat.val}
                </h2>
                {stat.showArrow && stat.change ? (
                  <span
                    className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                      stat.positive
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-red-50 text-red-500"
                    }`}
                  >
                    {stat.positive ? <TrendingUp /> : <TrendingDown />}
                    {stat.change}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {/* Middle Row: Chart + New Users */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <div className="lg:col-span-2">
            <SalesRevenueChart
              onPeriodChange={setPeriod}
              onDataChange={setChartExportData}
            />
          </div>

          {/* New Users */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base">New Users</h3>
              <Link
                href="/admin/customers"
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {stats.latestUsers?.length > 0 ? (
                stats.latestUsers.slice(0, 5).map((user, i) => (
                  <div
                    key={user._id || i}
                    className="flex items-center gap-3 py-1.5"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center font-bold text-sm uppercase flex-shrink-0">
                      {user.name?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {user.name || "New Customer"}
                      </p>
                      <p className="text-xs text-slate-400">
                        Joined {formatTimeAgo(user.createdAt)}
                      </p>
                    </div>
                    <button className="text-slate-300 cursor-pointer hover:text-indigo-500 transition-colors">
                      <Mail size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-sm text-slate-400">
                  No new users in this date range
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row: Best Selling + Recent Orders + Top Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-10">
          <BestSellingProducts products={visibleBestSellingProducts} />

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 text-lg">
                Recent Orders
              </h3>
              <Link
                href="/admin/orders"
                className="text-sm font-semibold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
              >
                See all orders <ArrowRight size={14} />
              </Link>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Order ID", "Customer", "Amount", "Status"].map((h, i) => (
                    <th
                      key={h}
                      className={`pb-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest ${i > 1 ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders?.slice(0, 5).map((order) => (
                  <tr
                    key={order._id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-4 text-sm font-semibold text-indigo-500">
                      #{order._id.slice(-6)}
                    </td>
                    <td className="py-4 text-sm text-slate-700">
                      {order.user?.name}
                    </td>
                    <td className="py-4 text-right text-sm font-bold text-slate-800">
                      ₹{order.totalPrice}
                    </td>
                    <td className="py-4 text-right">
                      <span
                        className={`text-xs font-medium px-3 py-1 rounded-full ${statusStyles[order.orderStatus] || "bg-slate-100 text-slate-500"}`}
                      >
                        {order.orderStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="print:hidden">
          <TopReviews />
        </div>
      </div>
    </div>
  );
}
