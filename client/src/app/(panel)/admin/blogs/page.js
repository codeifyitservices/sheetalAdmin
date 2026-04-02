"use client";

import { useState, useEffect, useCallback } from "react";
import { Newspaper, Eye, CheckCircle2, FileEdit } from "lucide-react";
import BlogTable from "@/components/admin/blog/BlogTable";
import PageHeader from "@/components/admin/layout/PageHeader";
import { getBlogStats } from "@/services/blogService";

export default function BlogsPage() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    published: 0,
    totalViews: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await getBlogStats();
      if (res.success) {
        setStats({
          total: res.data.total || 0,
          active: res.data.active || 0,
          published: res.data.published || 0,
          totalViews: res.data.totalViews || 0,
        });
      }
    } catch (err) {
      console.error("Error fetching blog stats:", err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="min-h-screen w-full animate-in fade-in duration-500">
      <PageHeader
        title="Blog Management"
        subtitle="Create, edit and manage your blog posts and articles"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Blogs"
          count={stats.total}
          icon={<Newspaper size={20} />}
          color="indigo"
        />
        <StatCard
          title="Active Status"
          count={stats.active}
          icon={<FileEdit size={20} />}
          color="amber"
        />
        
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <BlogTable refreshStats={fetchStats} />
      </div>
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
    <div className="bg-white p-5 border border-slate-200 rounded-xl flex items-center gap-4 hover:shadow-md transition-shadow duration-300">
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
