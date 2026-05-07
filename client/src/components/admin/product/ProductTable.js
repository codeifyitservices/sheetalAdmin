"use client";

import { useEffect, useState } from "react";
import {
  Edit3,
  Trash2,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Settings as SettingsIcon,
  UploadCloud,
  CheckSquare,
  Square,
  Minus,
  ListChecks,
  X,
  Star,
} from "lucide-react";
import toast from "react-hot-toast";

import ProductModal from "./ProductModal";
import ViewProductDrawer from "./ViewProductDrawer";
import DeleteConfirmModal from "../common/DeleteConfirmModal";
import SettingsModal from "./SettingsModal";
import BulkImportModal from "./BulkImportModal";

import {
  getProducts,
  deleteProduct,
  starProduct,
} from "@/services/productService";
import { getCategories } from "@/services/categoryService";
import { useProductModal } from "@/hooks/useProductModal";

export default function ProductTable({ refreshStats }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [totalProducts, setTotalProducts] = useState(0);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });

  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedProductName, setSelectedProductName] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);

  // ── Multiselect state ──
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ── Star state ──
  const [starringId, setStarringId] = useState(null);
  const [bulkStarring, setBulkStarring] = useState(false);

  const { openProductId, closeModal } = useProductModal();

  useEffect(() => {
    if (!openProductId) return;
    if (products.length === 0) return;
    const product = products.find((p) => p._id === openProductId);
    if (product) {
      setEditData(product);
      setShowModal(true);
      closeModal();
    }
  }, [openProductId, products]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPage, rowsPerPage, search, selectedCategory, sortConfig]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const pageSize = 200;
        let page = 1;
        let totalPages = 1;
        const allCategories = [];

        while (page <= totalPages) {
          const res = await getCategories(page, pageSize, "");
          if (!res.success) break;

          const batch = Array.isArray(res.data?.categories)
            ? res.data.categories
            : [];
          const pagination = res.data?.pagination || {};

          allCategories.push(...batch);
          totalPages = Number(pagination.totalPages || 1);
          page += 1;
        }

        setCategories(allCategories);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // Clear selection when page/filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, rowsPerPage, search, selectedCategory, sortConfig]);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const fetchProducts = async (isRefresh = false) => {
    setLoading(true);
    try {
      // Always sort starred products first, then apply the user's chosen sort as secondary.
      // This ensures starred products appear at the top across ALL pages, not just the current one.
      const secondarySort =
        sortConfig.direction === "desc" ? `-${sortConfig.key}` : sortConfig.key;
      const sortParam =
        sortConfig.direction === "desc" ? `-${sortConfig.key}` : sortConfig.key;

      const res = await getProducts(
        currentPage,
        rowsPerPage,
        search,
        selectedCategory,
        sortParam,
      );
      if (res.success) {
        setProducts(res.products || []);
        setTotalProducts(res.totalProducts || 0);
        if (refreshStats) refreshStats();
        if (isRefresh) toast.success("Inventory synchronized!");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const loadingToast = toast.loading("Deleting product...");
    try {
      const res = await deleteProduct(deleteId);
      if (res.success) {
        if (products.length === 1 && currentPage > 1)
          setCurrentPage((prev) => prev - 1);
        else fetchProducts();
        toast.success("Product deleted successfully", { id: loadingToast });
      }
    } catch (err) {
      toast.error("Failed to delete", { id: loadingToast });
    } finally {
      setDeleteId(null);
      setSelectedProductName(null);
      setShowDeleteModal(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    setBulkDeleting(true);
    const ids = [...selectedIds];
    const loadingToast = toast.loading(`Deleting ${ids.length} products…`);
    let failed = 0;

    try {
      await Promise.all(
        ids.map((id) =>
          deleteProduct(id).catch(() => {
            failed++;
          }),
        ),
      );
      const succeeded = ids.length - failed;
      if (succeeded > 0)
        toast.success(
          `${succeeded} product${succeeded > 1 ? "s" : ""} deleted`,
          { id: loadingToast },
        );
      if (failed > 0)
        toast.error(`${failed} deletion${failed > 1 ? "s" : ""} failed`);

      exitSelectMode();
      if (products.length - succeeded <= 0 && currentPage > 1)
        setCurrentPage((prev) => prev - 1);
      else fetchProducts();
      if (refreshStats) refreshStats();
    } catch (err) {
      toast.error("Bulk delete failed", { id: loadingToast });
    } finally {
      setBulkDeleting(false);
      setShowBulkDeleteModal(false);
    }
  };

  // ── Single star toggle (no explicit state → backend toggles) ──
  const handleStar = async (e, id) => {
    e.stopPropagation();
    setStarringId(id);
    try {
      const res = await starProduct(id);
      if (res.success) {
        // Re-fetch so the list re-sorts with the new star state
        // (a newly starred product may need to jump to the top on page 1)
        await fetchProducts();
        toast.success(res.data.isStarred ? "Product starred!" : "Star removed");
      }
    } catch {
      toast.error("Failed to update star");
    } finally {
      setStarringId(null);
    }
  };

  // ── Bulk star: pass explicit `starred` boolean so all items are SET, not toggled ──
  const handleBulkStar = async (starred) => {
    setBulkStarring(true);
    const ids = [...selectedIds];
    const loadingToast = toast.loading(
      `${starred ? "Starring" : "Unstarring"} ${ids.length} products…`,
    );
    let failed = 0;

    try {
      // Pass the explicit `starred` boolean so all items are SET, not toggled
      const results = await Promise.allSettled(
        ids.map((id) => starProduct(id, starred)),
      );

      results.forEach((result) => {
        if (result.status === "rejected") failed++;
      });

      const succeeded = ids.length - failed;

      if (succeeded > 0) {
        toast.success(
          `${succeeded} product${succeeded > 1 ? "s" : ""} ${starred ? "starred" : "unstarred"}`,
          { id: loadingToast },
        );
      }
      if (failed > 0)
        toast.error(`${failed} update${failed > 1 ? "s" : ""} failed`);

      exitSelectMode();
      // Re-fetch so the list re-sorts correctly after bulk star changes
      await fetchProducts();
    } catch {
      toast.error("Bulk star failed", { id: loadingToast });
    } finally {
      setBulkStarring(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, rowsPerPage, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(totalProducts / rowsPerPage));

  const allCurrentSelected =
    products.length > 0 && products.every((p) => selectedIds.has(p._id));
  const someSelected =
    products.some((p) => selectedIds.has(p._id)) && !allCurrentSelected;

  // ── Are ALL selected products currently starred? ──
  const allSelectedStarred =
    selectedIds.size > 0 &&
    [...selectedIds].every((id) => {
      const p = products.find((p) => p._id === id);
      return p?.isStarred;
    });

  const toggleSelectAll = () => {
    if (allCurrentSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        products.forEach((p) => next.delete(p._id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        products.forEach((p) => next.add(p._id));
        return next;
      });
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // No need for client-side re-ordering — the backend now returns products
  // already sorted starred-first via the sortParam, so we use `products` directly.
  const orderedProducts = products;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm text-slate-900 overflow-hidden">
      {/* ── Bulk action bar (only in select mode with selections) ── */}
      {selectMode && selectedIds.size > 0 && (
        <div className="px-4 py-2.5 bg-slate-950 flex items-center justify-between gap-4">
          <span className="text-sm font-bold text-white">
            {selectedIds.size} product{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 cursor-pointer py-1.5 text-xs font-bold text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors"
            >
              Clear
            </button>

            {/* ── Bulk star / unstar ── */}
            <button
              disabled={bulkStarring}
              onClick={() => handleBulkStar(!allSelectedStarred)}
              className={`px-3 cursor-pointer py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40 ${
                allSelectedStarred
                  ? "bg-amber-500 hover:bg-amber-400 text-white"
                  : "bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white border border-amber-500/40"
              }`}
            >
              <Star
                size={13}
                className={allSelectedStarred ? "fill-white" : ""}
              />
              {allSelectedStarred ? "Unstar" : "Star"} {selectedIds.size}
            </button>

            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-3 cursor-pointer py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Trash2 size={13} />
              Delete {selectedIds.size}
            </button>
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="p-4 flex justify-between items-center gap-4 border-b border-slate-100">
        <div className="flex gap-3 flex-1 items-center">
          <div className="relative max-w-md w-full">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-200 outline-none"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="min-w-[180px] border border-slate-300 rounded px-3 py-2 text-sm bg-white text-slate-700 focus:ring-2 focus:ring-slate-200 outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>

          {/* ── Sort dropdown ── */}
          <select
            value={`${sortConfig.key}_${sortConfig.direction}`}
            onChange={(e) => {
              const [key, direction] = e.target.value.split("_");
              setSortConfig({ key, direction });
              setCurrentPage(1);
            }}
            className="min-w-[180px] border border-slate-300 rounded px-3 py-2 text-sm bg-white text-slate-700 focus:ring-2 focus:ring-slate-200 outline-none"
          >
            <option value="name_asc">Name: A → Z</option>
            <option value="name_desc">Name: Z → A</option>
            <option value="createdAt_desc">Date: Newest First</option>
            <option value="createdAt_asc">Date: Oldest First</option>
          </select>

          <button
            onClick={() => fetchProducts(true)}
            disabled={loading}
            className="p-2 text-slate-500 cursor-pointer hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <button
          onClick={() => setShowSettingsModal(true)}
          className="p-2.5 text-slate-500 cursor-pointer hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
          title="Global Settings"
        >
          <SettingsIcon size={18} />
        </button>

        {/* ── Select mode toggle ── */}
        <button
          onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          title={selectMode ? "Exit select mode" : "Select multiple"}
          className={`p-2.5 rounded-lg transition-all cursor-pointer ${
            selectMode
              ? "bg-slate-900 text-white hover:bg-slate-700"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          {selectMode ? <X size={18} /> : <ListChecks size={18} />}
        </button>

        <button
          onClick={() => setShowBulkImportModal(true)}
          className="p-2.5 text-slate-500 cursor-pointer hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
          title="Bulk Import"
        >
          <UploadCloud size={18} />
        </button>

        <button
          onClick={() => {
            setEditData(null);
            setShowModal(true);
          }}
          className="bg-slate-900 cursor-pointer hover:bg-black text-white px-5 py-2 rounded text-sm font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2"
        >
          + Add Product
        </button>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
            <tr>
              {selectMode && (
                <th className="px-4 py-4 w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {allCurrentSelected ? (
                      <CheckSquare size={16} className="text-slate-900" />
                    ) : someSelected ? (
                      <Minus size={16} className="text-slate-500" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
              )}
              <th className="px-4 py-4 w-12 text-center">#</th>
              <th className="px-4 py-4 w-16 text-center">Image</th>
              <th className="px-4 py-4">Product Details</th>
              <th className="px-4 py-4">Tags</th>
              <th className="px-4 py-4">Category</th>
              <th className="px-4 py-4">Sub Category</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orderedProducts.length > 0 ? (
              orderedProducts.map((product, i) => {
                const isSelected = selectedIds.has(product._id);
                return (
                  <tr
                    key={product._id}
                    onClick={
                      selectMode
                        ? () => toggleSelectOne(product._id)
                        : undefined
                    }
                    className={`transition-colors ${
                      selectMode ? "cursor-pointer" : ""
                    } ${isSelected ? "bg-slate-50" : "hover:bg-slate-50/80"}`}
                  >
                    {selectMode && (
                      <td
                        className="px-4 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => toggleSelectOne(product._id)}
                          className="flex cursor-pointer items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-slate-900" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>
                    )}

                    <td className="px-4 py-4 text-slate-500 font-medium text-center">
                      {(currentPage - 1) * rowsPerPage + i + 1}
                    </td>

                    <td className="px-4 py-4">
                      <div
                        className="w-10 h-10 mx-auto rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewProduct(product);
                          setShowDrawer(true);
                        }}
                      >
                        {product.images?.[0]?.url || product.mainImage?.url ? (
                          <img
                            src={(
                              product.images?.[0]?.url || product.mainImage?.url
                            ).replace(/\\/g, "/")}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon size={16} className="text-slate-300" />
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">
                            {product.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">
                          SKU: {product.sku || "N/A"}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {product.wearType?.slice(0, 2).map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-purple-100 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                          >
                            {tag}
                          </span>
                        ))}
                        {product.occasion?.slice(0, 2).map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-pink-100 text-pink-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                          >
                            {tag}
                          </span>
                        ))}
                        {product.tags?.slice(0, 1).map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-100 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                          >
                            {tag}
                          </span>
                        ))}
                        {(product.wearType?.length > 2 ||
                          product.occasion?.length > 2 ||
                          product.tags?.length > 1) && (
                          <span className="text-[9px] text-slate-400 font-medium">
                            +more
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-600 font-medium">
                      {product.category?.name || (
                        <span className="text-slate-400 text-xs italic">
                          Uncategorized
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-slate-600 font-medium">
                      {product.subCategory || (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {product.lowStockVariantCount > 0 ? (
                        <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {product.lowStockVariantCount} Variant
                          {product.lowStockVariantCount > 1 ? "s" : ""} Low
                          Stock
                          {product.lowStockThreshold !== undefined && (
                            <span className="ml-1 text-red-600 font-normal">
                              (≤{product.lowStockThreshold})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    <td
                      className="px-4 py-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-4 text-slate-400">
                        {/* ── Star toggle ── */}
                        <button
                          title={product.isStarred ? "Unstar" : "Star"}
                          disabled={starringId === product._id}
                          onClick={(e) => handleStar(e, product._id)}
                          className={`transition-colors cursor-pointer disabled:opacity-40 ${
                            product.isStarred
                              ? "text-amber-400 hover:text-slate-400"
                              : "hover:text-amber-400"
                          }`}
                        >
                          <Star
                            size={18}
                            className={
                              product.isStarred ? "fill-amber-400" : ""
                            }
                          />
                        </button>

                        <button
                          title="Edit"
                          className="hover:text-blue-600 cursor-pointer transition-colors"
                          onClick={() => {
                            setEditData(product);
                            setShowModal(true);
                          }}
                        >
                          <Edit3 size={18} />
                        </button>
                        <button
                          title="Delete"
                          className="hover:text-rose-600 cursor-pointer transition-colors"
                          onClick={() => {
                            setDeleteId(product._id);
                            setShowDeleteModal(true);
                          }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={selectMode ? 9 : 8}
                  className="px-4 py-20 text-center text-slate-500 font-medium italic"
                >
                  {loading ? "Syncing data..." : "No products found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="p-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            Rows per page
          </span>
          <select
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
            className="bg-white border border-slate-200 text-xs font-bold text-slate-700 py-1 px-2 rounded-md outline-none cursor-pointer"
          >
            {[5, 10, 20, 50].map((val) => (
              <option key={val} value={val}>
                {val}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="text-[11px] font-medium text-slate-500">
            {totalProducts > 0 && (
              <>
                Showing{" "}
                <span className="font-bold text-slate-900">
                  {(currentPage - 1) * rowsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-slate-900">
                  {Math.min(currentPage * rowsPerPage, totalProducts)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-900">
                  {totalProducts}
                </span>{" "}
                results
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1 || loading}
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
                    className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all ${
                      currentPage === page
                        ? "bg-slate-900 text-white shadow-md"
                        : "bg-white border border-slate-100 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}
            </div>

            <button
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="p-2 border border-slate-200 rounded-lg cursor-pointer bg-white disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <ChevronRight size={16} className="text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <ProductModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchProducts}
        initialData={editData}
      />
      <ViewProductDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        product={viewProduct}
      />
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        entityName="product"
        itemName={selectedProductName}
      />
      <DeleteConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDeleteConfirm}
        entityName="products"
        itemName={`${selectedIds.size} selected product${selectedIds.size > 1 ? "s" : ""}`}
        loading={bulkDeleting}
      />
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={fetchProducts}
      />
    </div>
  );
}
