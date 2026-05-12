"use client";

import { useState, useEffect, useCallback } from "react";
import { Newspaper, Eye, CheckCircle2, FileEdit } from "lucide-react";
import BlogTable from "@/components/admin/blog/BlogTable";
import AdminStatCard from "@/components/admin/common/AdminStatCard";
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
        <AdminStatCard
          title="Total Blogs"
          count={stats.total}
          icon={<Newspaper size={20} />}
        />
        <AdminStatCard
          title="Active Status"
          count={stats.active}
          icon={<FileEdit size={20} />}
        />
        
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <BlogTable refreshStats={fetchStats} />
      </div>
    </div>
  );
}
