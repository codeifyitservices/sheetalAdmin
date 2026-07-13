"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Search, X, GripVertical, Plus, AlertCircle, Loader2 } from "lucide-react";
import { getProducts, getProductDetails } from "@/services/productService";

const MAX_SIMILAR = 10;

export default function SimilarParams({ formData, setFormData }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const searchTimeout = useRef(null);

  // Drag state refs (avoid re-renders)
  const dragIndexRef = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const selectedProducts = formData.similarProducts || [];

  // ── Hydrate raw IDs → full product objects ─────────────────────────────────
  // When the modal reopens after a save, similarProducts may contain plain ID
  // strings (not populated objects). Fetch full details to restore name/image.
  useEffect(() => {
    const rawIds = (formData.similarProducts || []).filter(
      (p) => typeof p === "string",
    );
    if (rawIds.length === 0) return;

    let cancelled = false;
    setHydrating(true);

    Promise.all(rawIds.map((id) => getProductDetails(id).catch(() => null)))
      .then((results) => {
        if (cancelled) return;
        const hydrated = results.map((r) => r?.product ?? null).filter(Boolean);
        // Rebuild the list preserving order: replace raw strings with their hydrated objects
        setFormData((prev) => {
          const list = (prev.similarProducts || []).map((p) => {
            if (typeof p !== "string") return p;
            return hydrated.find((h) => h._id === p) ?? p;
          });
          return { ...prev, similarProducts: list };
        });
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });

    return () => {
      cancelled = true;
    };
    // Only run when the component first mounts (tab opened)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [dropdownProducts, setDropdownProducts] = useState([]);
  const [loadingDropdown, setLoadingDropdown] = useState(false);
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpenDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ── Fetch category products for dropdown ───────────────────────────────────
  useEffect(() => {
    if (!formData.category) {
      setDropdownProducts([]);
      return;
    }
    let cancelled = false;
    setLoadingDropdown(true);
    getProducts(1, 150, "", formData.category)
      .then((res) => {
        if (cancelled) return;
        const filtered = (res?.products || []).filter(
          (p) => p._id !== formData._id
        );
        setDropdownProducts(filtered);
      })
      .catch((err) => {
        console.error("Error fetching dropdown products:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingDropdown(false);
      });

    return () => {
      cancelled = true;
    };
  }, [formData.category, formData._id]);

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
        const res = await getProducts(1, 20, q.trim(), formData.category);
        const filtered = (res?.products || []).filter(
          (p) => {
            const pCat = p.category?._id || p.category;
            return pCat === formData.category && p._id !== formData._id;
          }
        );
        setSearchResults(filtered);
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
      
      // Guard: must be of the same category
      const productCategory = product.category?._id || product.category;
      if (formData.category && productCategory !== formData.category) return;

      setFormData((prev) => ({
        ...prev,
        similarProducts: [...(prev.similarProducts || []), product],
      }));
    },
    [selectedProducts, formData._id, formData.category, setFormData],
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
  if (!formData.category) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
        <AlertCircle size={28} className="text-amber-500 animate-pulse" />
        <h4 className="text-sm font-semibold text-slate-800">
          Category Required
        </h4>
        <p className="text-xs text-slate-500 max-w-sm">
          Please select a category in the <strong>Basic</strong> tab first before configuring similar products. Similar products must belong to the same category.
        </p>
      </div>
    );
  }

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

      {/* Search & Dropdown Combobox */}
      <div className="space-y-2 relative" ref={dropdownRef}>
        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
          Select Similar Products (Same Category)
        </label>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Type to search or click to browse products..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setIsOpenDropdown(true)}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:border-indigo-500 transition"
          />
          {/* Dropdown Indicator / Arrow */}
          <button
            type="button"
            onClick={() => setIsOpenDropdown((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
          >
            <svg
              className={`w-4 h-4 transform transition-transform ${isOpenDropdown ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Dropdown Menu */}
        {isOpenDropdown && (
          <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-lg z-50 p-2 space-y-1">
            {loadingDropdown || (searching && searchQuery.trim()) ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
                <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span>Loading products...</span>
              </div>
            ) : (searchQuery.trim() ? searchResults : dropdownProducts).length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                No products found.
              </div>
            ) : (
              (searchQuery.trim() ? searchResults : dropdownProducts).map((product) => {
                const selected = isSelected(product);
                const limitReached = selectedProducts.length >= MAX_SIMILAR;
                const imgUrl = getProductImage(product);

                return (
                  <button
                    key={product._id}
                    type="button"
                    disabled={selected || limitReached}
                    onClick={() => {
                      addProduct(product);
                      setSearchQuery(""); // Clear search query after selection
                      setIsOpenDropdown(false); // Close dropdown
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition ${
                      selected
                        ? "bg-green-50 text-green-600 cursor-default opacity-85"
                        : limitReached
                          ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                          : "hover:bg-slate-50 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Image */}
                      <div className="w-8 h-8 rounded overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-300">
                            No img
                          </div>
                        )}
                      </div>
                      {/* Name and SKU */}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {product.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {product.sku || product.slug}
                        </p>
                      </div>
                    </div>
                    
                    {/* Status Indicator */}
                    {selected ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-100 px-2 py-0.5 rounded">
                        Selected
                      </span>
                    ) : limitReached ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        Limit Reached
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                        Add
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Selected Products List */}
      {hydrating ? (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-xs">Loading saved products…</span>
        </div>
      ) : selectedProducts.length > 0 ? (
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
