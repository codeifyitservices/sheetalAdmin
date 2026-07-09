"use client";

import React, { useState, useEffect } from "react";
import { X, Search, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import toast from "react-hot-toast";
import { getProducts, reorderSingleProduct } from "@/services/productService";

export default function MoveProductModal({
  isOpen,
  onClose,
  product,
  products = [],
  totalProducts,
  onSuccess,
}) {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Normalize moving products list (could be single or multiple)
  const movingProducts = products && products.length > 0 ? products : (product ? [product] : []);

  // Fetch all products when modal opens
  const fetchModalProducts = async () => {
    setLoading(true);
    try {
      const res = await getProducts(1, 1000);
      if (res.success) {
        // Exclude all products that are currently being moved
        const movingIds = new Set(movingProducts.map((p) => p._id));
        const filtered = (res.products || []).filter(
          (p) => !movingIds.has(p._id)
        );
        setAllProducts(filtered);
      }
    } catch (err) {
      console.error("Failed to load products for reordering:", err);
      toast.error("Failed to load products list");
    } finally {
      setLoading(false);
    }
  };

  // Reset states and fetch products when modal is opened
  useEffect(() => {
    if (isOpen && (product || (products && products.length > 0))) {
      setSearchQuery("");
      setExpandedProductId(null);
      fetchModalProducts();
    }
  }, [isOpen, product, products]);

  const handleMoveAbove = async (targetProduct) => {
    if (submitting) return;
    setSubmitting(true);

    const movingNames = movingProducts.length > 1 ? `${movingProducts.length} products` : `"${movingProducts[0].name}"`;
    const loadingToast = toast.loading(`Moving ${movingNames} above "${targetProduct.name}"...`);

    try {
      const movingIds = movingProducts.map((p) => p._id);
      const res = await reorderSingleProduct(movingIds, {
        targetProductId: targetProduct._id,
      });
      if (res.success) {
        toast.success("Products moved successfully!", { id: loadingToast });
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || "Failed to move products.", { id: loadingToast });
      }
    } catch (err) {
      toast.error(err.message || "An error occurred.", { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveBelow = async (targetProduct) => {
    if (submitting) return;

    const targetIdx = allProducts.findIndex((x) => x._id === targetProduct._id);
    if (targetIdx === -1) {
      toast.error("Target product not found in the list.");
      return;
    }

    setSubmitting(true);
    const movingNames = movingProducts.length > 1 ? `${movingProducts.length} products` : `"${movingProducts[0].name}"`;
    const loadingToast = toast.loading(`Moving ${movingNames} below "${targetProduct.name}"...`);

    try {
      let payload = {};
      // If there is another product after targetProduct in our filtered display list,
      // moving below targetProduct is equivalent to moving above that next product.
      if (targetIdx + 1 < allProducts.length) {
        const nextProduct = allProducts[targetIdx + 1];
        payload.targetProductId = nextProduct._id;
      } else {
        // If it's the last product, place it at the end of the entire collection
        payload.newPosition = totalProducts;
      }

      const movingIds = movingProducts.map((p) => p._id);
      const res = await reorderSingleProduct(movingIds, payload);
      if (res.success) {
        toast.success("Products moved successfully!", { id: loadingToast });
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || "Failed to move products.", { id: loadingToast });
      }
    } catch (err) {
      toast.error(err.message || "An error occurred.", { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || movingProducts.length === 0) return null;

  // Local search filtering
  const filteredProducts = allProducts.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-3xl h-full max-h-[90vh] overflow-hidden flex flex-col font-montserrat animate-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Move Products</h2>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Change the order position of selected products
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Active Products Card/List */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg flex flex-col gap-2 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {movingProducts.length > 1 ? "Moving Products" : "Moving Product"}
            </span>
            {movingProducts.length === 1 ? (
              <div className="flex items-center gap-3">
                {movingProducts[0].mainImage?.url ? (
                  <img
                    src={movingProducts[0].mainImage.url.replace(/\\/g, "/")}
                    alt={movingProducts[0].name}
                    className="w-10 h-10 object-cover rounded-md bg-white border border-slate-200 shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-white border border-slate-200 flex items-center justify-center text-xs text-slate-400 font-bold shadow-sm">
                    —
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-slate-800 truncate">{movingProducts[0].name}</h3>
                  {movingProducts[0].sortOrder > 0 && (
                    <span className="text-[10px] font-medium text-slate-500 block mt-0.5">
                      Current Position: <span className="font-bold text-slate-700">#{movingProducts[0].sortOrder}</span> of {totalProducts}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                {movingProducts.map((p) => (
                  <div key={p._id} className="flex items-center gap-2 bg-white border border-slate-200 p-1 px-2 rounded-lg text-xs font-semibold text-slate-700">
                    {p.mainImage?.url ? (
                      <img
                        src={p.mainImage.url.replace(/\\/g, "/")}
                        alt=""
                        className="w-5 h-5 object-cover rounded bg-slate-50 border border-slate-200"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-[8px] text-slate-400 font-bold">
                        —
                      </div>
                    )}
                    <span className="truncate max-w-[120px]">{p.name}</span>
                    {p.sortOrder > 0 && (
                      <span className="text-[9px] text-slate-400 font-bold">#{p.sortOrder}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="relative shrink-0">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setExpandedProductId(null); // Collapse open item on search
              }}
              placeholder="Search target product..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400 font-medium transition-colors"
            />
          </div>

          {/* Product List */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/60 flex-1 flex flex-col min-h-0">
            <div className="overflow-y-auto p-2 space-y-1.5 flex-1 custom-scrollbar">
              {loading ? (
                <div className="h-full min-h-[240px] flex flex-col items-center justify-center gap-2">
                  <Loader2 size={22} className="animate-spin text-slate-400" />
                  <span className="text-xs text-slate-500 font-semibold">Loading products...</span>
                </div>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  const isExpanded = expandedProductId === p._id;
                  return (
                    <div key={p._id} className="space-y-1.5">
                      {/* Move Above button */}
                      {isExpanded && (
                        <button
                          type="button"
                          onClick={() => handleMoveAbove(p)}
                          disabled={submitting}
                          className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-[0.99]"
                        >
                          <ArrowUp size={14} className="shrink-0 animate-bounce" />
                          <span>Move above this product</span>
                        </button>
                      )}

                      {/* Product Row Item */}
                      <div
                        className={`border rounded-lg transition-colors ${
                          isExpanded
                            ? "bg-white border-slate-400 ring-1 ring-slate-300 shadow-sm text-slate-800 scale-[1.002]"
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedProductId(isExpanded ? null : p._id)}
                          className="w-full px-3 py-2.5 flex items-center gap-3 text-left cursor-pointer outline-none"
                        >
                          {p.sortOrder > 0 && (
                            <span className="text-[11px] font-bold text-slate-400 shrink-0 w-6 text-right">
                              #{p.sortOrder}
                            </span>
                          )}
                          {p.mainImage?.url ? (
                            <img
                              src={p.mainImage.url.replace(/\\/g, "/")}
                              alt=""
                              className="w-9 h-9 object-cover rounded-md bg-slate-100 border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] shrink-0 text-slate-400 font-bold">
                              —
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold block truncate text-slate-800">
                              {p.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                            {isExpanded ? "Hide options" : "Select"}
                          </span>
                        </button>
                      </div>

                      {/* Move Below button */}
                      {isExpanded && (
                        <button
                          type="button"
                          onClick={() => handleMoveBelow(p)}
                          disabled={submitting}
                          className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-[0.99]"
                        >
                          <ArrowDown size={14} className="shrink-0 animate-bounce" />
                          <span>Move below this product</span>
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="h-full min-h-[240px] flex items-center justify-center text-xs text-slate-400 font-medium">
                  No products found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2 border border-slate-300 bg-white rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}