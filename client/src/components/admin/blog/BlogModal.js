"use client";

import { useState, useEffect } from "react";
import {
  X,
  Newspaper,
  Edit3,
  Loader2,
  ImageIcon,
  Search,
  Upload,
} from "lucide-react";
import { addBlog, updateBlog } from "@/services/blogService";
import { toast } from "react-hot-toast";
import TiptapEditor from "@/components/TiptapEditor";
import {
  getRatioLabel,
  validateImageAspectRatio,
} from "@/utils/imageAspectRatio";

const BANNER_RATIO = { width: 3, height: 2 };
const CONTENT_RATIO = { width: 960, height: 640 };
const BANNER_RATIO_LABEL = getRatioLabel(BANNER_RATIO.width, BANNER_RATIO.height);
const CONTENT_RATIO_LABEL = getRatioLabel(
  CONTENT_RATIO.width,
  CONTENT_RATIO.height,
);
const OG_RATIO = { width: 1200, height: 630 };
const OG_RATIO_LABEL = getRatioLabel(OG_RATIO.width, OG_RATIO.height);
const TABS = ["Details", "SEO"];

export default function BlogModal({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
}) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Details");
  const [bannerPreview, setBannerPreview] = useState(null);
  const [contentImagePreview, setContentImagePreview] = useState(null);
  const [ogImagePreview, setOgImagePreview] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    tags: "",
    isPublished: true,
    status: "Active",
    bannerImage: null,
    contentImage: null,
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
        title: initialData?.title || "",
        content: initialData?.content || "",
        excerpt: initialData?.excerpt || "",
        tags: initialData?.tags?.join(", ") || "",
        isPublished: initialData?.isPublished ?? true,
        status: initialData?.status || "Active",
        bannerImage: null,
        contentImage: null,
        metaTitle: initialData?.metaTitle || "",
        metaDescription: initialData?.metaDescription || "",
        metaKeywords: initialData?.metaKeywords || "",
        canonicalUrl: initialData?.canonicalUrl || "",
        ogImage: null,
      });

      if (initialData?.bannerImage) {
        setBannerPreview(initialData.bannerImage.url || initialData.bannerImage);
      } else {
        setBannerPreview(null);
      }

      if (initialData?.contentImage) {
        setContentImagePreview(
          initialData.contentImage.url || initialData.contentImage,
        );
      } else {
        setContentImagePreview(null);
      }

      if (initialData?.ogImage) {
        setOgImagePreview(initialData.ogImage.url || initialData.ogImage);
      } else {
        setOgImagePreview(null);
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    return () => {
      if (bannerPreview && bannerPreview.startsWith("blob:")) {
        URL.revokeObjectURL(bannerPreview);
      }
      if (contentImagePreview && contentImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(contentImagePreview);
      }
      if (ogImagePreview && ogImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(ogImagePreview);
      }
    };
  }, [bannerPreview, contentImagePreview, ogImagePreview]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      (async () => {
        try {
          if (file.size > 3 * 1024 * 1024) {
            e.target.value = "";
            return toast.error("File size should be less than 3MB");
          }
          await validateImageAspectRatio(file, BANNER_RATIO, {
            label: "Blog banner image",
          });
          if (bannerPreview && bannerPreview.startsWith("blob:")) {
            URL.revokeObjectURL(bannerPreview);
          }
          setFormData((prev) => ({ ...prev, bannerImage: file }));
          setBannerPreview(URL.createObjectURL(file));
        } catch (err) {
          toast.error(err.message || "Invalid blog banner image");
          e.target.value = "";
        }
      })();
    }
  };

  const handleContentImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      (async () => {
        try {
          if (file.size > 3 * 1024 * 1024) {
            e.target.value = "";
            return toast.error("File size should be less than 3MB");
          }
          await validateImageAspectRatio(file, CONTENT_RATIO, {
            label: "Blog content image",
          });
          if (contentImagePreview && contentImagePreview.startsWith("blob:")) {
            URL.revokeObjectURL(contentImagePreview);
          }
          setFormData((prev) => ({ ...prev, contentImage: file }));
          setContentImagePreview(URL.createObjectURL(file));
        } catch (err) {
          toast.error(err.message || "Invalid blog content image");
          e.target.value = "";
        }
      })();
    }
  };

  const handleOgImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      (async () => {
        try {
          if (file.size > 3 * 1024 * 1024) {
            e.target.value = "";
            return toast.error("File size should be less than 3MB");
          }
          await validateImageAspectRatio(file, OG_RATIO, {
            label: "Blog OG image",
          });
          if (ogImagePreview && ogImagePreview.startsWith("blob:")) {
            URL.revokeObjectURL(ogImagePreview);
          }
          setFormData((prev) => ({ ...prev, ogImage: file }));
          setOgImagePreview(URL.createObjectURL(file));
        } catch (err) {
          toast.error(err.message || "Invalid blog OG image");
          e.target.value = "";
        }
      })();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.content || formData.content === "<p></p>") {
      return toast.error("Content is required");
    }

    setLoading(true);
    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key === "bannerImage" || key === "contentImage") {
        if (formData[key]) data.append(key, formData[key]);
      } else if (key === "ogImage") {
        if (formData[key]) data.append(key, formData[key]);
      } else {
        data.append(key, formData[key]);
      }
    });

    try {
      const res = initialData
        ? await updateBlog(initialData._id, data)
        : await addBlog(data);
      if (res.success) {
        toast.success(initialData ? "Blog Updated!" : "Blog Published!");
        onSuccess();
        onClose();
      }
    } catch (err) {
      const errorMessage = err.message || "Something went wrong";
      toast.error(errorMessage);
      console.error("Submission error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[96vw] overflow-hidden border border-slate-200 flex flex-col max-h-[95vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 ${initialData ? "bg-blue-600" : "bg-slate-900"} text-white rounded-lg`}
            >
              {initialData ? <Edit3 size={18} /> : <Newspaper size={18} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {initialData ? "Edit Blog Post" : "Add New Blog"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {initialData
                  ? "Modify existing blog content and settings"
                  : "Create a new story for your audience"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 cursor-pointer hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-200 px-6 bg-white flex-shrink-0">
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

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {activeTab === "Details" && (
              <div className="flex space-x-10 p-6">
                <div className="flex-1 min-w-0">
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Banner Image
                        </label>
                        <p className="text-[10px] font-semibold text-slate-500 mb-1">
                          Required aspect ratio: {BANNER_RATIO_LABEL}
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-24 rounded-lg border border-slate-400 overflow-hidden bg-slate-50 flex-shrink-0">
                            {bannerPreview ? (
                              <img
                                src={bannerPreview}
                                alt="Banner Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-slate-300">
                                <Newspaper size={24} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleBannerChange}
                              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-black file:cursor-pointer cursor-pointer"
                            />
                            <p className="text-[10px] text-slate-400 mt-2 italic font-medium">
                              Max 3MB
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1 italic font-medium">
                              Target ratio: 3:2
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Content Image
                        </label>
                        <p className="text-[10px] font-semibold text-slate-500 mb-1">
                          Required aspect ratio: {CONTENT_RATIO_LABEL}
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-24 rounded-lg border border-slate-400 overflow-hidden bg-slate-50 flex-shrink-0">
                            {contentImagePreview ? (
                              <img
                                src={contentImagePreview}
                                alt="Content Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-slate-300">
                                <ImageIcon size={24} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleContentImageChange}
                              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-black file:cursor-pointer cursor-pointer"
                            />
                            <p className="text-[10px] text-slate-400 mt-2 italic font-medium">
                              Max 3MB
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1 italic font-medium">
                              Size: 960 X 640
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Blog Title
                      </label>
                      <input
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="e.g. 5 Tips for Better Web Design"
                        className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 placeholder:text-slate-500 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Status
                        </label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none cursor-pointer transition appearance-none"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Short Summary (Excerpt)
                      </label>
                      <textarea
                        name="excerpt"
                        rows="2"
                        value={formData.excerpt}
                        onChange={handleChange}
                        placeholder="Briefly describe what this blog is about..."
                        className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 cursor-text"
                        maxLength={200}
                      />
                      <p className="text-[10px] text-right text-slate-400 mt-1">
                        {formData.excerpt.length}/200 characters
                      </p>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Tags
                        </label>
                        <input
                          name="tags"
                          value={formData.tags}
                          onChange={handleChange}
                          placeholder="react, tailwind, coding..."
                          className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 placeholder:text-slate-500 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition"
                        />
                      </div>

                      <div className="flex items-center gap-2 px-1">
                        <input
                          type="checkbox"
                          id="isPublished"
                          name="isPublished"
                          checked={formData.isPublished}
                          onChange={handleChange}
                          className="w-4 h-4 accent-slate-900 cursor-pointer"
                        />
                        <label
                          htmlFor="isPublished"
                          className="text-xs font-bold text-slate-900 uppercase tracking-wider cursor-pointer"
                        >
                          Publish to website immediately
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Main Content
                  </label>
                  <div className="border border-slate-400 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-slate-900 focus-within:border-slate-900 transition">
                    <TiptapEditor
                      value={formData.content}
                      onChange={(html) =>
                        setFormData((prev) => ({ ...prev, content: html }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "SEO" && (
              <div className="p-6">
                <div className="space-y-6 max-w-4xl">
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Meta Title
                      </label>
                      <span
                        className={`text-[10px] font-mono ${
                          (formData.metaTitle?.length || 0) >= 60
                            ? "text-rose-500"
                            : "text-slate-400"
                        }`}
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
                      className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 placeholder:text-slate-500 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Meta Description
                      </label>
                      <span
                        className={`text-[10px] font-mono ${
                          (formData.metaDescription?.length || 0) >= 160
                            ? "text-rose-500"
                            : "text-slate-400"
                        }`}
                      >
                        {formData.metaDescription?.length || 0}/160
                      </span>
                    </div>
                    <textarea
                      name="metaDescription"
                      value={formData.metaDescription}
                      onChange={handleChange}
                      rows="4"
                      maxLength={160}
                      placeholder="Brief summary for search results..."
                      className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 placeholder:text-slate-500 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Meta Keywords
                    </label>
                    <input
                      name="metaKeywords"
                      value={formData.metaKeywords}
                      onChange={handleChange}
                      placeholder="bridal saree, handwork, designer saree"
                      className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 placeholder:text-slate-500 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Canonical URL
                    </label>
                    <input
                      name="canonicalUrl"
                      value={formData.canonicalUrl}
                      onChange={handleChange}
                      placeholder="https://yourdomain.com/blog/example-post"
                      className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 placeholder:text-slate-500 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                      OG Image
                    </label>
                    <p className="text-[10px] font-semibold text-slate-500">
                      Required aspect ratio: {OG_RATIO_LABEL}
                    </p>
                    <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl">
                      <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center border border-dashed border-slate-300 overflow-hidden shrink-0">
                        {ogImagePreview ? (
                          <img
                            src={ogImagePreview}
                            className="w-full h-full object-cover"
                            alt="OG Preview"
                          />
                        ) : (
                          <Upload size={20} className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleOgImageChange}
                          className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-700 cursor-pointer"
                        />
                        <p className="text-[9px] text-slate-400 mt-2">
                          Used when this blog page is shared on WhatsApp,
                          Facebook, and other social platforms.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3 bg-white flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border cursor-pointer border-slate-400 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-[2] cursor-pointer ${initialData ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-900 hover:bg-black"} text-white py-2.5 rounded-lg font-bold text-sm transition shadow-lg active:scale-[0.98] disabled:opacity-70 flex items-center justify-center`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : initialData ? (
                "Update Blog"
              ) : (
                "Confirm & Add Blog"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
