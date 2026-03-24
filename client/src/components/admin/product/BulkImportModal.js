"use client";

import { useState, useRef } from "react";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Image as ImageIcon,
  Video,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { bulkImportProducts } from "@/services/productService";

export default function BulkImportModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [excelFile, setExcelFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [variantVideoFiles, setVariantVideoFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  const excelInputRef = useRef(null);
  const imagesInputRef = useRef(null);
  const variantVideosInputRef = useRef(null);

  const handleExcelChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
        toast.error("Please upload a valid Excel or CSV file");
        return;
      }
      setExcelFile(file);
    }
  };

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files);
    const validImages = files.filter((file) => {
      const ext = file.name.split(".").pop().toLowerCase();
      return ["jpg", "jpeg", "png", "webp"].includes(ext);
    });

    if (validImages.length !== files.length) {
      toast.error(
        "Some files were skipped. Only JPEG, PNG, and WebP images are allowed.",
      );
    }

    const newEntries = validImages.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setImageFiles((prev) => [...prev, ...newEntries]);
  };

  const clearVariantVideoInput = () => {
    if (variantVideosInputRef.current) {
      variantVideosInputRef.current.value = "";
    }
  };

  const handleVariantVideosChange = (e) => {
    const files = Array.from(e.target.files);
    const validVideos = files.filter((file) => {
      const ext = file.name.split(".").pop().toLowerCase();
      return ["mp4", "webm", "mov", "mkv"].includes(ext);
    });

    if (validVideos.length !== files.length) {
      toast.error(
        "Some files were skipped. Only MP4, WebM, MOV, and MKV videos are allowed.",
      );
    }

    const newEntries = validVideos.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setVariantVideoFiles((prev) => [...prev, ...newEntries]);
  };

  const removeImage = (index) => {
    setImageFiles((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeVariantVideo = (index) => {
    setVariantVideoFiles((prev) => {
      URL.revokeObjectURL(prev[index].url);
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        clearVariantVideoInput();
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!excelFile) {
      toast.error("Please select an Excel file");
      return;
    }

    setUploading(true);
    setStep(2);

    try {
      const formData = new FormData();
      formData.append("file", excelFile);
      imageFiles.forEach(({ file }) => formData.append("images", file));
      variantVideoFiles.forEach(({ file }) =>
        formData.append("variantVideos", file),
      );

      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const res = await bulkImportProducts(formData);

      clearInterval(interval);
      setProgress(100);

      if (res.success) {
        setResult({
          success: true,
          count: res.data?.imported || 0,
          message: res.message || "Products imported successfully",
          errors: res.data?.errors || [],
        });
        setStep(3);
        onSuccess?.();
      } else {
        throw new Error(res.message || "Import failed");
      }
    } catch (error) {
      setResult({
        success: false,
        message: error.message || "Failed to import products.",
      });
      setStep(3);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    imageFiles.forEach(({ url }) => URL.revokeObjectURL(url));
    variantVideoFiles.forEach(({ url }) => URL.revokeObjectURL(url));
    setExcelFile(null);
    setImageFiles([]);
    setVariantVideoFiles([]);
    clearVariantVideoInput();
    setStep(1);
    setProgress(0);
    setResult(null);
  };

  const handleClose = () => {
    if (uploading) return;
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Bulk Import Products
            </h2>
            <p className="text-sm text-slate-500">
              Upload Excel rows grouped by product, plus matching images and
              variant videos
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 cursor-pointer rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            disabled={uploading}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="space-y-8">
              {/* Excel Upload */}
              <div className="space-y-3">
                <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">
                    1
                  </span>
                  Upload Product Sheet
                </p>

                <input
                  type="file"
                  id="excel-upload"
                  ref={excelInputRef}
                  className="sr-only"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelChange}
                />

                <label
                  htmlFor="excel-upload"
                  className={`block border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all
                    focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2
                    ${
                      excelFile
                        ? "border-emerald-500 bg-emerald-50/30"
                        : "border-slate-200 hover:border-blue-400 hover:bg-slate-50"
                    }`}
                >
                  {excelFile ? (
                    <div className="text-center">
                      <FileSpreadsheet className="w-12 h-12 text-emerald-600 mb-2 mx-auto" />
                      <p className="font-medium text-slate-900">
                        {excelFile.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {(excelFile.size / 1024).toFixed(1)} KB
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setExcelFile(null);
                        }}
                        className="mt-3 text-xs text-red-600 hover:underline"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <UploadCloud className="w-12 h-12 text-slate-300 mb-2 mx-auto" />
                      <p className="font-medium text-slate-700">
                        Click or press Space to upload Excel file
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Supported: .xlsx, .xls, .csv
                      </p>
                    </div>
                  )}
                </label>

                <div className="flex justify-between items-center text-xs px-1">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const { downloadSampleExcel } =
                          await import("@/services/productService");
                        const blob = await downloadSampleExcel();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "sample_product_import.xlsx";
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                      } catch {
                        toast.error("Failed to download sample file");
                      }
                    }}
                    className="text-blue-600 cursor-pointer hover:underline"
                  >
                    Download Sample Template
                  </button>
                  <span className="text-slate-400">Max file size: 10MB</span>
                </div>
              </div>

              {/* Images Upload */}
              <div className="space-y-3">
                <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">
                    2
                  </span>
                  Upload Product Images
                </p>

                <input
                  type="file"
                  id="images-upload"
                  ref={imagesInputRef}
                  className="sr-only"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleImagesChange}
                />

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                    <label
                      htmlFor="images-upload"
                      className="aspect-square border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-white transition-all bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1"
                    >
                      <ImageIcon className="w-8 h-8 text-slate-300 mb-1" />
                      <span className="text-xs font-medium text-slate-500">
                        Add Images
                      </span>
                    </label>

                    {imageFiles.map((entry, idx) => (
                      <div
                        key={idx}
                        className="aspect-square relative rounded-lg overflow-hidden border border-slate-200 bg-white group"
                      >
                        <img
                          src={entry.url}
                          className="w-full h-full object-cover"
                          alt={entry.file.name}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          aria-label={`Remove ${entry.file.name}`}
                          className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shadow-sm hover:bg-white"
                        >
                          <X size={12} />
                        </button>
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                          {entry.file.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500">
                      {imageFiles.length} images selected
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        imageFiles.forEach(({ url }) =>
                          URL.revokeObjectURL(url),
                        );
                        setImageFiles([]);
                      }}
                      className={`text-xs text-red-600 hover:underline ${imageFiles.length === 0 ? "invisible" : ""}`}
                    >
                      Clear all
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 italic">
                  Note: Only JPEG, PNG, and WebP images are accepted. Filenames
                  must match exactly with the names in the Excel sheet.
                </p>
              </div>

              {/* Variant Videos Upload */}
              <div className="space-y-3">
                <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">
                    3
                  </span>
                  Upload Variant Videos
                </p>

                <input
                  type="file"
                  id="variant-videos-upload"
                  ref={variantVideosInputRef}
                  className="sr-only"
                  multiple
                  accept=".mp4,.webm,.mov,.mkv,video/*"
                  onChange={handleVariantVideosChange}
                />

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                    <label
                      htmlFor="variant-videos-upload"
                      className="aspect-square border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-white transition-all bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1"
                    >
                      <Video className="w-8 h-8 text-slate-300 mb-1" />
                      <span className="text-xs font-medium text-slate-500">
                        Add Videos
                      </span>
                    </label>

                    {variantVideoFiles.map((entry, idx) => (
                      <div
                        key={idx}
                        className="aspect-square relative rounded-lg overflow-hidden border border-slate-200 bg-white group"
                      >
                        <video
                          src={entry.url}
                          className="w-full h-full object-cover bg-black"
                          muted
                          playsInline
                        />
                        <button
                          type="button"
                          onClick={() => removeVariantVideo(idx)}
                          aria-label={`Remove ${entry.file.name}`}
                          className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shadow-sm hover:bg-white"
                        >
                          <X size={12} />
                        </button>
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                          {entry.file.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500">
                      {variantVideoFiles.length} videos selected
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        variantVideoFiles.forEach(({ url }) =>
                          URL.revokeObjectURL(url),
                        );
                        setVariantVideoFiles([]);
                        clearVariantVideoInput();
                      }}
                      className={`text-xs text-red-600 hover:underline ${variantVideoFiles.length === 0 ? "invisible" : ""}`}
                    >
                      Clear all
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 italic">
                  Note: Variant video filenames must match the VariantVideo
                  column in the Excel sheet.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Processing */}
          {step === 2 && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    className="text-slate-100 stroke-current"
                    strokeWidth="8"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                  />
                  <circle
                    className="text-blue-600 stroke-current transition-all duration-300"
                    strokeWidth="8"
                    strokeLinecap="round"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * progress) / 100}
                    style={{
                      transform: "rotate(-90deg)",
                      transformOrigin: "50% 50%",
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-slate-700">
                    {progress}%
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Importing Products...
                </h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                  Please wait while we parse the Excel file and upload your
                  images securely.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {step === 3 && result && (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${result.success ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
              >
                {result.success ? (
                  <CheckCircle size={40} />
                ) : (
                  <AlertCircle size={40} />
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">
                  {result.success ? "Import Complete!" : "Import Failed"}
                </h3>
                <p
                  className={`text-sm max-w-sm mx-auto ${result.success ? "text-slate-600" : "text-red-600"}`}
                >
                  {result.message}
                </p>
                {result.success && (
                  <p className="text-sm font-medium text-emerald-700">
                    Successfully added {result.count} products to the catalog.
                  </p>
                )}
              </div>
              {result.errors?.length > 0 && (
                <div className="w-full max-w-md bg-red-50/50 border border-red-100 rounded-lg p-3 text-left max-h-40 overflow-y-auto">
                  <p className="text-xs font-bold text-red-800 mb-2">
                    Warnings/Errors ({result.errors.length}):
                  </p>
                  <ul className="list-disc list-inside text-xs text-red-600 space-y-1">
                    {result.errors.map((err, i) => (
                      <li key={i}>
                        {typeof err === "string" ? err : JSON.stringify(err)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="pt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  className="bg-slate-900 text-white cursor-pointer px-8 py-3 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all"
                >
                  {result.success ? "Done" : "Try Again"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 1 && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 cursor-pointer text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!excelFile}
              className="bg-blue-600 cursor-pointer text-white px-8 py-2.5 rounded-xl font-bold hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 transition-all text-sm flex items-center gap-2"
            >
              <UploadCloud size={18} />
              Start Import
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
