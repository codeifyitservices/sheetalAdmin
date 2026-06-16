"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Edit3,
  Trash2,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
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

import CategoryModal from "./CategoryModal";
import ViewCategoryDrawer from "./ViewCategoryDrawer";
import DeleteConfirmModal from "../common/DeleteConfirmModal";

import {
  getCategories,
  deleteCategory,
  reorderCategories,
} from "@/services/categoryService";
import { IMAGE_BASE_URL } from "@/services/api";

function SortableCategoryRow({ category, onEdit, onView, onDelete }) {
  // Removed index from props
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="hover:bg-slate-50/80 transition-colors bg-white"
    >
      <td className="px-4 py-3 text-slate-500 font-medium text-center touch-none">
        <button
          {...listeners}
          className="cursor-grab p-2 hover:bg-slate-200 rounded-lg"
        >
          <GripVertical size={16} />
        </button>
      </td>
      {/* Removed the serial number td */}
      <td className="px-4 py-3">
        <div
          className="w-10 h-10 mx-auto rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer"
          onClick={() => onView(category)}
        >
          {category.mainImage?.url ? (
            <img
              src={
                category.mainImage.url.startsWith("http")
                  ? category.mainImage.url
                  : `${IMAGE_BASE_URL}/${category.mainImage.url.replace(/\\/g, "/")}`.replace(
                    /([^:]\/)\/+/g,
                    "",
                  )
              }
              alt="Main"
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon size={16} className="text-slate-300" />
          )}
        </div>
      </td>
      <td className="px-4 py-3 font-bold text-slate-900">{category.name}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {category.subCategories && category.subCategories.length > 0 ? (
            <>
              {category.subCategories.slice(0, 3).map((sub, idx) => (
                <span
                  key={idx}
                  className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] border border-slate-200"
                >
                  {sub}
                </span>
              ))}
              {category.subCategories.length > 3 && (
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] border border-slate-200">
                  +{category.subCategories.length - 3}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400 text-xs">-</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1 text-[10px]">
          {category.productType?.length > 0 && <div className="truncate max-w-[150px]"><span className="font-bold text-indigo-600">Type:</span> {category.productType.join(", ")}</div>}
          {category.fabric?.length > 0 && <div className="truncate max-w-[150px]"><span className="font-bold text-teal-600">Fabric:</span> {category.fabric.join(", ")}</div>}
          {category.style?.length > 0 && <div className="truncate max-w-[150px]"><span className="font-bold text-orange-600">Style:</span> {category.style.join(", ")}</div>}
          {category.work?.length > 0 && <div className="truncate max-w-[150px]"><span className="font-bold text-rose-600">Work:</span> {category.work.join(", ")}</div>}
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${category.isActive !== false ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}
        >
          {category.isActive !== false ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-4 text-slate-400">
          <button
            title="Edit"
            className="hover:text-blue-600 cursor-pointer transition-colors"
            onClick={() => onEdit(category)}
          >
            <Edit3 size={18} />
          </button>
          <button
            title="Delete"
            className="hover:text-rose-600 cursor-pointer transition-colors"
            onClick={() => onDelete(category)}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function CategoryTable({ refreshStats }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [rowsPerPage, setRowsPerPage] = useState(50); // Default set to 50 as requested
  const [currentPage, setCurrentPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [viewCategory, setViewCategory] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchCategories = async (isRefresh = false) => {
    setLoading(true);
    try {
      // Fetch all categories to enable full reordering
      const res = await getCategories(1, 100, "");
      if (res.success) {
        setCategories(res.data.categories);
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
    fetchCategories();
  }, []);

  const handleDeleteConfirm = async () => {
    const loadingToast = toast.loading("Deleting category...");
    try {
      const res = await deleteCategory(deleteId);
      if (res.success) {
        fetchCategories();
        toast.success("Category deleted successfully", { id: loadingToast });
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete", { id: loadingToast });
    } finally {
      setDeleteId(null);
      setSelectedCategoryName(null);
      setShowDeleteModal(false);
    }
  };

  const filteredData = useMemo(() => {
    return categories.filter((c) => {
      const searchMatch =
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.slug?.toLowerCase().includes(search.toLowerCase());
      const currentStatus = c.isActive !== false ? "Active" : "Inactive";
      const statusMatch =
        statusFilter === "All" || currentStatus === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [categories, search, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, rowsPerPage]);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c._id === active.id);
      const newIndex = categories.findIndex((c) => c._id === over.id);

      const newOrder = arrayMove(categories, oldIndex, newIndex);
      setCategories(newOrder);

      const orderedIds = newOrder.map((c) => c._id);

      const reorderPromise = reorderCategories(orderedIds);

      toast.promise(reorderPromise, {
        loading: "Saving new order...",
        success: "Order saved successfully!",
        error: (err) => {
          // Revert state on error
          fetchCategories();
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
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-200 outline-none"
              placeholder="Search categories..."
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
            onClick={() => fetchCategories(true)}
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
          className="bg-slate-900 cursor-pointer hover:bg-black text-white px-5 py-2 rounded text-sm font-bold transition-all shadow-sm active:scale-95"
        >
          + Add Category
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-4 w-12 text-center"></th>
                {/* Drag handle column */}
                <th className="px-4 py-4 w-16 text-center">Main Image</th>
                <th className="px-4 py-4">
                  <div className="flex items-center gap-1">Name</div>
                </th>
                <th className="px-4 py-4">Subcategories</th>
                <th className="px-4 py-4">Attributes</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <SortableContext
                items={categories.map((c) => c._id)}
                strategy={verticalListSortingStrategy}
              >
                {paginatedData.length > 0 ? (
                  paginatedData.map((c, i) => (
                    <SortableCategoryRow
                      key={c._id}
                      category={c}
                      index={(currentPage - 1) * rowsPerPage + i + 1}
                      onView={setViewCategory}
                      onEdit={(cat) => {
                        setEditData(cat);
                        setShowModal(true);
                      }}
                      onDelete={(cat) => {
                        setDeleteId(cat._id);
                        setSelectedCategoryName(cat.name);
                        setShowDeleteModal(true);
                      }}
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-20 text-center text-slate-500 font-medium italic"
                    >
                      {/* colSpan adjusted to 5 */}
                      {loading ? "Syncing data..." : "No categories found."}
                    </td>
                  </tr>
                )}
              </SortableContext>
            </tbody>
          </table>
        </div>
      </DndContext>
      <div className="p-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            Rows per page
          </span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-200 text-xs font-bold text-slate-700 py-1 px-2 rounded-md outline-none cursor-pointer"
          >
            {[10, 20, 50, 100].map((val) => (
              <option key={val} value={val}>
                {val}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="text-[11px] font-medium text-slate-500">
            {filteredData.length > 0 ? (
              <>
                Showing{" "}
                <span className="font-bold text-slate-900">
                  {(currentPage - 1) * rowsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-slate-900">
                  {Math.min(currentPage * rowsPerPage, filteredData.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-900">
                  {filteredData.length}
                </span>{" "}
                results
              </>
            ) : (
              "No results found"
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="p-2 border border-slate-200 rounded-lg cursor-pointer bg-white disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <ChevronLeft size={16} className="text-slate-600" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all ${currentPage === page ? "bg-slate-900 text-white shadow-md" : "bg-white border border-slate-100 text-slate-500 hover:border-slate-300"}`}
                  >
                    {page}
                  </button>
                ),
              )}
            </div>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="p-2 border border-slate-200 rounded-lg cursor-pointer bg-white disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <ChevronRight size={16} className="text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <CategoryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchCategories}
        initialData={editData}
      />
      <ViewCategoryDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        category={viewCategory}
      />
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        entityName="category"
        itemName={selectedCategoryName}
      />
    </div>
  );
}
