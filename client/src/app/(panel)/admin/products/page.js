"use client";

import { useState, useEffect, useCallback } from "react";
import ProductTable from "@/components/admin/product/ProductTable";
import AdminStatCard from "@/components/admin/common/AdminStatCard";
import PageHeader from "@/components/admin/layout/PageHeader";
import { Box, CheckCircle2, AlertTriangle, ShoppingCart } from "lucide-react";
import { getProductStats } from "@/services/productService";
import LowStockNotification from "@/components/admin/product/LowStockNotification";

export default function ProductsPage() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    outOfStock: 0,
    lowStock: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await getProductStats();
      if (res.success) setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { 
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="min-h-screen w-full animate-in fade-in duration-500">
      <PageHeader
        title="Product Management"
        subtitle="Manage your inventory, prices, and product visibility"
      />


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminStatCard
          title="Total Products"
          count={stats.total}
          icon={<ShoppingCart size={20} />}
          color="indigo"
        />
        <AdminStatCard
          title="Active"
          count={stats.active}
          icon={<CheckCircle2 size={20} />}
          color="emerald"
        />
        {/* <StatCard
          title="Low Stock"
          count={stats.lowStock}
          icon={<AlertTriangle size={20} />}
          color="amber"
        />
        <StatCard
          title="Out of Stock"
          count={stats.outOfStock}
          icon={<Box size={20} />}
          color="rose"
        /> */}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <ProductTable refreshStats={fetchStats} />
      </div>
    </div>
  );
}

function StatCard({ title, count, icon, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  };

  return (
    <div className="bg-white p-5 border border-slate-200 rounded-xl flex items-center gap-4 hover:shadow-md transition-all duration-300">
      <div className={`p-3 rounded-lg border ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
          {title}
        </p>
        <p className="text-2xl font-black text-slate-900 mt-1.5 leading-none">
          {count.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
