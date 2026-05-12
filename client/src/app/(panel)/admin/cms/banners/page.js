"use client";

import { useState, useEffect, useCallback } from "react";
import BannerTable from "@/components/admin/cms/BannerTable";
import AdminStatCard from "@/components/admin/common/AdminStatCard";
import PageHeader from "@/components/admin/layout/PageHeader";
import { ImageIcon, CheckCircle2, XCircle, Monitor } from "lucide-react";
import { getBannerStats } from "@/services/bannerService";
import BannerModal from "@/components/admin/cms/BannerModal";

export default function BannersPage() {
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getBannerStats();
      if (res.success) setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="min-h-screen w-full animate-in fade-in duration-500 pb-10">
      <PageHeader
        title="Banner Management"
        subtitle="Control your homepage sliders"
        actionLabel="Add New Banner"
        onActionClick={() => setIsModalOpen(true)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 mt-8">
        <AdminStatCard
          title="Total Banners"
          count={stats.total}
          icon={<ImageIcon size={20} />}
          color="indigo"
        />
        <AdminStatCard
          title="Active"
          count={stats.active}
          icon={<CheckCircle2 size={20} />}
          color="emerald"
        />
        <AdminStatCard
          title="Inactive"
          count={stats.inactive}
          icon={<XCircle size={20} />}
          color="rose"
        />
        <AdminStatCard
          title="Live Status"
          count={stats.active > 0 ? "Live" : "No"}
          icon={<Monitor size={20} />}
          color="amber"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <BannerTable refreshStats={fetchStats} />
      </div>

      {isModalOpen && (
        <BannerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchStats}
        />
      )}
    </div>
  );
}

function StatCard({ title, count, icon, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };
  return (
    <div className="bg-white p-5 border border-slate-200 rounded-2xl flex items-center gap-4 hover:shadow-md transition-shadow duration-300">
      <div className={`p-3 rounded-xl border ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
          {title}
        </p>
        <p className="text-2xl font-black text-slate-900 mt-2 leading-none">
          {typeof count === "number" ? count.toLocaleString() : count}
        </p>
      </div>
    </div>
  );
}
