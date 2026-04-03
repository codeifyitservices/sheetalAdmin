"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  ShoppingBag,
  BarChart2,
  ShoppingCart,
} from "lucide-react";
import ReportExportMenu from "@/components/admin/common/ReportExportMenu";
import SalesPageHeader from "@/components/admin/sales/SalesPageHeader";
import AbandonedCarts from "@/components/admin/sales/AbandonedCarts";
import BestSellingProducts from "@/components/admin/sales/BestSellingProducts";
import FiltersBar from "@/components/admin/sales/FiltersBar";
import MostViewedItems from "@/components/admin/sales/MostViewedItems";
import SalesRevenueChart from "@/components/admin/layout/SalesRevenueChart";
import StatsRow from "@/components/admin/sales/StatsRow";
import TrafficSources from "@/components/admin/sales/TrafficSource";

import {
  getBestSellingItems,
  getAbandonedCarts,
} from "@/services/salesService";
import { getOrderStats } from "@/services/orderService";
import { useMostViewed } from "@/hooks/useMostViewed";
import SalesTrendsChart from "@/components/admin/sales/SalesPageHeader";
import { downloadCsvReport, downloadPdfReport } from "@/utils/reportExport";

const MOCK_TRAFFIC_SOURCES = [
  { label: "Direct", percentage: 45, color: "bg-primary" },
  { label: "Search", percentage: 30, color: "bg-emerald-500" },
  { label: "Social", percentage: 15, color: "bg-amber-500" },
  { label: "Referral", percentage: 10, color: "bg-slate-300" },
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

export default function SalesPage() {
  const [bestSellingProducts, setBestSellingProducts] = useState([]);
  const [stats, setStats] = useState([]);
  const [abandonedCarts, setAbandonedCarts] = useState([]);
  const [period, setPeriod] = useState("weekly");
  const [chartExportData, setChartExportData] = useState({
    period: "weekly",
    refDate: null,
    data: [],
    totals: { sales: 0, revenue: 0 },
    loading: true,
    error: null,
  });
  const [fetchError, setFetchError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const selectedPeriod = chartExportData.period || period;
  const selectedRefDate = chartExportData.refDate;
  const { items, loading: mostViewedLoading } = useMostViewed(
    5,
    selectedPeriod,
    selectedRefDate,
  );
  const [filters, setFilters] = useState([]);

  const getPeriodRange = (selectedPeriodValue, refDateValue) => {
    const end = refDateValue ? new Date(refDateValue) : new Date();
    const start = new Date(end);

    if (selectedPeriodValue === "monthly") {
      start.setDate(start.getDate() - 27);
    } else if (selectedPeriodValue === "yearly") {
      start.setMonth(start.getMonth() - 11);
      start.setDate(1);
    } else {
      start.setDate(start.getDate() - 6);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { startDate: start, endDate: end };
  };

  useEffect(() => {
    getBestSellingItems({
      limit: 5,
      period: selectedPeriod,
      refDate: selectedRefDate,
    })
      .then((res) => setBestSellingProducts(res.data || []))
      .catch((err) => setFetchError(err.message));
  }, [selectedPeriod, selectedRefDate]);

  const bestSellingByUnits = useMemo(
    () =>
      [...bestSellingProducts]
        .filter(
          (product) =>
            product &&
            product.productId &&
            product.name &&
            product.totalRevenue != null,
        )
        .sort(
          (a, b) =>
            (b.unitsSold || 0) - (a.unitsSold || 0) ||
            (b.totalRevenue || 0) - (a.totalRevenue || 0),
        ),
    [bestSellingProducts],
  );

  useEffect(() => {
    const range = getPeriodRange(selectedPeriod, selectedRefDate);
    getOrderStats(
      range.startDate.toISOString().split("T")[0],
      range.endDate.toISOString().split("T")[0],
    ).then((order) => {
      if (!order.success) return;
      const { totalRevenue, totalOrders } = order.data;
      setStats([
        {
          label: "Total Sales",
          value: formatCurrency(totalRevenue),
          change: "12%",
          trend: "up",
          icon: CreditCard,
          accentColor: "bg-primary/10 text-black",
        },
        {
          label: "Total Orders",
          value: totalOrders,
          change: "15%",
          trend: "up",
          icon: ShoppingBag,
          accentColor: "bg-emerald-500/10 text-emerald-600",
        },
        {
          label: "Average Order Value",
          value: formatCurrency(
            totalRevenue > 0 ? totalRevenue / totalOrders : 0,
          ),
          change: "10%",
          trend: "up",
          icon: BarChart2,
          accentColor: "bg-amber-500/10 text-amber-600",
        },
        {
          label: "Open Abandoned Carts",
          value: abandonedCarts.length,
          change: "",
          trend: "down",
          icon: ShoppingCart,
          accentColor: "bg-indigo-500/10 text-indigo-600",
        },
      ]);
    });
  }, [selectedPeriod, selectedRefDate, abandonedCarts.length]);

  useEffect(() => {
    getAbandonedCarts(20)
      .then((res) => {
        if (res.success) setAbandonedCarts(res.data);
      })
      .catch(() => {});
  }, []);

  const handleFiltersChange = (filter) => {
    console.log(filter);
    setFilters(filter);
  };

  const getDateRangeLabel = () => {
    const { startDate, endDate } = getPeriodRange(
      selectedPeriod,
      selectedRefDate,
    );
    const formatOptions =
      selectedPeriod === "yearly"
        ? { month: "short", year: "numeric" }
        : { month: "short", day: "numeric", year: "numeric" };

    return `${startDate.toLocaleDateString("en-US", formatOptions)} - ${endDate.toLocaleDateString("en-US", formatOptions)}`;
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const columns = [
        { key: "section", label: "Section" },
        { key: "name", label: "Name" },
        { key: "value1", label: "Value 1" },
        { key: "value2", label: "Value 2" },
      ];
      const rows = [
        ...stats.map((stat) => ({
          section: "Overview",
          name: stat.label,
          value1: String(stat.value ?? "-"),
          value2: stat.change || "-",
        })),
        ...bestSellingByUnits.map((product) => ({
          section: "Best Selling",
          name: product.name || "-",
          value1: (product.unitsSold || 0).toLocaleString("en-IN"),
          value2: `Rs. ${(product.totalRevenue || 0).toLocaleString("en-IN")}`,
        })),
        ...items.map((item) => ({
          section: "Most Viewed",
          name: item.name || "-",
          value1: item.category || "-",
          value2: (item.views || 0).toLocaleString("en-IN"),
        })),
      ];

      await downloadPdfReport({
        filename: `sales_report_${selectedPeriod}_${new Date().toISOString().split("T")[0]}`,
        title: "Sales Report",
        meta: [
          `Period: ${selectedPeriod}`,
          `Date Range: ${getDateRangeLabel()}`,
          `Generated on: ${new Date().toLocaleString()}`,
        ],
        columns,
        rows,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      const rows = [
        ...stats.map((stat) => ({
          Section: "Overview",
          Name: stat.label,
          "Value 1": String(stat.value ?? "-"),
          "Value 2": stat.change || "-",
        })),
        ...bestSellingByUnits.map((product) => ({
          Section: "Best Selling",
          Name: product.name || "-",
          "Value 1": product.unitsSold || 0,
          "Value 2": product.totalRevenue || 0,
        })),
        ...items.map((item) => ({
          Section: "Most Viewed",
          Name: item.name || "-",
          "Value 1": item.category || "-",
          "Value 2": item.views || 0,
        })),
      ];

      downloadCsvReport({
        filename: `sales_report_${selectedPeriod}_${new Date().toISOString().split("T")[0]}`,
        columns: [
          { key: "Section", label: "Section" },
          { key: "Name", label: "Name" },
          { key: "Value 1", label: "Value 1" },
          { key: "Value 2", label: "Value 2" },
        ],
        rows,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="flex-1 px-4 lg:px-10 max-w-350 mx-auto w-full">
      <div className="mb-6 flex items-center justify-end">
        <ReportExportMenu
          busy={isExporting}
          onExportPdf={handleDownloadPdf}
          onExportExcel={handleDownloadExcel}
        />
      </div>

      <StatsRow stats={stats} />

      {/* <FiltersBar period={period} onApply={handleFiltersChange} onPeriodChange={setPeriod} /> */}

      <SalesRevenueChart
        onPeriodChange={setPeriod}
        onDataChange={setChartExportData}
      />

      <br />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <BestSellingProducts products={bestSellingByUnits} error={fetchError} />
        <MostViewedItems items={mostViewedLoading ? [] : items} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <TrafficSources sources={MOCK_TRAFFIC_SOURCES} />
        <AbandonedCarts carts={abandonedCarts} />
      </div>
    </main>
  );
}
