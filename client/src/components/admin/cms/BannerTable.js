"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Edit3,
  Trash2,
  Search,
  RefreshCw,
  ImageIcon,
  GripVertical,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import BannerModal from "./BannerModal";
import DeleteConfirmModal from "../common/DeleteConfirmModal";

import { getBanners, deleteBanner, reorderBanners } from "@/services/bannerService";

function SortableBannerRow({ banner, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <tr ref={setNodeRef} style={style} {...attributes} className="hover:bg-slate-50/80 transition-colors bg-white"><td className="px-4 py-3 text-slate-500 font-medium text-center touch-none">
      <button {...listeners} className="cursor-grab p-2 hover:bg-slate-200 rounded-lg">
        <GripVertical size={16} />
      </button>
    </td><td className="px-4 py-4">
        <div className="flex gap-2">
          {banner.image?.desktop?.url && (
            <div className="w-16 h-10 mx-auto rounded-lg bg-slate-100 border border-slate-200 overflow-hidden">
              <img
                src={banner.image.desktop.url}
                alt="desktop"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {banner.image?.mobile?.url && (
            <div className="w-10 h-10 mx-auto rounded-lg bg-slate-100 border border-slate-200 overflow-hidden">
              <img
                src={banner.image.mobile.url}
                alt="mobile"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </td><td className="px-4 py-4 font-bold text-slate-900">
        <div className="flex flex-col">
          <span>{banner.title}</span>
          <span className="text-[10px] text-slate-400 font-normal truncate max-w-[200px]">{banner.link}</span>
        </div>
      </td><td className="px-4 py-4 text-xs text-slate-600">
        <div className="flex flex-col gap-1">
          <span>
            Start: {banner.startsAt ? new Date(banner.startsAt).toLocaleDateString() : "Immediate"}
          </span>
          <span>
            End: {banner.expiresAt ? new Date(banner.expiresAt).toLocaleDateString() : "No expiry"}
          </span>
        </div>
      </td><td className="px-4 py-4">
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${banner.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
            }`}
        >
          {banner.status}
        </span>
      </td><td className="px-4 py-4 text-right">
        <div className="flex justify-end gap-4 text-slate-400">
          <button
            title="Edit"
            className="hover:text-blue-600 transition-colors cursor-pointer"
            onClick={() => onEdit(banner)}
          >
            <Edit3 size={18} />
          </button>
          <button
            title="Delete"
            className="hover:text-rose-600 transition-colors cursor-pointer"
            onClick={() => onDelete(banner)}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td></tr>
  );
}

export default function BannerTable({ refreshStats }) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchBanners = async (isRefresh = false) => {
    setLoading(true);
    try {
      const res = await getBanners(1, 100, "");
      if (res.success) {
        setBanners(res.data.banners || []);
        if (refreshStats) refreshStats();
        if (isRefresh) toast.success("Data synchronized!");
      }
    } catch (err) {
      toast.error("Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleDeleteConfirm = async () => {
    const loadingToast = toast.loading("Deleting banner...");
    try {
      const res = await deleteBanner(deleteId);
      if (res.success) {
        fetchBanners();
        toast.success("Banner deleted successfully", { id: loadingToast });
      }
    } catch (err) {
      toast.error("Failed to delete", { id: loadingToast });
    } finally {
      setDeleteId(null);
      setShowDeleteModal(false);
    }
  };

  const filteredBanners = useMemo(() => {
    return (Array.isArray(banners) ? banners : []).filter((b) => {
      const searchMatch =
        b.title?.toLowerCase().includes(search.toLowerCase()) || b.link?.toLowerCase().includes(search.toLowerCase());
      const statusMatch = statusFilter === "All" || b.status === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [banners, search, statusFilter]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = banners.findIndex((b) => b._id === active.id);
      const newIndex = banners.findIndex((b) => b._id === over.id);

      const newOrder = arrayMove(banners, oldIndex, newIndex);
      setBanners(newOrder);

      const orderedIds = newOrder.map((b) => b._id);
      const reorderPromise = reorderBanners(orderedIds);

      toast.promise(reorderPromise, {
        loading: "Saving new order...",
        success: "Order saved!",
        error: (err) => {
          fetchBanners();
          return err.message || "Failed to save order.";
        },
      });
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm text-slate-900 overflow-hidden">
      <div className="p-4 flex justify-between items-center gap-4 border-b border-slate-100">
        <div className="flex gap-3 flex-1 items-center">
          <div className="relative max-w-md w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-200 outline-none"
              placeholder="Search banners..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="border border-slate-300 rounded px-3 py-2 text-sm font-bold text-slate-700 bg-white outline-none cursor-pointer hover:border-slate-400 transition-colors"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button
            onClick={() => fetchBanners(true)}
            disabled={loading}
            className="p-2 text-slate-500 cursor-pointer hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <button
          onClick={() => {
            setEditData(null);
            setShowModal(true);
          }}
          className="bg-slate-900 hover:bg-black cursor-pointer text-white px-5 py-2 rounded text-sm font-bold transition-all shadow-sm active:scale-95"
        >
          + Add Banner
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr><th className="px-4 py-4 w-12 text-center"></th><th className="px-4 py-4 w-40 text-center">Images</th><th className="px-4 py-4">Banner Title</th><th className="px-4 py-4">Schedule</th><th className="px-4 py-4">Status</th><th className="px-4 py-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <SortableContext items={banners.map((b) => b._id)} strategy={verticalListSortingStrategy}>
                {filteredBanners.length > 0 ? (
                  filteredBanners.map((b) => (
                    <SortableBannerRow
                      key={b._id}
                      banner={b}
                      onEdit={(banner) => {
                        setEditData(banner);
                        setShowModal(true);
                      }}
                      onDelete={(banner) => {
                        setDeleteId(banner._id);
                        setDeleteName(banner.title);
                        setShowDeleteModal(true);
                      }}
                    />
                  ))
                ) : (
                  <tr><td colSpan="6" className="px-4 py-20 text-center text-slate-500 font-medium italic">
                    {loading ? "Syncing data..." : "No banners found."}
                  </td></tr>
                )}
              </SortableContext>
            </tbody>
          </table>
        </div>
      </DndContext>

      <BannerModal isOpen={showModal} onClose={() => setShowModal(false)} onSuccess={fetchBanners} initialData={editData} />
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        entityName="banner"
        itemName={deleteName}
      />
    </div>
  );
}
