import React, { useState, useEffect } from "react";
import {
  PlusSquare,
  Trash2,
  Images,
  Save,
  Loader2,
  Info,
  Type,
  Link,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { API_BASE_URL } from "@/services/api";
import TiptapEditor from "@/components/TiptapEditor"; // adjust path as needed

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png";

const DEFAULT_CENTER = {
  label: "Exclusive Deal · Few Days Left",
  heading: "Timeless Women's Collection",
  description:
    "<p>Upgrade your everyday style with beautifully crafted pieces that blend comfort, elegance, and effortless charm.</p>",
  buttonText: "VIEW MORE",
  buttonLink: "",
};

export default function LookbookForm() {
  const [leftSliderImages, setLeftSliderImages] = useState([]);
  const [rightSliderImages, setRightSliderImages] = useState([]);
  const [centerContent, setCenterContent] = useState(DEFAULT_CENTER);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const SLUG = "timeless-women";

  useEffect(() => {
    const fetchLookbook = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/lookbooks/${SLUG}`, {
          withCredentials: true,
        });
        if (data.success && data.lookbook) {
          setLeftSliderImages(data.lookbook.leftSliderImages || []);
          setRightSliderImages(data.lookbook.rightSliderImages || []);
          if (data.lookbook.centerContent) {
            setCenterContent({
              ...DEFAULT_CENTER,
              ...data.lookbook.centerContent,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching lookbook:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLookbook();
  }, []);

  const validateImage = (file) => {
    return new Promise((resolve, reject) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        reject(
          `"${file.name}" is not a valid type. Only JPG and PNG are allowed.`,
        );
        return;
      }
      resolve();
    });
  };

  const handleImageUpload = async (e, setImages) => {
    const newFiles = Array.from(e.target.files);
    if (!newFiles.length) return;

    const valid = [];
    const errors = [];

    await Promise.all(
      newFiles.map(async (file) => {
        try {
          await validateImage(file);
          valid.push(file);
        } catch (err) {
          errors.push(err);
        }
      }),
    );

    if (errors.length)
      errors.forEach((err) => toast.error(err, { duration: 4000 }));

    if (valid.length) {
      const newImages = valid.map((file) => ({
        url: URL.createObjectURL(file),
        file,
        isNew: true,
      }));
      setImages((prev) => [...prev, ...newImages]);
      toast.success(`${valid.length} image(s) added`);
    }

    e.target.value = "";
  };

  const removeImage = (index, setImages) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCenterChange = (field, value) => {
    setCenterContent((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const formData = new FormData();

    const existingLeft = leftSliderImages.filter((img) => !img.isNew);
    const newLeft = leftSliderImages.filter((img) => img.isNew);
    const existingRight = rightSliderImages.filter((img) => !img.isNew);
    const newRight = rightSliderImages.filter((img) => img.isNew);

    formData.append("existingLeftImages", JSON.stringify(existingLeft));
    formData.append("existingRightImages", JSON.stringify(existingRight));
    newLeft.forEach((img) => formData.append("leftImages", img.file));
    newRight.forEach((img) => formData.append("rightImages", img.file));
    formData.append("title", "Timeless Women Collection");
    formData.append("centerContent", JSON.stringify(centerContent));

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/lookbooks/${SLUG}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        },
      );

      if (data.success) {
        toast.success("Lookbook updated successfully!");
        setLeftSliderImages(data.lookbook.leftSliderImages);
        setRightSliderImages(data.lookbook.rightSliderImages);
        if (data.lookbook.centerContent) {
          setCenterContent(data.lookbook.centerContent);
        }
      }
      console.log(data.lookbook)
    } catch (error) {
      console.error("Error saving lookbook:", error);
      toast.error(error.response?.data?.message || "Failed to update lookbook");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Image Spec Banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <Info size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-black text-amber-800 uppercase tracking-wide">
            Image Requirements
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            All images must be exactly{" "}
            <span className="font-bold">650 × 500 px</span> and in{" "}
            <span className="font-bold">JPG or PNG</span> format.
          </p>
        </div>
      </div>

      {/* Left Slider */}
      <ImageSection
        title="Left Slider Images"
        description="Manage images for the left-side carousel in the lookbook."
        images={leftSliderImages}
        setImages={setLeftSliderImages}
        onUpload={(e) => handleImageUpload(e, setLeftSliderImages)}
        onRemove={(index) => removeImage(index, setLeftSliderImages)}
        color="blue"
      />

      {/* Center Content */}
      <CenterSection content={centerContent} onChange={handleCenterChange} />

      {/* Right Slider */}
      <ImageSection
        title="Right Slider Images"
        description="Manage images for the right-side carousel in the lookbook."
        images={rightSliderImages}
        setImages={setRightSliderImages}
        onUpload={(e) => handleImageUpload(e, setRightSliderImages)}
        onRemove={(index) => removeImage(index, setRightSliderImages)}
        color="purple"
      />

      {/* Save */}
      <div className="flex justify-end pt-4 border-t border-slate-200">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center cursor-pointer gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
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
    </div>
  );
}

// ─── Center Content Section ───────────────────────────────────────────────────

function CenterSection({ content, onChange }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Type size={15} className="text-emerald-600" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase">
            Center Content
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Edit the text displayed in the middle panel of the lookbook.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Top Label */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Top Label
          </label>
          <input
            type="text"
            value={content.label}
            onChange={(e) => onChange("label", e.target.value)}
            placeholder="e.g. Exclusive Deal · Few Days Left"
            className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition placeholder:text-slate-300"
          />
        </div>

        {/* Heading */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Heading
          </label>
          <input
            type="text"
            value={content.heading}
            onChange={(e) => onChange("heading", e.target.value)}
            placeholder="e.g. Timeless Women's Collection"
            className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition placeholder:text-slate-300"
          />
        </div>

        {/* Description — Tiptap */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Description
          </label>
          <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-400 focus-within:border-emerald-400 transition">
            <TiptapEditor
              value={content.description}
              onChange={(val) => onChange("description", val)}
            />
          </div>
        </div>

        {/* Link  */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Link the Banner to
          </label>
          <div className="relative">
            <Link
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="url"
              value={content.buttonLink}
              onChange={(e) => onChange("buttonLink", e.target.value)}
              placeholder="https://..."
              className="w-full pl-8 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* Live Preview */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Preview
          </label>

          <a
            href={content.buttonLink || "#"}
            className="bg-[#faf9f7] border border-slate-200 rounded-2xl px-6 py-8 flex flex-col items-center text-center gap-3 hover:shadow-md transition cursor-pointer"
          >
            {content.label && (
              <p className="text-[10px] tracking-widest text-slate-500 uppercase">
                {content.label}
              </p>
            )}

            {content.heading && (
              <h2 className="text-xl font-serif font-bold text-slate-800 leading-snug max-w-xs">
                {content.heading}
              </h2>
            )}

            {content.description && (
              <div
                className="text-xs text-slate-500 max-w-xs leading-relaxed"
                dangerouslySetInnerHTML={{ __html: content.description }}
              />
            )}
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Image Section ─────────────────────────────────────────────────────────────

function ImageSection({
  title,
  description,
  images,
  onUpload,
  onRemove,
  color,
}) {
  const borderColor = { blue: "border-blue-500", purple: "border-purple-500" };
  const btnColor =
    color === "blue"
      ? "bg-blue-600 hover:bg-blue-700"
      : "bg-purple-600 hover:bg-purple-700";
  const badgeColor = color === "blue" ? "bg-blue-500" : "bg-purple-500";

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase">
            {title}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              📐 650 × 500 px
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              🖼 JPG · PNG
            </span>
          </div>
        </div>
        <label
          className={`group flex items-center gap-2 ${btnColor} text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md active:scale-95`}
        >
          <PlusSquare
            size={16}
            className="text-white/80 group-hover:text-white"
          />
          <span>Add Images</span>
          <input
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={onUpload}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((img, i) => (
          <div
            key={i}
            className={`aspect-[2/3] rounded-2xl overflow-hidden bg-white border-2 relative group shadow-sm transition-all animate-in zoom-in-95 duration-200 ${borderColor[color]}`}
          >
            <img
              src={img.url}
              alt={`Upload ${i}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            />
            {img.isNew && (
              <div
                className={`absolute top-2 left-2 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase shadow-sm ${badgeColor}`}
              >
                New
              </div>
            )}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-2 right-2 bg-white/90 backdrop-blur text-rose-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-rose-500 hover:text-white"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {images.length === 0 && (
          <div className="col-span-full py-10 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <Images size={40} strokeWidth={1} />
            <p className="text-[10px] font-bold mt-2 uppercase tracking-widest text-slate-400">
              No images added
            </p>
            <p className="text-[9px] text-slate-300 mt-1">
              650 × 500 px · JPG or PNG
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
