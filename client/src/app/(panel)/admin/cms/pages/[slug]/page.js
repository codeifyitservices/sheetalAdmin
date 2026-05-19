"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { API_BASE_URL } from "@/services/api";
import PageHeader from "@/components/admin/layout/PageHeader";
import TiptapEditor from "@/components/TiptapEditor";
import Link from "next/link";

export default function EditPolicyPage({ params }) {
    const { slug } = use(params);
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    useEffect(() => {
        if (slug) {
            fetchPageData();
        }
    }, [slug]);

    const fetchPageData = async () => {
        try {
            const { data } = await axios.get(`${API_BASE_URL}/pages/slug/${slug}`, {
                withCredentials: true
            });
            if (data.success && data.page) {
                setTitle(data.page.title || "");
                setContent(data.page.content || "");
            }
        } catch (error) {
            console.error("Error fetching page data", error);
            toast.error("Failed to load page content");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/pages/slug/${slug}`, {
                title,
                content,
            }, {
                withCredentials: true,
            });

            if (res.data.success) {
                toast.success("Page updated successfully!");
                router.push("/admin/cms/pages");
            }
        } catch (error) {
            console.error("Error saving page", error);
            toast.error(error.response?.data?.message || "Failed to update page");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    const humanReadableTitle = slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

    return (
        <div className="min-h-screen w-full animate-in fade-in duration-500 pb-20 text-black">
            <div className="flex items-center gap-4 mb-4">
                <Link
                    href="/admin/cms/pages"
                    className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-600 hover:text-slate-900"
                >
                    <ArrowLeft size={20} />
                </Link>
                <PageHeader
                    title={`Edit ${humanReadableTitle}`}
                    subtitle={`Manage rich text content for ${humanReadableTitle.toLowerCase()} page`}
                />
            </div>

            <form onSubmit={handleSave} className="mt-8 max-w-5xl mx-auto space-y-6">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-slate-700">Page Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Terms and Conditions"
                            required
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-semibold"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-slate-700 mb-1">Page Content</label>
                        <TiptapEditor value={content} onChange={setContent} />
                    </div>
                </div>

                {/* Save Button */}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 md:pl-72 z-10 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
