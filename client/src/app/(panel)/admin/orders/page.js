"use client";

import { useState, useEffect } from "react";
import OrderTable from "@/components/admin/order/OrderTable";
import PageHeader from "@/components/admin/layout/PageHeader";
import {
  ShoppingBag,
  Truck,
  CheckCircle,
  AlertCircle,
  Clock,
  IndianRupee,
} from "lucide-react";
import { getOrderStats } from "@/services/orderService";

export default function OrdersPage() {
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [stats, setStats] = useState({
    totalOrders: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getOrderStats(dateRange.startDate, dateRange.endDate);
        if (res.success) setStats(res.data);
      } catch (err) {
        console.error("Error fetching order stats:", err);
      }
    };

    fetchStats();
  }, [dateRange.endDate, dateRange.startDate]);

  return (
    <div className="min-h-screen w-full animate-in fade-in duration-500">
      <PageHeader
        title="Order Management"
        subtitle="Track, manage and update customer orders and shipping status"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          count={stats.totalRevenue}
          icon={<IndianRupee size={20} />}
          color="indigo"
          isCurrency={true}
        />
        <StatCard
          title="Processing"
          count={stats.processing}
          icon={<Clock size={20} />}
          color="amber"
        />
        <StatCard
          title="In Transit"
          count={stats.shipped}
          icon={<Truck size={20} />}
          color="blue"
        />
        <StatCard
          title="Delivered"
          count={stats.delivered}
          icon={<CheckCircle size={20} />}
          color="emerald"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <OrderTable dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>
    </div>
  );
}

function StatCard({ title, count, icon, color, isCurrency = false }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  };

  return (
    <div className="bg-white p-5 border border-slate-200 rounded-xl flex items-center gap-4 hover:shadow-md transition-shadow duration-300">
      <div className={`p-3 rounded-lg border ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
          {title}
        </p>
        <p className="text-2xl font-black text-slate-900 mt-1.5 leading-none">
          {isCurrency ? `₹${count.toLocaleString()}` : count.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
