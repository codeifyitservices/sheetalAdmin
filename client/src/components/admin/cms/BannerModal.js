"use client";

import { useState, useEffect } from "react";
import {
  X,
  Upload,
  Loader2,
  ImageIcon,
  Edit3,
} from "lucide-react";
import { addBanner, updateBanner } from "@/services/bannerService";
import { getCategories } from "@/services/categoryService";
import { getProducts } from "@/services/productService";
import toast from "react-hot-toast";
import {
  getRatioLabel,
  validateImageAspectRatio,
} from "@/utils/imageAspectRatio";

const DESKTOP_RATIO = { width: 1920, height: 720 };
const MOBILE_RATIO = { width: 800, height: 1000 };
const DESKTOP_RATIO_LABEL = getRatioLabel(
  DESKTOP_RATIO.width,
  DESKTOP_RATIO.height,
);
const MOBILE_RATIO_LABEL = getRatioLabel(
  MOBILE_RATIO.width,
  MOBILE_RATIO.height,
);

export default function BannerModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) {
  const [loading, setLoading] = useState(false);
  const [desktopPreview, setDesktopPreview] = useState("");
  const [mobilePreview, setMobilePreview] = useState("");
  const [selectedDesktopFile, setSelectedDesktopFile] = useState(null);
  const [selectedMobileFile, setSelectedMobileFile] = useState(null);

  const isEdit = !!initialData;

  const [formData, setFormData] = useState({
    title: "",
    status: "Active",
    startsAt: null,
    expiresAt: null,
  });

  const [linkType, setLinkType] = useState("custom"); // New state for link type
  const [customLink, setCustomLink] = useState(""); // New state for custom link
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(""); // New state for category slug
  const [selectedProductSlug, setSelectedProductSlug] = useState(""); // New state for product slug
  const [staticPage, setStaticPage] = useState(""); // New state for static page

  const [allCategories, setAllCategories] = useState([]); // New state for all categories
  const [allProducts, setAllProducts] = useState([]); // New state for all products


  // Fetch categories and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Categories
        const categoriesRes = await getCategories(1, 1000, "");
        console.log("Categories Response:", categoriesRes);
        if (categoriesRes.success) {
          // Handle different possible response structures
          const categories = categoriesRes.data?.categories || categoriesRes.categories || [];
          setAllCategories(Array.isArray(categories) ? categories : []);
        } else {
          toast.error("Could not load categories.");
          setAllCategories([]);
        }

        // Fetch Products
        const productsRes = await getProducts(1, 1000, "");
        console.log("Products Response:", productsRes);
        if (productsRes.success) {
          // Handle different possible response structures
          const products = productsRes.products || productsRes.data?.products || [];
          setAllProducts(Array.isArray(products) ? products : []);
        } else {
          toast.error("Could not load products.");
          setAllProducts([]);
        }
      } catch (error) {
        console.error("Failed to fetch categories or products:", error);
        toast.error("Failed to load link options.");
        // Ensure arrays are set even on error
        setAllCategories([]);
        setAllProducts([]);
      }
    };
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);


  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          title: initialData.title || "",
          status: initialData.status || "Active",
          startsAt: initialData.startsAt
            ? new Date(initialData.startsAt).toISOString().split("T")[0]
            : "",
          expiresAt: initialData.expiresAt
            ? new Date(initialData.expiresAt).toISOString().split("T")[0]
            : "",
        });

        // Parse initial link to determine linkType
        const link = initialData.link || "";
        if (link === "/") {
          setLinkType("home");
        } else if (link.startsWith("/product-list?category=")) {
          setLinkType("category");
          setSelectedCategorySlug(link.split("=")[1]);
        } else if (
          link.startsWith("/") &&
          !link.startsWith("/product/") &&
          link !== "/about-us" &&
          link !== "/contact-us" &&
          link !== "/blogs"
        ) {
          setLinkType("category");
          setSelectedCategorySlug(link.split("/")[1] || "");
        } else if (link.startsWith("/product/")) {
          setLinkType("product");
          setSelectedProductSlug(link.split("/")[2]);
        } else if (
          link === "/about-us" ||
          link === "/contact-us" ||
          link === "/blogs"
        ) {
          setLinkType("static");
          setStaticPage(link);
        } else {
          setLinkType("custom");
          setCustomLink(link);
        }

        if (initialData?.image?.desktop?.url) {
          setDesktopPreview(initialData.image.desktop.url);
        } else {
          setDesktopPreview(null);
        }
        if (initialData?.image?.mobile?.url) {
          setMobilePreview(initialData.image.mobile.url);
        } else {
          setMobilePreview(null);
        }
      } else {
        // Reset for new banner
        setFormData({
          title: "",
          status: "Active",
          startsAt: null,
        });
        setDesktopPreview("");
        setMobilePreview("");
        setSelectedDesktopFile(null);
        setSelectedMobileFile(null);
        setLinkType("custom");
        setCustomLink("");
        setSelectedCategorySlug("");
        setSelectedProductSlug("");
        setStaticPage("");
        setFormData((prev) => ({ ...prev, startsAt: null, expiresAt: null }));
      }
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleDesktopImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      (async () => {
        try {
          if (file.size > 5 * 1024 * 1024) {
            e.target.value = "";
            return toast.error("File too large (Max 5MB)");
          }
          await validateImageAspectRatio(file, DESKTOP_RATIO, {
            label: "Desktop banner image",
          });
          setSelectedDesktopFile(file);
          setDesktopPreview(URL.createObjectURL(file));
        } catch (err) {
          toast.error(err.message || "Invalid banner image");
          e.target.value = "";
        }
      })();
    }
  };

  const handleMobileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      (async () => {
        try {
          if (file.size > 5 * 1024 * 1024) {
            e.target.value = "";
            return toast.error("File too large (Max 5MB)");
          }
          await validateImageAspectRatio(file, MOBILE_RATIO, {
            label: "Mobile banner image",
          });
          setSelectedMobileFile(file);
          setMobilePreview(URL.createObjectURL(file));
        } catch (err) {
          toast.error(err.message || "Invalid banner image");
          e.target.value = "";
        }
      })();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let finalLink = "";
    switch (linkType) {
      case "home":
        finalLink = "/";
        break;
      case "category":
        finalLink = `/${selectedCategorySlug}`;
        break;
      case "product":
        finalLink = `/product/${selectedProductSlug}`;
        break;
      case "static":
        finalLink = staticPage;
        break;
      case "custom":
        finalLink = customLink;
        break;
      default:
        finalLink = "/";
    }

    const data = new FormData();
    data.append("title", formData.title);
    data.append("link", finalLink); // Use the constructed link
    data.append("status", formData.status);
    if (formData.startsAt) {
      data.append("startsAt", new Date(formData.startsAt).toISOString());
    }
    if (formData.expiresAt) {
      data.append("expiresAt", new Date(formData.expiresAt).toISOString());
    }

    if (selectedDesktopFile) data.append("desktopImage", selectedDesktopFile);
    if (selectedMobileFile) data.append("mobileImage", selectedMobileFile);

    try {
      const res = isEdit
        ? await updateBanner(initialData._id, data)
        : await addBanner(data);
      if (res.success) {
        toast.success(isEdit ? "Banner Updated!" : "Banner Created!");
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4 transition-all">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200">
        {/* --- HEADER --- */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${isEdit ? "bg-blue-600" : "bg-slate-900"} text-white rounded-lg`}>
              {isEdit ? <Edit3 size={18} /> : <ImageIcon size={18} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {isEdit ? "Edit Banner Details" : "Add New Banner"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isEdit ? "Modify existing slide information" : "Create a new homepage slider"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* --- FORM --- */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 p-6">
            {/* --- LEFT COLUMN (IMAGES) --- */}
            <div className="space-x-6 flex items-center">
              {/* Desktop Image */}
              <div className="relative group w-full max-w-xs">
                <h3 className="text-center text-sm font-bold mb-2 uppercase tracking-wider text-slate-700">Desktop Image (1920x720)</h3>
                <p className="text-center text-[10px] font-semibold text-slate-500 mb-2">
                  Required aspect ratio: {DESKTOP_RATIO_LABEL}
                </p>
                <div className="aspect-video">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDesktopImageChange}
                    className="hidden"
                    id="desktop-banner-img-input"
                  />
                  <label
                    htmlFor="desktop-banner-img-input"
                    className="block w-full h-full rounded-lg border-2 border-dashed border-slate-300 hover:border-slate-500 transition-all cursor-pointer overflow-hidden relative bg-slate-50 shadow-inner flex items-center justify-center"
                  >
                    {desktopPreview ? (
                      <img src={desktopPreview} alt="desktop preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Upload size={32} />
                        <span className="text-xs mt-2 font-semibold">Select Banner</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Mobile Image */}
              <div className="relative group w-full max-w-[150px]">
                <h3 className="text-center text-sm font-bold mb-2 uppercase tracking-wider text-slate-700">Mobile Image (800x1000)</h3>
                <p className="text-center text-[10px] font-semibold text-slate-500 mb-2">
                  Required aspect ratio: {MOBILE_RATIO_LABEL}
                </p>
                <div className="aspect-[9/16]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMobileImageChange}
                    className="hidden"
                    id="mobile-banner-img-input"
                  />
                  <label
                    htmlFor="mobile-banner-img-input"
                    className="block w-full h-full rounded-lg border-2 border-dashed border-slate-300 hover:border-slate-500 transition-all cursor-pointer overflow-hidden relative bg-slate-50 shadow-inner flex items-center justify-center"
                  >
                    {mobilePreview ? (
                      <img src={mobilePreview} alt="mobile preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Upload size={32} />
                        <span className="text-xs mt-2 font-semibold">Select Banner</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* --- RIGHT COLUMN (INPUTS) --- */}
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">Banner Title</label>
                <input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Summer Collection Sale"
                  className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none cursor-pointer appearance-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">Start Date</label>
                  <input
                    type="date"
                    value={formData.startsAt || ""}
                    onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                    className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">Expiration Date</label>
                  <input
                    type="date"
                    value={formData.expiresAt || ""}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">Redirect Link Type</label>
                <select
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value)}
                  className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none cursor-pointer appearance-none"
                >
                  <option value="custom">Custom URL</option>
                  <option value="home">Home Page</option>
                  <option value="category">Category Page</option>
                  <option value="product">Product Page</option>
                  <option value="static">Static Page</option>
                </select>
              </div>

              {linkType === 'custom' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">Custom Redirect Link</label>
                  <input
                    value={customLink}
                    onChange={(e) => setCustomLink(e.target.value)}
                    placeholder="e.g. https://www.example.com/promo"
                    className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none transition"
                  />
                </div>
              )}
              {linkType === 'category' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">Select Category</label>
                  <select
                    value={selectedCategorySlug}
                    onChange={(e) => setSelectedCategorySlug(e.target.value)}
                    className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none cursor-pointer appearance-none"
                  >
                    <option value="">-- Select a Category --</option>
                    {Array.isArray(allCategories) && allCategories.map((cat) => (
                      <option key={cat._id} value={cat.slug}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {linkType === 'product' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">Select Product</label>
                  <select
                    value={selectedProductSlug}
                    onChange={(e) => setSelectedProductSlug(e.target.value)}
                    className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none cursor-pointer appearance-none"
                  >
                    <option value="">-- Select a Product --</option>
                    {Array.isArray(allProducts) && allProducts.map((p) => (
                      <option key={p._id} value={p.slug}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {linkType === 'static' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">Select Static Page</label>
                  <select
                    value={staticPage}
                    onChange={(e) => setStaticPage(e.target.value)}
                    className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none cursor-pointer appearance-none"
                  >
                    <option value="">-- Select a Page --</option>
                    <option value="/about-us">About Us</option>
                    <option value="/contact-us">Contact Us</option>
                    <option value="/blogs">Blogs</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* --- ACTIONS --- */}
          <div className="px-6 pb-6 pt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 cursor-pointer px-4 py-2.5 border border-slate-400 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-[2] cursor-pointer ${isEdit ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-900 hover:bg-black"} text-white py-2.5 rounded-lg font-bold text-sm transition shadow-lg flex items-center justify-center active:scale-[0.98] disabled:opacity-70`}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (isEdit ? "Update Details" : "Confirm & Add")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
