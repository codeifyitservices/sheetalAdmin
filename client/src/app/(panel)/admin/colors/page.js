"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import PageHeader from "@/components/admin/layout/PageHeader";
import AdminStatCard from "@/components/admin/common/AdminStatCard";
import {
  Palette,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2,
  Check,
} from "lucide-react";
import {
  getColors,
  createColor,
  updateColor,
  deleteColor,
} from "@/services/productService";

export default function ColorsPage() {
  const [colors, setColors] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#4f46e5");

  // Fetch Colors
  const fetchColors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getColors();
      if (res.success) {
        setColors(res.data || []);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load colors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchColors();
  }, [fetchColors]);

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditId(null);
    setName("");
    setHex("#4f46e5");
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (color) => {
    setEditId(color._id);
    setName(color.name);
    setHex(color.hex);
    setIsModalOpen(true);
  };

  // Save Color (Create/Update)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Color name is required");
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
      return toast.error("Invalid hex color code");
    }

    setActionLoading(true);
    try {
      let res;
      if (editId) {
        res = await updateColor(editId, { name: name.trim(), hex });
        if (res.success) {
          toast.success("Color updated successfully");
          setColors((prev) =>
            prev.map((c) => (c._id === editId ? res.data : c))
          );
        }
      } else {
        res = await createColor({ name: name.trim(), hex });
        if (res.success) {
          toast.success("Color created successfully");
          setColors((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error(err.message || "Operation failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Color
  const handleDelete = async (id, colorName) => {
    if (!confirm(`Are you sure you want to delete color "${colorName}"?`)) return;

    try {
      const res = await deleteColor(id);
      if (res.success) {
        toast.success("Color deleted successfully");
        setColors((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete color");
    }
  };

  // Filtered colors
  const filteredColors = colors.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full animate-in fade-in duration-500 pb-12">
      <PageHeader
        title="Color Catalog"
        subtitle="Manage centralized colors and hex codes for product variants"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <AdminStatCard
          title="Total Colors"
          count={colors.length}
          icon={<Palette size={20} className="text-indigo-600" />}
        />
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6 h-full bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm col-span-2 ">
        <div className="relative w-full sm:w-100">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            placeholder="Search colors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 placeholder-slate-400"
          />
        </div>

        <button
          onClick={handleOpenCreate}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4.5 py-2 rounded-lg text-sm shadow-sm hover:shadow transition-all"
        >
          <Plus size={16} />
          Add Color
        </button>
      </div>
      </div>



      {/* Main Catalog View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600 mb-3" size={32} />
          <span className="text-sm text-slate-500 font-medium">Loading color catalog...</span>
        </div>
      ) : filteredColors.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 text-center shadow-sm">
          <Palette className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-bold text-slate-800 mb-1">No Colors Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto px-4">
            {search
              ? `No matching colors found for "${search}". Try refining your query.`
              : "Start by adding colors to build your centralized catalog."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredColors.map((color) => (
            <div
              key={color._id}
              className="bg-white border border-slate-200 hover:border-indigo-500/30 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
            >
              {/* Swatch */}
              <div className="flex justify-between items-start mb-4.5">
                <div
                  className="w-11 h-11 rounded-full border border-slate-100 shadow-inner flex items-center justify-center relative overflow-hidden"
                  style={{ backgroundColor: color.hex }}
                >
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-white/10" />
                </div>

                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenEdit(color)}
                    className="p-1.5 hover:bg-slate-50 border border-slate-100 rounded-lg text-slate-600 hover:text-indigo-600 transition-colors shadow-sm bg-white"
                    title="Edit"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(color._id, color.name)}
                    className="p-1.5 hover:bg-red-50 border border-red-100 rounded-lg text-slate-600 hover:text-red-600 transition-colors shadow-sm bg-white"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Text Info */}
              <div>
                <h4 className="font-bold text-slate-800 text-sm truncate mb-0.5 leading-tight">
                  {color.name}
                </h4>
                <p className="font-mono text-xs text-slate-400 uppercase select-all">
                  {color.hex}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md mx-4 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-800 text-base">
                {editId ? "Edit Color Details" : "Create New Color"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Color Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mustard Yellow"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Hex Code & Picker
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="e.g. #FFD700"
                      value={hex}
                      onChange={(e) => setHex(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400"
                      required
                    />
                  </div>
                  <div className="relative w-10 h-10 border border-slate-200 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer">
                    <input
                      type="color"
                      value={hex}
                      onChange={(e) => setHex(e.target.value)}
                      className="absolute inset-0 w-full h-full scale-150 border-0 p-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-lg text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4.5 py-2 rounded-lg text-sm shadow-sm hover:shadow transition-all disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Check size={16} />
                  )}
                  Save Color
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
