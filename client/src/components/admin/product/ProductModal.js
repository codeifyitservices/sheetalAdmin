"use client";
import { useState, useEffect } from "react";
import {
  X,
  Package,
  Save,
  Layers,
  Image as ImageIcon,
  Settings,
  Shirt,
  Search,
} from "lucide-react";
import { createProduct, updateProduct } from "@/services/productService";
import { getCategories } from "@/services/categoryService";
import toast from "react-hot-toast";

// Import Modular Components
import BasicInfoParams from "./modal/BasicInfoParams";
import InventoryParams from "./modal/InventoryParams";
import SpecParams from "./modal/SpecParams";
import SeoParams from "./modal/SeoParams";
import MediaParams from "./modal/MediaParams";
import { sanitizeProductSlug } from "@/utils/productSlug";

export default function ProductModal({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
}) {
  const createInitialFormData = () => ({
    name: "",
    slug: "",
    sku: "",
    shortDescription: "",
    description: "",
    materialCare: "",
    lowStockThreshold: 5,
    stock: 0,
    category: "",
    subCategory: "",
    status: "Active",
    displayCollections: [],
    wearType: [],
    occasion: [],
    tags: [],
    variants: [],
    specifications: [],
    keyBenefits: [],
    eventTags: [],
    style: [],
    work: [],
    fabric: [],
    productType: [],
    byPrice: [],
    brandInfo: "",
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    ogImage: "",
    canonicalUrl: "",
    returnPolicy: "7 Days Easy Return",
    mainImage: { url: "", alt: "" },
    hoverImage: { url: "", alt: "" },
    mainImageFile: null,
    hoverImageFile: null,
    videoFile: null,
    isTrending: false,
    isNewArrival: false,
    isCollection: false,
  });

  const getChartSizeLabel = (row) =>
    String(row?.cells?.[0] || row?.label || "").trim();

  const getSeededSizesFromCategory = (category) => {
    if (category?.sizeMode === "free") {
      return [{ name: "Free Size", stock: 0, price: 0, discountPrice: 0 }];
    }

    const chart = category?.sizeChart;
    const chartSizes = Array.isArray(chart?.table) ? chart.table : [];
    const seededFromTable = chartSizes
      .map((row) => ({
        name: getChartSizeLabel(row),
        stock: 0,
        price: 0,
        discountPrice: 0,
      }))
      .filter((row) => row.name.trim() !== "");

    if (seededFromTable.length > 0) {
      return seededFromTable;
    }

    return [];
  };

  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const [formData, setFormData] = useState(createInitialFormData);

  const getDefaultVariantSizes = () => {
    const selectedCategory = categories.find(
      (cat) => cat._id === formData.category,
    );
    const seededSizes = getSeededSizesFromCategory(selectedCategory);

    if (seededSizes.length > 0) {
      return seededSizes;
    }

    return [{ name: "", stock: 0, price: 0, discountPrice: 0 }];
  };

  const createEmptyVariant = () => ({
    v_sku: "",
    color: { name: "", code: "#000000", swatchImage: "" },
    sizes: getDefaultVariantSizes(),
    v_image: "",
    videoFile: null,
    v_video: "",
    gallery: [],
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      if (initialData) {
        const { gstPercent, ...safeInitialData } = initialData;
        const variants = Array.isArray(initialData.variants)
          ? initialData.variants.map((v) => ({
              ...v,
              sizes: Array.isArray(v.sizes) ? v.sizes : [],
              gallery: Array.isArray(v.gallery) ? v.gallery : [],
              v_video: v.v_video || "",
            }))
          : [];
        setFormData({
          ...createInitialFormData(),
          ...safeInitialData,
          category: initialData.category?._id || initialData.category || "",
          slug: initialData.slug || "",
          subCategory: initialData.subCategory || "",
          isTrending: initialData.isTrending ?? false,
          isNewArrival: initialData.isNewArrival ?? false,
          isCollection: initialData.isCollection ?? false,
          displayCollections: Array.isArray(initialData.displayCollections)
            ? initialData.displayCollections
            : [],
          wearType: Array.isArray(initialData.wearType)
            ? initialData.wearType
            : [],
          occasion: Array.isArray(initialData.occasion)
            ? initialData.occasion
            : [],
          tags: Array.isArray(initialData.tags) ? initialData.tags : [],
          variants: variants,
          specifications: Array.isArray(initialData.specifications)
            ? initialData.specifications
            : [],
          keyBenefits: Array.isArray(initialData.keyBenefits)
            ? initialData.keyBenefits
            : [],
          eventTags: Array.isArray(initialData.eventTags)
            ? initialData.eventTags
            : [],
          style: Array.isArray(initialData.style) ? initialData.style : [],
          work: Array.isArray(initialData.work) ? initialData.work : [],
          fabric: Array.isArray(initialData.fabric) ? initialData.fabric : [],
          productType: Array.isArray(initialData.productType)
            ? initialData.productType
            : [],
          byPrice: Array.isArray(initialData.byPrice) ? initialData.byPrice : [],
          returnPolicy: initialData.returnPolicy || "7 Days Easy Return",
          price: undefined,
          discountPrice: undefined,
        });
        setIsSlugManuallyEdited(true);
      } else {
        resetForm();
      }
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    formData.variants.forEach((v) => {
      v.sizes.forEach((s) => {
        const currentPrice = Number(s.price);
        const currentDiscountPrice = Number(s.discountPrice);
        if (currentDiscountPrice > 0 && currentPrice <= currentDiscountPrice) {
          toast.error(
            `For size '${s.name}' (Variant: ${v.color?.name || "N/A"}), MRP Price (${currentPrice}) must be greater than Selling Price (${currentDiscountPrice}).`,
          );
        }
      });
    });
  }, [formData.variants]);

  useEffect(() => {
    if (!isOpen || !formData.category || categories.length === 0) return;

    const selectedCategory = categories.find(
      (cat) => cat._id === formData.category,
    );
    const seededSizes = getSeededSizesFromCategory(selectedCategory);

    if (seededSizes.length === 0) return;

    setFormData((prev) => {
      const nextVariants = Array.isArray(prev.variants)
        ? prev.variants.map((variant) =>
            !Array.isArray(variant.sizes) ||
            variant.sizes.length === 0 ||
            variant.sizes.every((size) => !String(size?.name || "").trim())
              ? { ...variant, sizes: seededSizes }
              : variant,
          )
        : [];

      const changed =
        nextVariants.length !== (prev.variants?.length || 0) ||
        nextVariants.some((variant, index) => variant !== prev.variants?.[index]);

      if (!changed) return prev;

      return {
        ...prev,
        variants: nextVariants,
      };
    });
  }, [categories, formData.category, isOpen]);

  const fetchCategories = async () => {
    try {
      const res = await getCategories(1, 1000);
      const actualArray =
        res?.categories?.categories || res?.data?.categories || [];
      setCategories(Array.isArray(actualArray) ? actualArray : []);
    } catch (err) {
      setCategories([]);
    }
  };

  const resetForm = () => {
    setFormData(createInitialFormData());
    setIsSlugManuallyEdited(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "category") {
      const selectedCategory = categories.find((cat) => cat._id === value);
      const seededSizes = getSeededSizesFromCategory(selectedCategory);

      setFormData((prev) => ({
        ...prev,
        category: value,
        subCategory: "", // Reset subcategory when category changes
        variants:
          seededSizes.length > 0
            ? prev.variants.map((variant) =>
                !Array.isArray(variant.sizes) ||
                variant.sizes.length === 0 ||
                variant.sizes.every((size) => !String(size?.name || "").trim())
                  ? { ...variant, sizes: seededSizes }
                  : variant,
              )
            : prev.variants,
      }));
    } else {
      const nextValue = type === "checkbox" ? checked : value;
      const nextSlugValue =
        name === "slug" ? sanitizeProductSlug(value) : undefined;

      if (name === "slug") {
        setIsSlugManuallyEdited(Boolean(nextSlugValue));
      }

      setFormData((prev) => {
        const nextState = {
          ...prev,
          [name]: nextValue,
        };

        if (name === "name" && !initialData && !isSlugManuallyEdited) {
          nextState.slug = sanitizeProductSlug(value);
        }

        if (name === "slug") {
          nextState.slug = nextSlugValue;
        }

        return nextState;
      });
    }
  };

  const handleAddTag = (e, field) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = e.target.value.trim();
      if (value && !formData[field].includes(value)) {
        setFormData((prev) => ({
          ...prev,
          [field]: [...prev[field], value],
        }));
        e.target.value = "";
      }
    }
  };

  const removeTag = (tagToRemove, field) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ── Final Duplicate Validation ──
    const colors = new Set();
    for (const v of formData.variants) {
      if (!v.color?.name?.trim()) {
        toast.error("All variants must have a color name.");
        return;
      }
      const normalizedColor = v.color.name
        .trim()
        .toLowerCase()
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      if (colors.has(normalizedColor)) {
        toast.error(`Duplicate variant color: "${normalizedColor}"`);
        return;
      }
      colors.add(normalizedColor);

      // Size check
      const sizes = new Set();
      for (const s of v.sizes) {
        if (!s.name?.trim()) {
          toast.error(`Missing size name for color "${normalizedColor}"`);
          return;
        }
        const normalizedSize = s.name.trim().toUpperCase();
        if (sizes.has(normalizedSize)) {
          toast.error(
            `Duplicate size "${normalizedSize}" in color "${normalizedColor}"`,
          );
          return;
        }
        sizes.add(normalizedSize);
      }
    }

    setLoading(true);
    try {
      const data = new FormData();
      const excludedKeys = [
        "mainImage",
        "hoverImage",
        "video",
        "ogImage",
        "mainImageFile",
        "hoverImageFile",
        "videoFile",
        "variants",
        "sizeChart",
        "category",
        "subCategory",
        "brand",
        "gstPercent",
      ];

      Object.keys(formData).forEach((key) => {
        if (
          [
            "specifications",
            "keyBenefits",
            "eventTags",
            "displayCollections",
            "wearType",
            "occasion",
            "tags",
            "style",
            "work",
            "fabric",
            "productType",
            "byPrice",
          ].includes(key)
        ) {
          data.append(key, JSON.stringify(formData[key] || []));
        } else if (
          key === "isTrending" ||
          key === "isNewArrival" ||
          key === "isCollection"
        ) {
          data.append(key, formData[key] === true ? "true" : "false");
        } else if (!excludedKeys.includes(key)) {
          if (formData[key] !== null && formData[key] !== undefined) {
            data.append(key, formData[key]);
          }
        }
      });

      ["sizeChart", "category", "subCategory", "brand"].forEach((field) => {
        if (
          formData[field] &&
          formData[field] !== "null" &&
          formData[field] !== ""
        ) {
          const value =
            typeof formData[field] === "object"
              ? formData[field]._id
              : formData[field];
          data.append(field, value);
        }
      });

        const cleanedVariants = formData.variants.map((v) => {
        const cleanedGallery = Array.isArray(v.gallery)
          ? v.gallery.slice(0, 6).map((item) => {
              if (item instanceof File) {
                data.append("variantGalleryImages", item);
                return { __newFile: true };
              }

              if (item?.url) {
                return {
                  url: item.url,
                  public_id: item.public_id || "",
                  alt: item.alt || "",
                };
              }

              return item;
            })
          : [];

        if (Array.isArray(v.gallery) && v.gallery.length > 6) {
          toast.error(
            "Each variant can have at most 6 gallery images. Extra images were ignored.",
          );
        }

        let cleanedVideo = "";
        if (v.videoFile instanceof File) {
          data.append("variantVideos", v.videoFile, v.videoFile.name);
        } else if (v.v_video?.url) {
          cleanedVideo = {
            url: v.v_video.url,
            public_id: v.v_video.public_id || "",
            mimeType: v.v_video.mimeType || "video/mp4",
            size: v.v_video.size || 0,
          };
        }

        const hasNewVideo = v.videoFile instanceof File;

        if (v.v_image instanceof File) {
          data.append("variantImages", v.v_image);
          return {
            ...v,
            hasNewImage: true,
            hasNewVideo,
            v_video: cleanedVideo,
            gallery: cleanedGallery,
          };
        }
        return {
          ...v,
          hasNewImage: false,
          hasNewVideo,
          v_video: cleanedVideo,
          gallery: cleanedGallery,
        };
      });
      data.append("variants", JSON.stringify(cleanedVariants));

      if (formData.mainImageFile) {
        data.append("mainImage", formData.mainImageFile);
      } else if (formData.mainImage?.url) {
        data.append("existingMainImage", formData.mainImage.url);
      }
      data.append("mainImageAlt", formData.mainImage?.alt || "");

      if (formData.hoverImageFile) {
        data.append("hoverImage", formData.hoverImageFile);
      } else if (formData.hoverImage?.url) {
        data.append("existingHoverImage", formData.hoverImage.url);
      }
      data.append("hoverImageAlt", formData.hoverImage?.alt || "");

      if (formData.videoFile) {
        data.append("video", formData.videoFile);
      } else if (typeof formData.video === "string") {
        data.append("existingVideo", formData.video);
      }

      if (formData.ogImage instanceof File) {
        data.append("ogImage", formData.ogImage);
      } else if (
        typeof formData.ogImage === "string" &&
        formData.ogImage !== ""
      ) {
        data.append("existingOgImage", formData.ogImage);
      }

      const result = initialData
        ? await updateProduct(initialData._id, data)
        : await createProduct(data);

      if (result.success) {
        toast.success(
          result.message ||
            (initialData ? "Product updated 🎉" : "Product created 🚀"),
        );
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Product Save Error:", error);
      toast.error(error.message || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4 text-left">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 flex flex-col h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 ${initialData ? "bg-blue-600" : "bg-slate-900"} text-white rounded-lg shadow-sm`}
            >
              <Package size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {initialData ? "Edit Product Details" : "Add New Inventory"}
              </h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                {initialData
                  ? "Modify clothing item details"
                  : "Add new clothes to store"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 cursor-pointer hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white px-4 sm:px-8 border-b border-slate-100 overflow-x-auto no-scrollbar">
          <div className="flex gap-4 sm:gap-8 min-w-max">
            {[
              {
                id: "basic",
                label: "Basic",
                fullLabel: "Basic Info",
                icon: <Settings size={16} />,
              },
              {
                id: "inventory",
                label: "Stock",
                fullLabel: "Variants & Stock",
                icon: <Layers size={16} />,
              },
              {
                id: "specs",
                label: "Specs",
                fullLabel: "Details & Care",
                icon: <Shirt size={16} />,
              },
              {
                id: "seo",
                label: "SEO & Meta",
                fullLabel: "SEO & Meta",
                icon: <Search size={14} />,
              },
              {
                id: "media",
                label: "Media",
                fullLabel: "Media Assets",
                icon: <ImageIcon size={16} />,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 shrink-0 cursor-pointer flex items-center gap-2 transition-all relative snap-align-start ${activeTab === tab.id ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
              >
                <span
                  className={`${activeTab === tab.id ? "scale-110" : ""} transition-transform`}
                >
                  {tab.icon}
                </span>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                  <span className="inline sm:hidden">{tab.label}</span>
                  <span className="hidden sm:inline">{tab.fullLabel}</span>
                </span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full animate-in fade-in slide-in-from-bottom-1 duration-300" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6 bg-white scrollbar-thin">
          <form id="productForm" onSubmit={handleSubmit} className="space-y-6">
            {activeTab === "basic" && (
              <BasicInfoParams
                formData={formData}
                handleChange={handleChange}
                setFormData={setFormData}
                categories={categories}
                handleAddTag={handleAddTag}
                removeTag={removeTag}
              />
            )}

            {activeTab === "inventory" && (
              <InventoryParams
                formData={formData}
                setFormData={setFormData}
                createEmptyVariant={createEmptyVariant}
              />
            )}

            {activeTab === "specs" && (
              <SpecParams formData={formData} setFormData={setFormData} />
            )}

            {activeTab === "seo" && (
              <SeoParams
                formData={formData}
                handleChange={handleChange}
                setFormData={setFormData}
              />
            )}

            {activeTab === "media" && (
              <MediaParams
                formData={formData}
                setFormData={setFormData}
              />
            )}
          </form>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-slate-100 bg-white flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 cursor-pointer py-2.5 border border-slate-400 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition uppercase tracking-wider"
          >
            Cancel Action
          </button>
          <button
            form="productForm"
            type="submit"
            disabled={loading}
            className={`flex-2 cursor-pointer ${initialData ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-900 hover:bg-black"} text-white py-2.5 rounded-lg font-bold text-sm transition shadow-lg active:scale-[0.98] uppercase tracking-widest flex items-center justify-center gap-2`}
          >
            <Save size={16} />{" "}
            {loading
              ? "Processing..."
              : initialData
                ? "Update Product"
                : "Publish Listing"}
          </button>
        </div>
      </div>
    </div>
  );
}
