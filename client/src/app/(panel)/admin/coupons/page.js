"use client";

import { useState, useEffect, useCallback } from "react";
import CouponTable from "@/components/admin/coupon/CouponTable";
import PageHeader from "@/components/admin/layout/PageHeader";
import { Ticket, Zap, Tag, Gift, Percent } from "lucide-react";
import { getCouponStats } from "@/services/couponService";

export default function CouponsPage() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalUsed: 0,
    totalSavings: 0,
    festiveSales: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await getCouponStats();
      if (res.success && res.data) {
        setStats({
          total: res.data.total || 0,
          active: res.data.active || 0,
          totalUsed: res.data.totalUsed || 0,
          totalSavings: res.data.totalSavings || 0,
          festiveSales: res.data.festiveSales || 0,
        });
      }
    } catch (err) {
      console.error("Failed to fetch coupon stats:", err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="min-h-screen w-full animate-in fade-in duration-500">
      <PageHeader
        title="Coupon Management"
        subtitle="Manage discount codes, BOGO offers, and festive sales"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total"
          count={stats.total}
          icon={<Ticket size={18} />}
          color="indigo"
        />
        <StatCard
          title="Active Now"
          count={stats.active}
          icon={<Zap size={18} />}
          color="emerald"
        />
        {/* <StatCard
          title="Festive/Auto"
          count={stats.festiveSales}
          icon={<Percent size={18} />}
          color="rose"
        />
        <StatCard
          title="Redemptions"
          count={stats.totalUsed}
          icon={<Tag size={18} />}
          color="slate"
        />
        <StatCard
          title="Savings"
          count={stats.totalSavings}
          icon={<Gift size={18} />}
          color="amber"
          isCurrency={true}
        /> */}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <CouponTable refreshStats={fetchStats} />
      </div>
    </div>
  );
}

function StatCard({ title, count, icon, color, isCurrency = false }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  };

  const safeCount = count ?? 0;

  return (
    <div className="bg-white p-5 border border-slate-200 rounded-2xl flex items-center gap-4 hover:shadow-lg hover:border-slate-300 transition-all duration-300 group">
      <div
        className={`p-3 rounded-xl border ${colors[color]} group-hover:scale-110 transition-transform duration-300`}
      >
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
          {title}
        </p>
        <p className="text-xl font-extrabold text-slate-800 mt-2 leading-none">
          {isCurrency
            ? `₹${safeCount.toLocaleString()}`
            : safeCount.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
