"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, Edit3, Search, RefreshCw } from "lucide-react";
import TiptapEditor from "../../TiptapEditor";
import toast from "react-hot-toast";
import axios from "axios";
import { API_BASE_URL } from "@/services/api";

export default function PageModal({ isOpen, onClose, onSuccess, initialData }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
      title: "",
      content: "",
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      canonicalUrl: "",
      seoSchema: "",
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
          title: initialData.title || "",
          content: initialData.content || "",
          metaTitle: initialData.metaTitle || "",
          metaDescription: initialData.metaDescription || "",
          metaKeywords: initialData.metaKeywords || "",
          canonicalUrl: initialData.canonicalUrl || "",
          seoSchema: initialData.seoSchema || "",
      });
    }
  }, [isOpen, initialData]);

  const handleChange = (e) => {
      setFormData({...formData, [e.target.name]: e.target.value});
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.content || formData.content === "<p></p>") {
      return toast.error("Content is empty!");
    }

    setLoading(true);
    try {
      console.log("Saving Content for:", formData);
      toast.success(`${formData.title} Updated!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error("Failed to save changes");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-[150] p-4 transition-all">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 animate-in zoom-in duration-200">
        {/* --- HEADER --- */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-lg">
              <Edit3 size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Edit {formData.title}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Update page content and SEO settings
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

        {/* --- FORM & EDITOR --- */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 h-[70vh] overflow-y-auto">
            {/* SEO Section */}
            <div className="space-y-4 border-b pb-4">
                <h3 className="text-sm font-bold uppercase flex items-center gap-2"><Search size={16}/> SEO Settings</h3>
                <input name="metaTitle" value={formData.metaTitle} onChange={handleChange} placeholder="Meta Title" className="w-full border p-2 rounded text-sm"/>
                <textarea name="metaDescription" value={formData.metaDescription} onChange={handleChange} placeholder="Meta Description" className="w-full border p-2 rounded text-sm"/>
                <input name="canonicalUrl" value={formData.canonicalUrl} onChange={handleChange} placeholder="Canonical URL" className="w-full border p-2 rounded text-sm"/>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex justify-between items-center">
                        Structured Data (Schema JSON-LD)
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    const res = await axios.post(`${API_BASE_URL}/pages/generate-schema`, formData, { withCredentials: true });
                                    if (res.data.success) {
                                        setFormData({ ...formData, seoSchema: res.data.schema });
                                        toast.success("Schema generated");
                                    }
                                } catch (error) {
                                    toast.error("Failed to generate schema");
                                }
                            }}
                            className="flex items-center gap-1 text-[10px] bg-slate-900 text-white px-2 py-1 rounded"
                        >
                            <RefreshCw size={10} /> Auto-Generate
                        </button>
                    </label>
                    <textarea name="seoSchema" value={formData.seoSchema || ""} onChange={handleChange} rows={4} placeholder='{ "@context": "https://schema.org", ... }' className="w-full border p-2 rounded text-sm font-mono"/>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Page Content
                </label>
                <div className="min-h-[200px]">
                    <TiptapEditor value={formData.content} onChange={(val) => setFormData({...formData, content: val})} />
                </div>
            </div>

          {/* --- ACTIONS --- */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-slate-400 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 hover:bg-black"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
