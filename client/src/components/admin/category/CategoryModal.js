"use client";

import { useState, useEffect } from "react";
import { X, Upload, Loader2, LayoutGrid, Edit3, Search } from "lucide-react";
import {
  addCategory,
  updateCategory,
  getCategories,
} from "@/services/categoryService";
import { getSizeCharts } from "@/services/sizeChartService";
import { toast } from "react-hot-toast";
import { IMAGE_BASE_URL } from "@/services/api";
import {
  getRatioLabel,
  validateImageAspectRatio,
} from "@/utils/imageAspectRatio";
import CreateChartModal from "../size-chart/CreateChartModal";

const OG_RATIO = { width: 1200, height: 630 };
const OG_RATIO_LABEL = getRatioLabel(OG_RATIO.width, OG_RATIO.height);
const MAIN_IMAGE_RATIO = { width: 3, height: 4 };
const MAIN_IMAGE_RATIO_LABEL = getRatioLabel(
  MAIN_IMAGE_RATIO.width,
  MAIN_IMAGE_RATIO.height,
);
const BANNER_RATIO = { width: 3, height: 2 };
const BANNER_RATIO_LABEL = getRatioLabel(
  BANNER_RATIO.width,
  BANNER_RATIO.height,
);

const TABS = ["Details", "SEO"];

