"use client";
import { useState, useRef, useCallback } from "react";
import { Search, X, GripVertical, Plus, AlertCircle } from "lucide-react";
import { getProducts } from "@/services/productService";

const MAX_SIMILAR = 10;

export default function SimilarParams({ formData, setFormData }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeout = useRef(null);

  // Drag state refs (avoid re-renders)
  const dragIndexRef = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const selectedProducts = formData.similarProducts || [];

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(searchTimeout.current);
    if (!q.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await getProducts(1, 20, q.trim());
        setSearchResults(res?.products || []);
        setHasSearched(true);
      } catch {
        setSearchResults([]);
        setHasSearched(true);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  // ── Add / Remove ───────────────────────────────────────────────────────────
  const addProduct = useCallback(
    (product) => {
      if (selectedProducts.length >= MAX_SIMILAR) return;
      const alreadyAdded = selectedProducts.some(
        (p) => (p._id || p) === (product._id || product),
      );
      if (alreadyAdded) return;
      // Don't allow adding the product to its own similar list (guard by ID)
      if (formData._id && (product._id || product) === formData._id) return;
      setFormData((prev) => ({
        ...prev,
        similarProducts: [...(prev.similarProducts || []), product],
      }));
    },
    [selectedProducts, formData._id, setFormData],
  );

  const removeProduct = useCallback(
    (index) => {
      setFormData((prev) => ({
        ...prev,
        similarProducts: (prev.similarProducts || []).filter(
          (_, i) => i !== index,
        ),
      }));
    },
    [setFormData],
  );

  // ── Drag and Drop ─────────────────────────────────────────────────────────
  const handleDragStart = (e, index) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    const sourceIndex = dragIndexRef.current;
    if (sourceIndex === null || sourceIndex === targetIndex) return;
    setFormData((prev) => {
      const list = [...(prev.similarProducts || [])];
      const [moved] = list.splice(sourceIndex, 1);
      list.splice(targetIndex, 0, moved);
      return { ...prev, similarProducts: list };
    });
    dragIndexRef.current = null;
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getProductImage = (product) => {
    const url =
      product?.mainImage?.url ||
      (typeof product?.mainImage === "string" ? product.mainImage : null) ||
      "";
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return url;
  };

  const getProductName = (product) =>
    typeof product === "string" ? product : product?.name || "Unknown Product";

  const getProductId = (product) =>
    typeof product === "string" ? product : product?._id || "";

  const isSelected = (product) =>
    selectedProducts.some((p) => getProductId(p) === getProductId(product));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Similar Products
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Select up to {MAX_SIMILAR} products to show as "Similar Products" on
            the product page. Drag rows to reorder them.
          </p>
        </div>
        <span
          className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
            selectedProducts.length >= MAX_SIMILAR
              ? "bg-rose-100 text-rose-600"
              : "bg-indigo-50 text-indigo-600"
          }`}
        >
          {selectedProducts.length} / {MAX_SIMILAR}
        </span>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search products by name or SKU…"
            className="w-full bg-white border border-slate-300 pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchQuery.trim() && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm max-h-56 overflow-y-auto">
            {searchResults.length === 0 && hasSearched && !searching ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                No products found.
              </div>
            ) : (
              searchResults.map((product) => {
                const selected = isSelected(product);
                const limitReached = selectedProducts.length >= MAX_SIMILAR;
                return (
                  <div
                    key={product._id}
                    className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition"
                  >
                    {/* Thumbnail */}
                    <div className="w-9 h-9 rounded-md overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      {getProductImage(product) ? (
                        <img
                          src={getProductImage(product)}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px]">
                          No img
                        </div>
                      )}
                    </div>
                    {/* Name & SKU */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {product.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {product.sku || product.slug}
                      </p>
                    </div>
                    {/* Add button */}
                    <button
                      type="button"
                      disabled={selected || limitReached}
                      onClick={() => addProduct(product)}
                      className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition ${
                        selected
                          ? "bg-green-50 text-green-600 cursor-default"
                          : limitReached
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                      }`}
                    >
                      {selected ? (
                        "Added"
                      ) : (
                        <>
                          <Plus size={10} />
                          Add
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Selected Products List */}
      {selectedProducts.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Selected — drag to reorder
          </p>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            {selectedProducts.map((product, index) => (
              <div
                key={getProductId(product) || index}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 px-3 py-2.5 bg-white border-b border-slate-100 last:border-0 transition-all ${
                  dragOverIndex === index
                    ? "border-l-4 border-l-indigo-500 bg-indigo-50"
                    : "hover:bg-slate-50"
                }`}
              >
                {/* Drag Handle */}
                <GripVertical
                  size={15}
                  className="text-slate-300 shrink-0 cursor-grab active:cursor-grabbing"
                />
                {/* Order badge */}
                <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                {/* Thumbnail */}
                <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                  {getProductImage(product) ? (
                    <img
                      src={getProductImage(product)}
                      alt={getProductName(product)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-300">
                      No img
                    </div>
                  )}
                </div>
                {/* Name */}
                <p className="flex-1 text-xs font-semibold text-slate-800 truncate">
                  {getProductName(product)}
                </p>
                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeProduct(index)}
                  className="shrink-0 text-slate-300 hover:text-rose-500 transition cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-10 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-400">
          <AlertCircle size={22} className="text-slate-300" />
          <p className="text-xs font-medium">No products selected.</p>
          <p className="text-[11px] text-slate-400">
            If none are selected, the system fallback logic will be used.
          </p>
        </div>
      )}
    </div>
  );
}
