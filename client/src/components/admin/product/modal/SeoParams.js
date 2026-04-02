import React from "react";
import { ImageIcon } from "lucide-react";
import InputField from "./InputField";
import {
    getRatioLabel,
    getImageAspectRatioWarning,
} from "@/utils/imageAspectRatio";
import toast from "react-hot-toast";

const OG_RATIO = { width: 1200, height: 630 };
const OG_RATIO_LABEL = getRatioLabel(OG_RATIO.width, OG_RATIO.height);

export default function SeoParams({ formData, handleChange, setFormData }) {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <InputField
                        label="Meta Title"
                        name="metaTitle"
                        value={formData.metaTitle || ""}
                        onChange={handleChange}
                        placeholder="SEO friendly title"
                    />
                </div>

                <div className="md:col-span-2 space-y-2">
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
                        value={formData.metaDescription || ""}
                        onChange={handleChange}
                        rows="2"
                        maxLength="160"
                        placeholder="Brief summary for search results..."
                        className={`w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition border-slate-300`}
                    />
                </div>

                <InputField
                    label="Meta Keywords"
                    name="metaKeywords"
                    value={formData.metaKeywords || ""}
                    onChange={handleChange}
                    placeholder="fashion, shirt, summer (comma separated)"
                />

                <InputField
                    label="Canonical URL"
                    name="canonicalUrl"
                    value={formData.canonicalUrl || ""}
                    onChange={handleChange}
                    placeholder="https://original-link.com"
                />

                <div className="md:col-span-2">
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-2">
                            OG Image (Social Share)
                        </label>
                        <p className="text-[10px] font-semibold text-slate-500 mb-2">
                            Required aspect ratio: {OG_RATIO_LABEL}
                        </p>
                        <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl">
                        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center border border-dashed border-slate-300 overflow-hidden">
                            {formData.ogImage ? (
                                <img
                                    src={
                                        formData.ogImage instanceof File
                                            ? URL.createObjectURL(formData.ogImage)
                                            : formData.ogImage
                                    }
                                    className="w-full h-full object-cover"
                                    alt="OG Preview"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "/placeholder.png";
                                    }}
                                />
                            ) : (
                                <ImageIcon className="text-slate-300" />
                            )}
                        </div>
                        <div className="flex-1">
                            <input
                                type="file"
                                accept="image/*"
                                className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-700 cursor-pointer"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                        const warning = await getImageAspectRatioWarning(file, OG_RATIO, {
                                            label: "OG image",
                                        });
                                        setFormData({
                                            ...formData,
                                            ogImage: file,
                                        });
                                        if (warning) {
                                            toast.error(warning);
                                        }
                                    } catch (err) {
                                        toast.error(err.message || "Invalid OG image");
                                        e.target.value = "";
                                    }
                                }}
                            />
                            <p className="text-[9px] text-slate-400 mt-2">
                                Visible when product is shared on WhatsApp/Facebook
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
