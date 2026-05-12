"use client";

import { useState, useEffect, useCallback } from "react";
import CategoryTable from "@/components/admin/category/CategoryTable";
import AdminStatCard from "@/components/admin/common/AdminStatCard";
import PageHeader from "@/components/admin/layout/PageHeader";
import { Layers, Box, CheckCircle2, XCircle } from "lucide-react";
import { getCategoryStats } from "@/services/categoryService";

export default function CategoriesPage() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    products: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await getCategoryStats();
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
        title="Category Management"
        subtitle="Manage categories, add new ones, and edit existing"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminStatCard
          title="Total Categories"
          count={stats.total}
          icon={<Layers size={20} />}
        />
        <AdminStatCard
          title="Active"
          count={stats.active}
          icon={<CheckCircle2 size={20} />}
        />
        <AdminStatCard
          title="Inactive"
          count={stats.inactive}
          icon={<XCircle size={20} />}
        />
        {/* <StatCard 
                    title="Linked Products" 
                    count={stats.products} 
                    icon={<Box size={20} />} 
                    color="amber" 
                /> */}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <CategoryTable refreshStats={fetchStats} />
      </div>
    </div>
  );
}
