"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Ticket,
  Edit3,
  Zap,
  Gift,
  Info,
  Search,
} from "lucide-react";
import { addCoupon, updateCoupon } from "@/services/couponService";
import { getCategories } from "@/services/categoryService";
import { getProducts } from "@/services/productService";
import { toast } from "react-hot-toast";

export default function CouponModal({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
  allCoupons = [],
}) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  const [formData, setFormData] = useState({
    code: "",
    description: "",
    couponType: "CouponCode",
    offerType: "Percentage",
    offerValue: "",
    buyQuantity: 1,
    getQuantity: 1,
    scope: "All",
    applicableIds: [],
    minOrderAmount: "",
    maxDiscountAmount: "",
    startDate: "",
    endDate: "",
    totalUsageLimit: "",
    usageLimitPerUser: 1,
    status: "Active",
    showOnHomepage: false,
    showOnLoginPage: false,
  });

  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (formData.scope === "Specific_Product") {
        setIsSearchingProducts(true);
        try {
          const res = await getProducts(1, 20, productSearch);
          setProducts(res.products || []);
        } catch (error) {
          console.error("Failed to fetch products", error);
        } finally {
          setIsSearchingProducts(false);
        }
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [productSearch, formData.scope]);

  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        try {
          const res = await getCategories();
          const actualArray =
            res?.categories?.categories || res?.data?.categories || [];
          setCategories(Array.isArray(actualArray) ? actualArray : []);
        } catch (err) {
          setCategories([]);
        }
      };
      fetchCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        code: initialData?.code || "",
        description: initialData?.description || "",
        couponType: initialData?.couponType || "CouponCode",
        offerType: initialData?.offerType || "Percentage",
        offerValue: initialData?.offerValue || "",
        buyQuantity: initialData?.buyQuantity || 1,
        getQuantity: initialData?.getQuantity || 1,
        scope: initialData?.scope || "All",
        applicableIds: [],
        minOrderAmount: initialData?.minOrderAmount || "",
        maxDiscountAmount: initialData?.maxDiscountAmount || "",
        startDate: initialData?.startDate
          ? new Date(initialData.startDate).toISOString().split("T")[0]
          : "",
        endDate: initialData?.endDate
          ? new Date(initialData.endDate).toISOString().split("T")[0]
          : "",
        totalUsageLimit: initialData?.totalUsageLimit || "",
        usageLimitPerUser: initialData?.usageLimitPerUser || 1,
        status: initialData?.isActive !== false ? "Active" : "Inactive",
        showOnHomepage: initialData?.showOnHomepage || false,
        showOnLoginPage: initialData?.showOnLoginPage || false,
      });

      if (initialData?.applicableIds) {
        const items = initialData.applicableIds.map((item) =>
          typeof item === "object" ? item : { _id: item, name: "ID: " + item },
        );
        setSelectedItems(items);
      } else {
        setSelectedItems([]);
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      code:
        formData.couponType === "FestiveSale"
          ? `AUTO-${Date.now()}`
          : formData.code,
      isActive: formData.status === "Active",
      offerValue:
        formData.offerType === "BOGO" ? 0 : Number(formData.offerValue),
      buyQuantity: Number(formData.buyQuantity),
      getQuantity: Number(formData.getQuantity),
      minOrderAmount: Number(formData.minOrderAmount) || 0,
      totalUsageLimit: Number(formData.totalUsageLimit),
      usageLimitPerUser: Number(formData.usageLimitPerUser),
      maxDiscountAmount:
        formData.offerType === "FixedAmount"
          ? undefined
          : formData.maxDiscountAmount
            ? Number(formData.maxDiscountAmount)
            : undefined,
      applicableIds: selectedItems.map((i) => i._id),
      showOnHomepage: formData.showOnHomepage,
      showOnLoginPage: formData.showOnLoginPage,
    };

    try {
      const res = initialData
        ? await updateCoupon(initialData._id, payload)
        : await addCoupon(payload);

      if (res.success) {
        toast.success(initialData ? "Coupon Updated!" : "Coupon Created!");
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4 transition-all"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coupon-modal-title"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className={`p-2 ${formData.couponType === "FestiveSale" ? "bg-orange-600" : initialData ? "bg-blue-600" : "bg-slate-900"} text-white rounded-lg transition-colors`}
            >
              {formData.couponType === "FestiveSale" ? (
                <Zap size={18} />
              ) : initialData ? (
                <Edit3 size={18} />
              ) : (
                <Ticket size={18} />
              )}
            </div>
            <div>
              <h2
                id="coupon-modal-title"
                className="text-lg font-bold text-slate-900 leading-tight"
              >
                {formData.couponType === "FestiveSale"
                  ? "Festive Sale Configuration"
                  : initialData
                    ? "Edit Coupon Details"
                    : "Add New Coupon"}
              </h2>
              <p className="text-xs text-slate-500 font-medium italic">
                {formData.couponType === "FestiveSale"
                  ? "Auto-applied for all customers"
                  : "Code-based promotional logic"}
              </p>
            </div>
          </div>

          {/* Icon-only close button — aria-label provides the accessible name */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 cursor-pointer hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-lg transition"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar"
        >
          {/* Show on Homepage toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div aria-hidden="true" className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Gift size={15} className="text-slate-500" />
              </div>
              <div>
                {/* id referenced by aria-labelledby on the toggle so screen
                    readers announce "Show on Homepage — on/off" */}
                <p
                  id="homepage-toggle-label"
                  className="text-xs font-black text-slate-800 uppercase tracking-wide"
                >
                  Show on Homepage
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Display this offer in the homepage promotions section
                </p>
              </div>
            </div>

            {/*
              role="switch" + aria-checked expose the on/off state to
              assistive technology. aria-labelledby ties it to the visible
              label so no duplicate text is needed.
            */}
            <button
              type="button"
              role="switch"
              aria-checked={formData.showOnHomepage}
              aria-labelledby="homepage-toggle-label"
              onClick={() => {
                if (!formData.showOnHomepage) {
                  const conflict = allCoupons.find(
                    (c) => c.showOnHomepage && c._id !== initialData?._id,
                  );
                  if (conflict) {
                    toast.error(
                      `"${conflict.code || conflict.description}" is already set as the homepage coupon. Disable it first.`,
                      { duration: 4000 },
                    );
                    return;
                  }
                }
                setFormData((prev) => ({
                  ...prev,
                  showOnHomepage: !prev.showOnHomepage,
                }));
              }}
              className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
                formData.showOnHomepage ? "bg-slate-900" : "bg-slate-200"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  formData.showOnHomepage ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div aria-hidden="true" className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Gift size={15} className="text-slate-500" />
              </div>
              <div>
                <p
                  id="login-toggle-label"
                  className="text-xs font-black text-slate-800 uppercase tracking-wide"
                >
                  Show on Login Page
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Display this offer in the login page promotions section
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={formData.showOnLoginPage}
              aria-labelledby="login-toggle-label"
              onClick={() => {
                if (!formData.showOnLoginPage) {
                  const conflict = allCoupons.find(
                    (c) => c.showOnLoginPage && c._id !== initialData?._id,
                  );
                  if (conflict) {
                    toast.error(
                      `"${conflict.code || conflict.description}" is already set as the login page coupon. Disable it first.`,
                      { duration: 4000 },
                    );
                    return;
                  }
                }
                setFormData((prev) => ({
                  ...prev,
                  showOnLoginPage: !prev.showOnLoginPage,
                }));
              }}
              className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
                formData.showOnLoginPage ? "bg-slate-900" : "bg-slate-200"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  formData.showOnLoginPage ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Type Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="campaign-type" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Campaign Type
              </label>
              <select
                id="campaign-type"
                value={formData.couponType}
                onChange={(e) => setFormData({ ...formData, couponType: e.target.value })}
                className="w-full bg-white border cursor-pointer border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 font-medium focus:border-slate-900 outline-none transition"
              >
                <option value="CouponCode">Coupon Code</option>
                <option value="FestiveSale">Festive Sale (Auto)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="offer-type" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Offer Type
              </label>
              <select
                id="offer-type"
                value={formData.offerType}
                onChange={(e) => setFormData({ ...formData, offerType: e.target.value })}
                className="w-full bg-white border cursor-pointer border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 font-medium focus:border-slate-900 outline-none transition"
              >
                <option value="Percentage">Percentage (%)</option>
                <option value="FixedAmount">Fixed Amount (₹)</option>
                <option value="BOGO">BOGO (Buy/Get)</option>
              </select>
            </div>
          </div>

          {/* Coupon Code */}
          
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
              <label htmlFor="coupon-code" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Coupon {formData.couponType === "CouponCode" ? "Code" : "Name"}
              </label>
              <input
                id="coupon-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. FESTIVE50"
                className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm font-bold text-slate-900 focus:border-slate-900 outline-none"
                required={formData.couponType === "CouponCode"}
              />
            </div>
          {formData.couponType !== "CouponCode" && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
              <Info size={18} className="text-orange-600 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-orange-800 leading-relaxed">
                <strong>Auto-Apply Mode:</strong> Customers don't need to enter
                a code. This discount will be automatically applied based on the
                rules below.
              </p>
            </div>
          )}

          {/* Scope and Category Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="coupon-scope" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Coupon Scope
              </label>
              <select
                id="coupon-scope"
                value={formData.scope}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, scope: e.target.value }));
                  setSelectedItems([]);
                }}
                className="w-full cursor-pointer bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 font-medium focus:border-slate-900 outline-none transition"
              >
                <option value="All">All Products</option>
                <option value="Category">Specific Category</option>
                <option value="Specific_Product">Specific Product</option>
              </select>
            </div>

            {formData.scope === "Category" && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                <label htmlFor="category-select" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Select Category
                </label>
                <select
                  id="category-select"
                  value={selectedItems[0]?._id || ""}
                  onChange={(e) => {
                    const cat = categories.find((c) => c._id === e.target.value);
                    if (cat) setSelectedItems([cat]);
                  }}
                  className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 font-medium focus:border-slate-900 outline-none transition"
                  required
                >
                  <option value="" disabled>-- Select a category --</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.scope === "Specific_Product" && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300 col-span-2">
                <label htmlFor="product-search" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Select Products
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="product-search"
                    type="text"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-400 rounded-lg text-sm text-slate-900 outline-none focus:border-slate-900"
                  />
                </div>

                {isSearchingProducts && (
                  <p className="text-xs text-slate-500 mt-1" aria-live="polite">
                    Found {products.length} products...
                  </p>
                )}

                {products.length > 0 && (
                  <ul
                    className="mt-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50 p-2 space-y-1"
                    aria-label="Product search results"
                  >
                    {products.map((prod) => {
                      const isSelected = selectedItems.some((item) => item._id === prod._id);
                      return (
                        <li key={prod._id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedItems((prev) => prev.filter((item) => item._id !== prod._id));
                              } else {
                                setSelectedItems((prev) => [...prev, prod]);
                              }
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded cursor-pointer text-left ${isSelected ? "bg-slate-200" : "hover:bg-white"}`}
                          >
                            <div className="flex items-center gap-2">
                              {prod.mainImage?.url && (
                                <img src={prod.mainImage.url} alt="" className="w-8 h-8 rounded object-cover" />
                              )}
                              <span className="text-sm font-medium">{prod.name}</span>
                            </div>
                            {isSelected && (
                              <span className="text-xs bg-black text-white px-2 py-0.5 rounded">Selected</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {selectedItems.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2" aria-label="Selected products">
                    {selectedItems.map((item) => (
                      <div
                        key={item._id}
                        className="bg-slate-100 border border-slate-300 rounded px-2 py-1 text-xs flex items-center gap-2"
                      >
                        <span>{item.name || "Unknown Product"}</span>
                        {/* aria-label gives the icon-only remove button an accessible name */}
                        <button
                          type="button"
                          aria-label={`Remove ${item.name || "product"}`}
                          onClick={() =>
                            setSelectedItems((prev) => prev.filter((i) => i._id !== item._id))
                          }
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X size={12} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BOGO Logic vs Offer Value Logic */}
          {formData.offerType === "BOGO" ? (
            <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <div className="space-y-1.5">
                <label htmlFor="buy-quantity" className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Buy Quantity
                </label>
                <input
                  id="buy-quantity"
                  type="number"
                  min="1"
                  value={formData.buyQuantity}
                  onChange={(e) => setFormData({ ...formData, buyQuantity: e.target.value })}
                  className="w-full bg-white border border-blue-300 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-blue-600 outline-none shadow-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="get-quantity" className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Get Free Qty
                </label>
                <input
                  id="get-quantity"
                  type="number"
                  min="1"
                  value={formData.getQuantity}
                  onChange={(e) => setFormData({ ...formData, getQuantity: e.target.value })}
                  className="w-full bg-white border border-blue-300 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-blue-600 outline-none shadow-sm"
                  required
                />
              </div>
            </div>
          ) : (
            <>
              {formData.offerType === "FixedAmount" ? (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label htmlFor="offer-value-fixed" className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    Flat Discount Amount (₹)
                    <span className="text-[10px] font-normal text-slate-400 normal-case tracking-normal">
                      — exact rupees deducted from order
                    </span>
                  </label>
                  <input
                    id="offer-value-fixed"
                    type="number"
                    min="1"
                    value={formData.offerValue}
                    onChange={(e) => setFormData({ ...formData, offerValue: e.target.value })}
                    placeholder="e.g. 200"
                    className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none font-bold"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    This fixed amount will be deducted from the applicable total
                    {formData.scope === "All"
                      ? " (all products)"
                      : formData.scope === "Category"
                        ? " (matching category items only)"
                        : " (matching products only)"}
                    . It will never exceed the applicable cart total.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label htmlFor="offer-value-pct" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Discount Value (%)
                    </label>
                    <input
                      id="offer-value-pct"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.offerValue}
                      onChange={(e) => {
                        let value = e.target.value;
                        if (Number(value) > 100) {
                          toast.error("Discount percentage cannot exceed 100%. Setting to 100.");
                          value = "100";
                        }
                        setFormData({ ...formData, offerValue: value });
                      }}
                      className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="max-discount" className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                      Max Discount (₹)
                      <span className="text-[10px] font-normal text-slate-400 normal-case">optional cap</span>
                    </label>
                    <input
                      id="max-discount"
                      type="number"
                      min="1"
                      value={formData.maxDiscountAmount}
                      onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                      placeholder="e.g. 500"
                      className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Limits and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="min-order" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Min Order (₹)
              </label>
              <input
                id="min-order"
                type="number"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="coupon-status" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Status
              </label>
              <select
                id="coupon-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full cursor-pointer bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 font-bold focus:border-slate-900 outline-none"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Usage Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="total-usage" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Total Usage Limit
              </label>
              <input
                id="total-usage"
                type="number"
                value={formData.totalUsageLimit}
                onChange={(e) => setFormData({ ...formData, totalUsageLimit: e.target.value })}
                className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="per-user-limit" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Limit Per User
              </label>
              <input
                id="per-user-limit"
                type="number"
                value={formData.usageLimitPerUser}
                onChange={(e) => setFormData({ ...formData, usageLimitPerUser: e.target.value })}
                className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                required
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="start-date" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none transition"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="end-date" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none transition"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="coupon-description" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Sale/Coupon Description
            </label>
            <textarea
              id="coupon-description"
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the offer (e.g., Get 50% off on orders above ₹500)"
              className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none transition"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 cursor-pointer py-3 border border-slate-400 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-[2] cursor-pointer ${formData.couponType === "FestiveSale" ? "bg-orange-600 hover:bg-orange-700" : initialData ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-900 hover:bg-black"} text-white py-3 rounded-lg font-bold text-sm transition shadow-lg flex items-center justify-center active:scale-[0.98] disabled:opacity-70`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} aria-hidden="true" />
              ) : initialData ? (
                "Update Campaign"
              ) : (
                "Launch Campaign"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
