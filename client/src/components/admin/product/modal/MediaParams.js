import React from "react";
import {
    LayoutDashboard,
    UploadCloud,
    MousePointer2,
    Trash2,
    ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import {
    getRatioLabel,
    getImageAspectRatioWarning,
} from "@/utils/imageAspectRatio";

const PRODUCT_IMAGE_RATIO = { width: 3, height: 4 };
const PRODUCT_IMAGE_RATIO_LABEL = getRatioLabel(
    PRODUCT_IMAGE_RATIO.width,
    PRODUCT_IMAGE_RATIO.height,
);

const handleProductImageChange = async (e, setFormData, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const warning = await getImageAspectRatioWarning(file, PRODUCT_IMAGE_RATIO, {
            label: fieldName === "mainImageFile" ? "Main image" : "Hover image",
        });
        setFormData((prev) => ({
            ...prev,
            [fieldName]: file,
        }));
        if (warning) {
            toast.error(warning);
        }
    } catch (err) {
        toast.error(err.message || "Invalid image file");
        e.target.value = "";
    }
};

export default function MediaParams({
    formData,
    setFormData,
}) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                            <LayoutDashboard size={16} />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-700">
                            Main Display Image
                        </span>
                    </div>
                    <p className="mb-3 text-[10px] font-semibold text-slate-500">
                        Required aspect ratio: {PRODUCT_IMAGE_RATIO_LABEL}
                    </p>

                    <div className="relative group border-2 border-dashed border-slate-200 rounded-3xl p-2 bg-white hover:border-blue-500 hover:bg-blue-50/30 transition-all duration-300 aspect-[4/3] flex flex-col items-center justify-center overflow-hidden shadow-sm">
                        {formData.mainImageFile || formData.mainImage?.url ? (
                            <>
                                <img
                                    src={
                                        formData.mainImageFile
                                            ? URL.createObjectURL(formData.mainImageFile)
                                            : formData.mainImage?.url
                                                ? formData.mainImage.url
                                                : "/placeholder.png"
                                    }
                                    className="w-full h-full object-cover rounded-2xl"
                                    alt="Main"
                                    onError={(e) => {
                                        e.target.src = "/placeholder.png";
                                    }}
                                />

                                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                    <label className="cursor-pointer bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-bold shadow-xl hover:scale-105 transition-transform">
                                        Replace Image
                                        <input
                                            type="file"
                                            className="hidden"
                                            onChange={(e) =>
                                                handleProductImageChange(
                                                    e,
                                                    setFormData,
                                                    "mainImageFile",
                                                )
                                            }
                                        />
                                    </label>
                                </div>
                            </>
                        ) : (
                            <div className="text-center p-6">
                                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <UploadCloud
                                        className="text-slate-400 group-hover:text-blue-500"
                                        size={32}
                                    />
                                </div>
                                <p className="text-xs font-bold text-slate-600 mb-1">
                                    Click or Drag to Upload
                                </p>
                                <p className="text-[10px] text-slate-400">JPG, PNG up to 5MB</p>
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) =>
                                        handleProductImageChange(
                                            e,
                                            setFormData,
                                            "mainImageFile",
                                        )
                                    }
                                />
                            </div>
                        )}
                    </div>
                    <input
                        className="mt-3 w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                        placeholder="SEO Alt Text: e.g. Navy Blue Cotton Shirt Front"
                        value={formData.mainImage?.alt || ""}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                mainImage: {
                                    ...formData.mainImage,
                                    alt: e.target.value,
                                },
                            })
                        }
                    />
                </div>

                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                            <MousePointer2 size={16} />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-700">
                            Secondary / Hover Image
                        </span>
                    </div>
                    <p className="mb-3 text-[10px] font-semibold text-slate-500">
                        Required aspect ratio: {PRODUCT_IMAGE_RATIO_LABEL}
                    </p>

                    <div className="relative group border-2 border-dashed border-slate-200 rounded-3xl p-2 bg-white hover:border-purple-500 hover:bg-purple-50/30 transition-all duration-300 aspect-[4/3] flex flex-col items-center justify-center overflow-hidden shadow-sm">
                        {formData.hoverImageFile || formData.hoverImage?.url ? (
                            <>
                                <img
                                    src={
                                        formData.hoverImageFile
                                            ? URL.createObjectURL(formData.hoverImageFile)
                                            : formData.hoverImage?.url
                                                ? formData.hoverImage.url
                                                : "/placeholder.png"
                                    }
                                    className="w-full h-full object-cover rounded-2xl"
                                    alt="Hover"
                                    onError={(e) => {
                                        e.target.src = "/placeholder.png";
                                    }}
                                />

                                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button
                                        onClick={() =>
                                            setFormData({
                                                ...formData,
                                                hoverImageFile: null,
                                                hoverImage: { url: "" },
                                            })
                                        }
                                        className="bg-rose-500 text-white p-2.5 rounded-xl shadow-xl hover:bg-rose-600"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                        <input
                                            type="file"
                                            className="hidden"
                                            id="hover-upload"
                                            onChange={(e) =>
                                                handleProductImageChange(
                                                    e,
                                                    setFormData,
                                                    "hoverImageFile",
                                                )
                                            }
                                        />
                                    </div>
                            </>
                        ) : (
                            <div className="text-center p-6">
                                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <ImageIcon className="text-slate-300" size={32} />
                                </div>
                                <p className="text-xs font-bold text-slate-600 mb-1">
                                    Hover Preview Image
                                </p>
                                <p className="text-[10px] text-slate-400">
                                    Shows on mouse hover in shop
                                </p>
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) =>
                                        handleProductImageChange(
                                            e,
                                            setFormData,
                                            "hoverImageFile",
                                        )
                                    }
                                />
                            </div>
                        )}
                    </div>
                    <input
                        className="mt-3 w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-purple-500/20 outline-none transition"
                        placeholder="SEO Alt Text: e.g. Model wearing navy blue shirt"
                        value={formData.hoverImage?.alt || ""}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                hoverImage: {
                                    ...formData.hoverImage,
                                    alt: e.target.value,
                                },
                            })
                        }
                    />
                </div>
            </div>
        </div>
    );
}
