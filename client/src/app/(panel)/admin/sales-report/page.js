"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, ShoppingBag, BarChart2, ShoppingCart } from "lucide-react";
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
  const [fetchError, setFetchError] = useState(null);
  const { items, loading: mostViewedLoading } = useMostViewed(10);
  const [filters, setFilters] = useState([]);

  // ── Best-selling products ──────────────────────────────────────
  useEffect(() => {
    getBestSellingItems({ limit: 5 })
      .then((res) => setBestSellingProducts(res.data || []))
      .catch((err) => setFetchError(err.message));
  }, []);

  const bestSellingByUnits = useMemo(
    () =>
      [...bestSellingProducts].sort(
        (a, b) =>
          (b.unitsSold || 0) - (a.unitsSold || 0) ||
          (b.totalRevenue || 0) - (a.totalRevenue || 0),
      ),
    [bestSellingProducts],
  );

  // ── Order stats → StatsRow ─────────────────────────────────────
  useEffect(() => {
    getOrderStats().then((order) => {
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
          value: formatCurrency(totalRevenue > 0 ? totalRevenue / totalOrders : 0),
          change: "10%",
          trend: "up",
          icon: BarChart2,
          accentColor: "bg-amber-500/10 text-amber-600",
        },
        {
          label: "Abandoned Cart Rate",
          value: "—", // populated after abandonedCarts loads
          change: "",
          trend: "down",
          icon: ShoppingCart,
          accentColor: "bg-indigo-500/10 text-indigo-600",
        },
      ]);
    });
  }, []);

  // ── Abandoned carts ────────────────────────────────────────────
  useEffect(() => {
    getAbandonedCarts(20)
      .then((res) => {
        if (res.success) setAbandonedCarts(res.data);
      })
      .catch(() => {}); // non-fatal; component shows empty state
  }, []);

  // ── Recovery email handler (passed to AbandonedCarts) ──────────
  const handleFiltersChange = (filter) => {
    console.log(filter);
    setFilters(filter);
  };

  return (
    <main className="flex-1 px-4 lg:px-10 max-w-350 mx-auto w-full">
      <StatsRow stats={stats} />

      {/* <FiltersBar period={period} onApply={handleFiltersChange} onPeriodChange={setPeriod} /> */}

      <SalesRevenueChart period={period} />

      <br />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <BestSellingProducts
          products={bestSellingByUnits}
          error={fetchError}
        />
        <MostViewedItems items={mostViewedLoading ? [] : items} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <TrafficSources sources={MOCK_TRAFFIC_SOURCES} />
        <AbandonedCarts carts={abandonedCarts} />
      </div>
    </main>
  );
}
