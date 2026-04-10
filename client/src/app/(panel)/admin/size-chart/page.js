"use client";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/admin/layout/PageHeader";
import SizeChartEditModal from "@/components/admin/size-chart/SizeChartEditModal";
import HowToMeasureModal from "@/components/admin/size-chart/HowToMeasureModal";
import CreateChartModal from "@/components/admin/size-chart/CreateChartModal";
import { getSizeCharts, deleteSizeChart } from "@/services/sizeChartService";
import { getCategories } from "@/services/categoryService";
import {
  Edit,
  Trash2,
  Plus,
  Image as ImageIcon,
  LayoutList,
  Tag,
} from "lucide-react";
import { getApiImageUrl } from "@/services/api";
import toast from "react-hot-toast";

export default function SizeChartPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingChart, setEditingChart] = useState(null);
  const [measureChart, setMeasureChart] = useState(null);
  const [sizeCharts, setSizeCharts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const normalizeChartPayload = (payload) => {
    if (Array.isArray(payload?.charts)) return payload.charts;
    if (Array.isArray(payload)) return payload;
    if (payload && payload._id) return [payload];
    return [];
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [chartsRes, categoriesRes] = await Promise.all([
        getSizeCharts(),
        getCategories(1, 1000, ""),
      ]);
      setSizeCharts(normalizeChartPayload(chartsRes.data));
      setCategories(Array.isArray(categoriesRes.data?.categories) ? categoriesRes.data.categories : []);
    } catch (error) {
      console.error("Failed to fetch size chart data", error);
      toast.error("Failed to load size charts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const categoriesByChartId = useMemo(() => {
    const map = new Map();
    categories.forEach((category) => {
      const chartId = category.sizeChart?._id || category.sizeChart;
      if (!chartId) return;
      if (!map.has(chartId)) {
        map.set(chartId, []);
      }
      map.get(chartId).push(category);
    });
    return map;
  }, [categories]);

  const handleChartCreated = (newChart) => {
    setSizeCharts((prev) => [newChart, ...prev]);
    setIsCreateModalOpen(false);
    toast.success(`"${newChart.name}" chart created!`);
  };

  const handleChartUpdated = (updatedChart) => {
    setSizeCharts((prev) =>
      prev.map((chart) => (chart._id === updatedChart._id ? updatedChart : chart)),
    );
    setEditingChart(updatedChart);
    setMeasureChart((current) =>
      current?._id === updatedChart._id ? updatedChart : current,
    );
  };

  const handleDeleteChart = async (chartId) => {
    if (!confirm("Delete this size chart?")) return;
    try {
      await deleteSizeChart(chartId);
      await fetchData();
      toast.success("Size chart deleted.");
      if (editingChart?._id === chartId) setEditingChart(null);
      if (measureChart?._id === chartId) setMeasureChart(null);
    } catch (error) {
      console.error("Failed to delete chart", error);
      toast.error("Failed to delete size chart.");
    }
  };

  const handleMeasureUpdated = (updatedChart) => {
    setSizeCharts((prev) =>
      prev.map((chart) => (chart._id === updatedChart._id ? updatedChart : chart)),
    );
    setMeasureChart(updatedChart);
  };

  if (loading) {
    return <div className="p-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <PageHeader
        title="Size Charts"
        subtitle="Create and manage size charts for your products"
      />

      <div className="flex justify-end gap-4 mb-8">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="whitespace-nowrap cursor-pointer w-fit px-4 py-2 md:px-5 md:py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-[13px] md:text-sm shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>New Size Chart</span>
        </button>
      </div>

      {sizeCharts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <LayoutList size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No size charts yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sizeCharts.map((chart) => {
            const appliedCategories = categoriesByChartId.get(chart._id) || [];
            return (
              <div
                key={chart._id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                      <LayoutList size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                        {chart.name}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {chart.table?.length ?? 0} size
                        {(chart.table?.length ?? 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingChart(chart)}
                      className="p-1.5 cursor-pointer rounded-md hover:bg-indigo-50 text-indigo-500 hover:text-indigo-700 transition-colors"
                      title="Edit chart"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={() => setMeasureChart(chart)}
                      className="p-1.5 cursor-pointer rounded-md hover:bg-amber-50 text-amber-500 hover:text-amber-700 transition-colors"
                      title="How to measure"
                    >
                      <ImageIcon size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteChart(chart._id)}
                      className="p-1.5 cursor-pointer rounded-md hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                      title="Delete chart"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Applied Categories
                    </span>
                    <span className="text-[11px] font-semibold text-gray-700">
                      {appliedCategories.length}
                    </span>
                  </div>

                  {appliedCategories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {appliedCategories.slice(0, 4).map((category) => (
                        <span
                          key={category._id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          <Tag size={10} />
                          {category.name}
                        </span>
                      ))}
                      {appliedCategories.length > 4 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] bg-slate-50 text-slate-500 border border-slate-200">
                          +{appliedCategories.length - 4} more
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Not assigned to any category yet.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateChartModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleChartCreated}
      />

      {editingChart && (
        <SizeChartEditModal
          isOpen={!!editingChart}
          chart={editingChart}
          onClose={() => setEditingChart(null)}
          onChartUpdated={handleChartUpdated}
        />
      )}

      {measureChart && (
        <HowToMeasureModal
          isOpen={!!measureChart}
          onClose={() => setMeasureChart(null)}
          onSuccess={handleMeasureUpdated}
          currentImage={getApiImageUrl(measureChart.howToMeasureImage)}
          chartId={measureChart._id}
          chartName={measureChart.name}
        />
      )}
    </div>
  );
}
