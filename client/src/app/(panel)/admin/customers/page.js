"use client";

import { useState, useEffect } from "react";
import CustomerTable from "@/components/admin/customer/CustomerTable";
import PageHeader from "@/components/admin/layout/PageHeader";
import { Users, UserCheck, UserMinus, Clock } from "lucide-react";
import { getUserStats } from "@/services/userService";

export default function CustomersPage() {
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    today: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getUserStats(dateRange.startDate, dateRange.endDate);
        if (res.success) setStats(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchStats();
  }, [dateRange.endDate, dateRange.startDate]);

  return (
    <div className="min-h-screen w-full animate-in fade-in duration-500">
      <PageHeader
        title="Customer Management"
        subtitle="View and manage your organization's customer database"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Customers"
          count={stats.total}
          icon={<Users size={20} />}
          color="indigo"
        />
        <StatCard
          title="Active Now"
          count={stats.active}
          icon={<UserCheck size={20} />}
          color="emerald"
        />
        <StatCard
          title="Inactive"
          count={stats.inactive}
          icon={<UserMinus size={20} />}
          color="slate"
        />
        <StatCard
          title="New Today"
          count={stats.today}
          icon={<Clock size={20} />}
          color="amber"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <CustomerTable
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>
    </div>
  );
}

function StatCard({ title, count, icon, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
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