export default function CategoryModal({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
}) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Details");
  const [parentCategories, setParentCategories] = useState([]);
  const [sizeCharts, setSizeCharts] = useState([]);
  const [isCreateChartModalOpen, setIsCreateChartModalOpen] = useState(false);
  const [previewMainImage, setPreviewMainImage] = useState(null);
  const [previewBannerImage, setPreviewBannerImage] = useState(null);
  const [previewOgImage, setPreviewOgImage] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parentCategory: "",
    isFeatured: false,
    status: "Active",
    categoryBanner: "",
    subCategories: [],
    style: [],
    work: [],
    fabric: [],
    productType: [],
    wearType: [],
    occasion: [],
    byPrice: [],
    sizeChart: "",
    mainImage: null,
    bannerImage: null,
    // SEO fields
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    canonicalUrl: "",
    ogImage: null,
  });

  useEffect(() => {
    if (isOpen) {
      setActiveTab("Details");
      setFormData({
        name: initialData?.name || "",
        description: initialData?.description || "",
        parentCategory: initialData?.parentCategory?._id || "",
        isFeatured: initialData?.isFeatured || false,
        status: initialData?.isActive !== false ? "Active" : "Inactive",
        categoryBanner: initialData?.categoryBanner || "",
        subCategories: initialData?.subCategories || [],
        style: initialData?.style || [],
        work: initialData?.work || [],
        fabric: initialData?.fabric || [],
        productType: initialData?.productType || [],
        wearType: initialData?.wearType || [],
        occasion: initialData?.occasion || [],
        byPrice: initialData?.byPrice || [],
        sizeChart:
          initialData?.sizeChart === "free"
            ? "free"
            : initialData?.sizeChart?._id || initialData?.sizeChart || "",
        mainImage: null,
        bannerImage: null,
        metaTitle: initialData?.metaTitle || "",
        metaDescription: initialData?.metaDescription || "",
        metaKeywords: initialData?.metaKeywords || "",
        canonicalUrl: initialData?.canonicalUrl || "",
        ogImage: null,
      });

      if (initialData?.mainImage?.url) {
        const url = initialData.mainImage.url;
        const fullUrl = url.startsWith("http")
          ? url
          : `${IMAGE_BASE_URL}/${url.replace(/\\/g, "/")}`.replace(
              /([^:]\/)\/+/g,
              "$1",
            );
        setPreviewMainImage(fullUrl);
      } else {
        setPreviewMainImage(null);
      }

      if (initialData?.bannerImage?.url) {
        const url = initialData.bannerImage.url;
        const fullUrl = url.startsWith("http")
          ? url
          : `${IMAGE_BASE_URL}/${url.replace(/\\/g, "/")}`.replace(
              /([^:]\/)\/+/g,
              "$1",
            );
        setPreviewBannerImage(fullUrl);
      } else {
        setPreviewBannerImage(null);
      }

      if (initialData?.ogImage) {
        const url = initialData.ogImage;
        const fullUrl = url.startsWith("http")
          ? url
          : `${IMAGE_BASE_URL}/${url.replace(/\\/g, "/")}`.replace(
              /([^:]\/)\/+/g,
              "$1",
            );
        setPreviewOgImage(fullUrl);
      } else {
        setPreviewOgImage(null);
      }

      fetchParents();
      fetchSizeCharts();
    }
  }, [isOpen, initialData]);

  const fetchParents = async () => {
    try {
      const res = await getCategories(1, 100);
      const filtered = res.data.categories.filter(
        (c) => c._id !== initialData?._id,
      );
      setParentCategories(filtered);
    } catch (err) {
      console.error("Failed to fetch parents:", err);
    }
  };

  const fetchSizeCharts = async () => {
    try {
      const res = await getSizeCharts();
      setSizeCharts(Array.isArray(res.data?.charts) ? res.data.charts : []);
    } catch (err) {
      console.error("Failed to fetch size charts:", err);
      setSizeCharts([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        e.target.value = "";
        return toast.error("File size should be less than 2MB");
      }
      (async () => {
        try {
          if (fieldName === "mainImage") {
            await validateImageAspectRatio(file, MAIN_IMAGE_RATIO, {
              label: "Category main image",
            });
          }
          if (fieldName === "bannerImage") {
            await validateImageAspectRatio(file, BANNER_RATIO, {
              label: "Category banner image",
            });
          }
          if (fieldName === "ogImage") {
            await validateImageAspectRatio(file, OG_RATIO, {
              label: "Category OG image",
            });
          }
          setFormData((prev) => ({ ...prev, [fieldName]: file }));
          const url = URL.createObjectURL(file);
          if (fieldName === "mainImage") setPreviewMainImage(url);
          else if (fieldName === "bannerImage") setPreviewBannerImage(url);
          else if (fieldName === "ogImage") setPreviewOgImage(url);
        } catch (err) {
          toast.error(err.message || "Invalid image");
          e.target.value = "";
        }
      })();
    }
  };

  const handleSizeChartCreated = (chart) => {
    setSizeCharts((prev) => [chart, ...prev]);
    setFormData((prev) => ({
      ...prev,
      sizeChart: chart?._id || "",
    }));
    setIsCreateChartModalOpen(false);
    toast.success(`"${chart?.name || "Size chart"}" created`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("description", formData.description);
    data.append("parentCategory", formData.parentCategory || "");
    data.append("isFeatured", formData.isFeatured);
    data.append("status", formData.status);
    data.append("categoryBanner", formData.categoryBanner);
    data.append("subCategories", JSON.stringify(formData.subCategories));
    data.append("style", JSON.stringify(formData.style));
    data.append("work", JSON.stringify(formData.work));
    data.append("fabric", JSON.stringify(formData.fabric));
    data.append("productType", JSON.stringify(formData.productType));
    data.append("wearType", JSON.stringify(formData.wearType));
    data.append("occasion", JSON.stringify(formData.occasion));
    data.append("byPrice", JSON.stringify(formData.byPrice));
    data.append(
      "sizeChart",
      formData.sizeChart === "free" ? "free" : formData.sizeChart || "",
    );
    // SEO
    data.append("metaTitle", formData.metaTitle);
    data.append("metaDescription", formData.metaDescription);
    data.append("metaKeywords", formData.metaKeywords);
    data.append("canonicalUrl", formData.canonicalUrl);

    if (formData.mainImage) data.append("mainImage", formData.mainImage);
    if (formData.bannerImage) data.append("bannerImage", formData.bannerImage);
    if (formData.ogImage) data.append("ogImage", formData.ogImage);

    try {
      const res = initialData
        ? await updateCategory(initialData._id, data)
        : await addCategory(data);

      if (res.success) {
        toast.success(initialData ? "Category Updated!" : "Category Created!");
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4 transition-all">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[92vh] overflow-hidden border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 ${initialData ? "bg-blue-600" : "bg-slate-900"} text-white rounded-lg`}
            >
              {initialData ? <Edit3 size={18} /> : <LayoutGrid size={18} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {initialData ? "Edit Category Details" : "Add New Category"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {initialData
                  ? "Modify the existing category information"
                  : "Create a new category profile"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab === "SEO" && <Search size={12} />}
              {tab}
            </button>
          ))}
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 h-full overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto min-h-0 p-6 scrollbar-thin">
            {/* ── Details Tab ── */}
            {activeTab === "Details" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Column 1: Visuals */}
                <div className="lg:col-span-3 space-y-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-6">
                    {/* Main Image */}
                    <div className="flex flex-col items-center">
                      <label className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                        Main Image
                      </label>
                      <p className="text-[10px] font-semibold text-slate-500 mb-2">
                        Required aspect ratio: {MAIN_IMAGE_RATIO_LABEL}
                      </p>
                      <div className="relative group w-32 h-32">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "mainImage")}
                          className="hidden"
                          id="main-cat-img"
                        />
                        <label
                          htmlFor="main-cat-img"
                          className="block w-full h-full rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-900 transition-all cursor-pointer overflow-hidden relative bg-white"
                        >
                          {previewMainImage ? (
                            <img
                              src={previewMainImage}
                              alt="Main Preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                              <Upload size={24} />
                              <span className="text-[10px] mt-1 font-bold">
                                UPLOAD
                              </span>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Banner Image */}
                    <div className="flex flex-col items-center">
                      <label className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                        Banner Image
                      </label>
                      <p className="text-[10px] font-semibold text-slate-500 mb-2">
                        Required aspect ratio: {BANNER_RATIO_LABEL}
                      </p>
                      <div className="relative group w-full h-24">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "bannerImage")}
                          className="hidden"
                          id="banner-cat-img"
                        />
                        <label
                          htmlFor="banner-cat-img"
                          className="block w-full h-full rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-900 transition-all cursor-pointer overflow-hidden relative bg-white"
                        >
                          {previewBannerImage ? (
                            <img
                              src={previewBannerImage}
                              alt="Banner Preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                              <Upload size={20} />
                              <span className="text-[10px] mt-1 font-bold">
                                BANNER
                              </span>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full bg-white border border-slate-300 px-3 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none font-medium cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Column 2: Details */}
                <div className="lg:col-span-4 space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Category Name
                    </label>
                    <input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g. Mens Fashion"
                      className="w-full bg-white border border-slate-300 px-3 py-2.5 rounded-lg text-sm outline-none focus:border-slate-900 transition font-medium"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Banner Headline
                    </label>
                    <input
                      value={formData.categoryBanner}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          categoryBanner: e.target.value,
                        })
                      }
                      placeholder="e.g. Best Sellers 2024"
                      className="w-full bg-white border border-slate-300 px-3 py-2.5 rounded-lg text-sm outline-none focus:border-slate-900 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Description
                    </label>
                    <textarea
                      rows="4"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Short description..."
                      className="w-full bg-white border border-slate-300 px-3 py-2.5 rounded-lg text-sm outline-none focus:border-slate-900 transition resize-none"
                    />
                  </div>

                  {/* Subcategories */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Subcategories
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="subcategory-input"
                        placeholder="Add subcategory..."
                        className="flex-1 bg-white border border-slate-300 px-3 py-2 rounded-lg text-sm outline-none focus:border-slate-900 transition"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = e.target.value.trim();
                            if (val && !formData.subCategories.includes(val)) {
                              setFormData((prev) => ({
                                ...prev,
                                subCategories: [...prev.subCategories, val],
                              }));
                              e.target.value = "";
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input =
                            document.getElementById("subcategory-input");
                          const val = input.value.trim();
                          if (val && !formData.subCategories.includes(val)) {
                            setFormData((prev) => ({
                              ...prev,
                              subCategories: [...prev.subCategories, val],
                            }));
                            input.value = "";
                          }
                        }}
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition"
                      >
                        Add
                      </button>
                    </div>
                    {formData.subCategories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 max-h-[120px] overflow-y-auto custom-scrollbar">
                        {formData.subCategories.map((sub, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 border border-slate-200"
                          >
                            {sub}
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  subCategories: prev.subCategories.filter(
                                    (_, i) => i !== index,
                                  ),
                                }))
                              }
                              className="ml-1 text-slate-400 hover:text-rose-500"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Size Chart
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCreateChartModalOpen(true)}
                        className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700 cursor-pointer"
                      >
                        + New Chart
                      </button>
                    </div>
                    <select
                      value={formData.sizeChart}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          sizeChart: e.target.value,
                        }))
                      }
                      className="w-full bg-white border border-slate-300 px-3 py-2.5 rounded-lg text-sm outline-none focus:border-slate-900 transition font-medium"
                    >
                      <option value="">— No chart selected —</option>
                      <option value="free">Free Size</option>
                      {sizeCharts.map((chart) => (
                        <option key={chart._id} value={chart._id}>
                          {chart.name || "Untitled Size Chart"}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500">
                      {formData.sizeChart === "free"
                        ? "Products in this category will be marked as free size — no chart applied."
                        : formData.sizeChart
                          ? "Products in this category will use the selected chart."
                          : "No size chart will be shown for this category."}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Products in this category will use the selected chart.
                    </p>
                  </div>
                </div>

                {/* Column 3: Attributes */}
                <div className="lg:col-span-5">
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 h-full flex flex-col">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200 flex items-center justify-between">
                      <span>Category Attributes</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Manage Tags
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                      {[
                        {
                          label: "Product Type",
                          key: "productType",
                          color:
                            "text-indigo-600 bg-indigo-50 border-indigo-200",
                        },
                        {
                          label: "Fabric",
                          key: "fabric",
                          color: "text-teal-600 bg-teal-50 border-teal-200",
                        },
                        {
                          label: "Style",
                          key: "style",
                          color:
                            "text-orange-600 bg-orange-50 border-orange-200",
                        },
                        {
                          label: "Work",
                          key: "work",
                          color: "text-rose-600 bg-rose-50 border-rose-200",
                        },
                        {
                          label: "Wear Type",
                          key: "wearType",
                          color:
                            "text-purple-600 bg-purple-50 border-purple-200",
                        },
                        {
                          label: "Occasion",
                          key: "occasion",
                          color: "text-pink-600 bg-pink-50 border-pink-200",
                        },
                        {
                          label: "By Price",
                          key: "byPrice",
                          color: "text-amber-600 bg-amber-50 border-amber-200",
                        },
                      ].map((section) => (
                        <div
                          key={section.key}
                          className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm"
                        >
                          <label className="text-[10px] font-bold text-slate-900 uppercase tracking-wider block">
                            {section.label}
                          </label>
                          <div className="flex gap-2">
                            <input
                              id={`input-${section.key}`}
                              placeholder="Add..."
                              className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-md text-xs outline-none focus:border-slate-800 transition"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const val = e.target.value.trim();
                                  if (
                                    val &&
                                    !formData[section.key].includes(val)
                                  ) {
                                    setFormData((prev) => ({
                                      ...prev,
                                      [section.key]: [
                                        ...prev[section.key],
                                        val,
                                      ],
                                    }));
                                    e.target.value = "";
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById(
                                  `input-${section.key}`,
                                );
                                const val = input.value.trim();
                                if (
                                  val &&
                                  !formData[section.key].includes(val)
                                ) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    [section.key]: [...prev[section.key], val],
                                  }));
                                  input.value = "";
                                }
                              }}
                              className="bg-slate-900 text-white px-2 py-1.5 rounded-md text-xs font-bold hover:bg-black transition"
                            >
                              +
                            </button>
                          </div>
                          {formData[section.key].length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-[80px] overflow-y-auto custom-scrollbar">
                              {formData[section.key].map((tag, index) => (
                                <div
                                  key={index}
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${section.color}`}
                                >
                                  {tag}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        [section.key]: prev[section.key].filter(
                                          (_, i) => i !== index,
                                        ),
                                      }))
                                    }
                                    className="ml-0.5 opacity-60 hover:opacity-100"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── SEO Tab ── */}
            {activeTab === "SEO" && (
              <div className="space-y-6 h-full ">
                {/* Meta Title */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Meta Title
                    </label>
                    <span
                      className={`text-[10px] font-mono ${(formData.metaTitle?.length || 0) >= 60 ? "text-rose-500" : "text-slate-400"}`}
                    >
                      {formData.metaTitle?.length || 0}/60
                    </span>
                  </div>
                  <input
                    name="metaTitle"
                    value={formData.metaTitle}
                    onChange={handleChange}
                    maxLength={60}
                    placeholder="SEO friendly title"
                    className="w-full bg-white border border-slate-300 px-3 py-2.5 rounded-lg text-sm outline-none focus:border-slate-900 transition"
                  />
                </div>

                {/* Meta Description */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Meta Description
                    </label>
                    <span
                      className={`text-[10px] font-mono ${(formData.metaDescription?.length || 0) >= 160 ? "text-rose-500" : "text-slate-400"}`}
                    >
                      {formData.metaDescription?.length || 0}/160
                    </span>
                  </div>
                  <textarea
                    name="metaDescription"
                    value={formData.metaDescription}
                    onChange={handleChange}
                    rows={3}
                    maxLength={160}
                    placeholder="Brief summary for search results..."
                    className="w-full bg-white border border-slate-300 px-3 py-2.5 rounded-lg text-sm outline-none focus:border-slate-900 transition resize-none"
                  />
                </div>

                {/* Meta Keywords */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Meta Keywords
                  </label>
                  <input
                    name="metaKeywords"
                    value={formData.metaKeywords}
                    onChange={handleChange}
                    placeholder="fashion, saree, ethnic (comma separated)"
                    className="w-full bg-white border border-slate-300 px-3 py-2.5 rounded-lg text-sm outline-none focus:border-slate-900 transition"
                  />
                </div>

                {/* Canonical URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Canonical URL
                  </label>
                  <input
                    name="canonicalUrl"
                    value={formData.canonicalUrl}
                    onChange={handleChange}
                    placeholder="https://original-link.com"
                    className="w-full bg-white border border-slate-300 px-3 py-2.5 rounded-lg text-sm outline-none focus:border-slate-900 transition"
                  />
                </div>

                {/* OG Image */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                    OG Image (Social Share)
                  </label>
                  <p className="text-[10px] font-semibold text-slate-500">
                    Required aspect ratio: {OG_RATIO_LABEL}
                  </p>
                  <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl">
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center border border-dashed border-slate-300 overflow-hidden shrink-0">
                      {previewOgImage ? (
                        <img
                          src={previewOgImage}
                          className="w-full h-full object-cover"
                          alt="OG Preview"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/placeholder.png";
                          }}
                        />
                      ) : (
                        <Upload size={20} className="text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-700 cursor-pointer"
                        onChange={(e) => handleFileChange(e, "ogImage")}
                      />
                      <p className="text-[9px] text-slate-400 mt-2">
                        Visible when category is shared on WhatsApp/Facebook
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-white flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 ${initialData ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-900 hover:bg-black"} text-white py-2 rounded-lg font-bold text-sm transition shadow-md flex items-center justify-center active:scale-[0.98] disabled:opacity-70`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : initialData ? (
                "Update Category"
              ) : (
                "Create Category"
              )}
            </button>
          </div>
        </form>
      </div>
      <CreateChartModal
        isOpen={isCreateChartModalOpen}
        onClose={() => setIsCreateChartModalOpen(false)}
        onSuccess={handleSizeChartCreated}
      />
    </div>
  );
}
