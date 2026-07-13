"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Search, X, FileText, Globe } from "lucide-react";
import TiptapEditor from "@/components/TiptapEditor";
import SchemaEditor from "@/components/admin/seo/SchemaEditor";
import { validateJsonLd } from "@/utils/jsonLd";
import axios from "axios";
import { API_BASE_URL } from "@/services/api";
import toast from "react-hot-toast";

const emptyDoc = { type: "doc", content: [{ type: "paragraph" }] };

const defaultForm = {
  title: "",
  slug: "",
  content: emptyDoc,
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  canonicalUrl: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  seoSchema: "",
  status: "Draft",
  footerPlacement: "none",
};

const slugify = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\/\s\-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^-+/g, ""); // Allow trailing dash while typing

export default function StaticPageForm({
  isOpen,
  initialData,
  loading,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState(defaultForm);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [jsonError, setJsonError] = useState(null);
  const [isSchemaLoading, setIsSchemaLoading] = useState(false);
  const [autoSchema, setAutoSchema] = useState("");
  const [activeTab, setActiveTab] = useState("content"); // "content", "seo"

  useEffect(() => {
    if (!isOpen) return;
    setFormData(
      initialData
        ? {
            ...defaultForm,
            ...initialData,
            content: initialData.content || emptyDoc,
            seoSchema: initialData.seoSchema || initialData.schema || "",
            status: initialData.status || "Draft",
            footerPlacement: initialData.footerPlacement || "none",
          }
        : defaultForm,
    );
    setIsSlugManuallyEdited(Boolean(initialData?.slug));
    setAutoSchema("");
    setActiveTab("content");
  }, [initialData, isOpen]);

  useEffect(() => {
    const validation = validateJsonLd(formData.seoSchema || "");
    setJsonError(validation.valid ? null : validation.error);
  }, [formData.seoSchema]);

  useEffect(() => {
    if (!isOpen || formData.seoSchema?.trim()) return;
    if (initialData && (initialData.title || initialData.metaTitle)) {
      generateSchema(true);
    }
  }, [isOpen, initialData]);

  const finalSlug = useMemo(
    () => slugify(formData.slug || formData.title),
    [formData.slug, formData.title],
  );

  const updateField = (field, value) => {
    if (field === "slug") {
      setIsSlugManuallyEdited(Boolean(value));
    }
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "title" && !isSlugManuallyEdited) {
        next.slug = slugify(value);
      }
      if (field === "slug") {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const generateSchema = async (applyToForm = true) => {
    try {
      setIsSchemaLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/pages/generate-schema`,
        {
          ...formData,
          slug: finalSlug,
        },
        { withCredentials: true },
      );
      if (res.data.success) {
        setAutoSchema(res.data.schema || "");
        if (applyToForm) {
          updateField("seoSchema", res.data.schema || "");
          setJsonError(null);
          toast.success("Schema generated");
        }
      }
    } catch (error) {
      toast.error("Failed to generate schema");
    } finally {
      setIsSchemaLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const schemaValidation = validateJsonLd(formData.seoSchema || "");
    if (!schemaValidation.valid) {
      setJsonError(schemaValidation.error);
      toast.error(schemaValidation.error);
      return;
    }

    const cleanSlug = finalSlug
      .trim()
      .replace(/^\/+/, "")
      .replace(/\/+$/, "")
      .replace(/^-+|-+$/g, "");
    onSubmit({
      ...formData,
      slug: cleanSlug,
      metaTitle: formData.metaTitle || formData.title,
      seoSchema: schemaValidation.formatted || "",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-[150] p-4 text-black">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* --- HEADER --- */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {initialData ? "Edit Static Page" : "Create Static Page"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Manage content, SEO, publishing, and footer placement
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* --- TABS BAR --- */}
        <div className="flex border-b border-slate-100 bg-slate-50/30 px-6">
          <button
            type="button"
            onClick={() => setActiveTab("content")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "content"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <FileText size={14} />
            Page Content
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("seo")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "seo"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Globe size={14} />
            SEO & Schema
          </button>
        </div>

        {/* --- FORM BODY --- */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <div className="p-6 flex-1">
            {/* TAB: CONTENT */}
            {activeTab === "content" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* General Details Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                      Page Title
                    </span>
                    <input
                      required
                      value={formData.title}
                      onChange={(event) => updateField("title", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                      placeholder="About Us"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                      URL Slug
                    </span>
                    <div className="flex rounded-xl border border-slate-200 overflow-hidden focus-within:border-slate-400">
                      <span className="bg-slate-50 px-4 py-3 text-sm text-slate-400 border-r border-slate-200">
                        /
                      </span>
                      <input
                        value={formData.slug}
                        onChange={(event) => updateField("slug", event.target.value)}
                        className="w-full bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                        placeholder="about-us"
                      />
                    </div>
                    <span className="mt-1.5 block text-xs font-semibold text-slate-400">
                      Preview: /{finalSlug || "page-url"}
                    </span>
                  </label>
                </div>

                {/* Page Settings Row inside Content Tab */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                      Publish Status
                    </span>
                    <select
                      value={formData.status}
                      onChange={(event) => updateField("status", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                    </select>
                    <span className="mt-1.5 block text-[10px] font-semibold text-slate-400">
                      Draft pages are hidden on the storefront.
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                      Footer Placement
                    </span>
                    <select
                      value={formData.footerPlacement}
                      onChange={(event) =>
                        updateField("footerPlacement", event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none"
                    >
                      <option value="none">None</option>
                      <option value="footer_column_1">Footer Column 1</option>
                      <option value="footer_column_2">Footer Column 2</option>
                      <option value="footer_column_3">Footer Column 3</option>
                    </select>
                    <span className="mt-1.5 block text-[10px] font-semibold text-slate-400">
                      Only published pages assigned to a footer column appear in the footer.
                    </span>
                  </label>
                </div>

                {/* Rich Text Editor */}
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-black uppercase tracking-wide text-slate-600">
                    Rich Text Content
                  </label>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden [&_.ProseMirror]:text-slate-900 [&_.tiptap]:text-slate-900">
                    <TiptapEditor
                      value={formData.content}
                      outputFormat="json"
                      onChange={(value) => updateField("content", value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SEO & SCHEMA */}
            {activeTab === "seo" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Search size={16} />
                    SEO Metadata
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                        Meta Title
                      </span>
                      <input
                        value={formData.metaTitle}
                        onChange={(event) => updateField("metaTitle", event.target.value)}
                        placeholder="Meta title"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 bg-white"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                        Canonical URL
                      </span>
                      <input
                        value={formData.canonicalUrl}
                        onChange={(event) =>
                          updateField("canonicalUrl", event.target.value)
                        }
                        placeholder="Canonical URL"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 bg-white"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                        Meta Description
                      </span>
                      <textarea
                        rows={3}
                        value={formData.metaDescription}
                        onChange={(event) =>
                          updateField("metaDescription", event.target.value)
                        }
                        placeholder="Meta description"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 bg-white"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                        Meta Keywords
                      </span>
                      <textarea
                        rows={3}
                        value={formData.metaKeywords}
                        onChange={(event) =>
                          updateField("metaKeywords", event.target.value)
                        }
                        placeholder="designer saree, ethnic wear"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 bg-white"
                      />
                    </label>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl p-5">
                  <SchemaEditor
                    value={formData.seoSchema}
                    onChange={(value) => updateField("seoSchema", value)}
                    onGenerate={() => generateSchema(true)}
                    onReset={() => {
                      if (!autoSchema) return;
                      updateField("seoSchema", autoSchema);
                      setJsonError(null);
                    }}
                    error={jsonError}
                    isLoading={isSchemaLoading}
                    autoSchemaAvailable={Boolean(autoSchema)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* --- FOOTER ACTIONS --- */}
          <div className="border-t border-slate-200 bg-white p-4 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 bg-slate-900 hover:bg-black cursor-pointer text-white rounded-lg font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save Page
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
