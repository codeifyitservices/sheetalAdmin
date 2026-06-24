"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Search, X } from "lucide-react";
import TiptapEditor from "@/components/TiptapEditor";

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
  status: "Draft",
  footerPlacement: "none",
};

const slugify = (value = "") =>
  value
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/[^a-z0-9/ -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^-+|-+$/g, "");

export default function StaticPageForm({
  isOpen,
  initialData,
  loading,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(
      initialData
        ? {
            ...defaultForm,
            ...initialData,
            content: initialData.content || emptyDoc,
            status: initialData.status || "Draft",
            footerPlacement: initialData.footerPlacement || "none",
          }
        : defaultForm,
    );
  }, [initialData, isOpen]);

  const finalSlug = useMemo(
    () => slugify(formData.slug || formData.title),
    [formData.slug, formData.title],
  );

  const updateField = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "title" && !prev.slug) {
        next.slug = slugify(value);
      }
      if (field === "slug") {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      ...formData,
      slug: finalSlug,
      metaTitle: formData.metaTitle || formData.title,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-[150] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden border border-slate-200 animate-in zoom-in duration-200">
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

        <form onSubmit={handleSubmit} className="p-6 h-[78vh] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
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
                  <span className="mt-2 block text-xs font-semibold text-slate-500">
                    Preview: /{finalSlug || "page-url"}
                  </span>
                </label>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <label className="text-xs font-black uppercase tracking-wide text-slate-600">
                  Rich Text Content
                </label>
                <div className="[&_.ProseMirror]:text-slate-900 [&_.tiptap]:text-slate-900">
                  <TiptapEditor
                    value={formData.content}
                    outputFormat="json"
                    onChange={(value) => updateField("content", value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900">
                  <Search size={16} />
                  SEO Metadata
                </div>

                <input
                  value={formData.metaTitle}
                  onChange={(event) => updateField("metaTitle", event.target.value)}
                  placeholder="Meta title"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
                <textarea
                  rows={3}
                  value={formData.metaDescription}
                  onChange={(event) =>
                    updateField("metaDescription", event.target.value)
                  }
                  placeholder="Meta description"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
                <input
                  value={formData.metaKeywords}
                  onChange={(event) =>
                    updateField("metaKeywords", event.target.value)
                  }
                  placeholder="Meta keywords"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
                <input
                  value={formData.canonicalUrl}
                  onChange={(event) =>
                    updateField("canonicalUrl", event.target.value)
                  }
                  placeholder="Canonical URL"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              {/* <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Open Graph
                </h3>
                <input
                  value={formData.ogTitle}
                  onChange={(event) => updateField("ogTitle", event.target.value)}
                  placeholder="OG title"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
                <textarea
                  rows={3}
                  value={formData.ogDescription}
                  onChange={(event) =>
                    updateField("ogDescription", event.target.value)
                  }
                  placeholder="OG description"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
                <input
                  value={formData.ogImage}
                  onChange={(event) => updateField("ogImage", event.target.value)}
                  placeholder="OG image URL"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </div> */}

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
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
                  <span className="mt-2 block text-xs font-semibold text-slate-500">
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
                  <span className="mt-2 block text-xs font-semibold text-slate-500">
                    Only published pages assigned to a footer column appear in
                    the footer.
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 border-t border-slate-200 bg-white p-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70"
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
