import { useEffect, useState } from "react";
import { X, UploadCloud } from "lucide-react";
import { uploadHowToMeasureImage } from "@/services/sizeChartService";
import toast from "react-hot-toast";

export default function HowToMeasureModal({
  isOpen,
  onClose,
  onSuccess,
  currentImage,
  chartId,
  chartName,
}) {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setImagePreview(currentImage);
      setImage(null);
    }
  }, [isOpen, currentImage]);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!chartId) {
      toast.error("Select a chart before uploading an image.");
      return;
    }
    if (!image) {
      onClose();
      return;
    }

    setLoading(true);
    const formData = new FormData();
    if (image) {
      formData.append("howToMeasureImage", image);
    }

    try {
      const response = await uploadHowToMeasureImage(chartId, formData);
      onSuccess(response.data);
      toast.success("How to measure image updated successfully!");
      setImage(null);
      setImagePreview(null);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to upload image.");
      console.error("Error uploading image:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 animate-in fade-in-0 zoom-in-95">
        <div className="flex items-center justify-between text-black pb-4">
          <div>
            <h2 className="text-xl font-bold">How to Measure</h2>
            {chartName ? (
              <p className="text-sm text-gray-500 mt-1">{chartName}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload "How to Measure" Image
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    width={200}
                    height={200}
                    className="mx-auto"
                  />
                ) : (
                  <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                )}
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleImageChange}
                      accept="image/*"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={loading}
            >
              {loading ? "Uploading..." : "Save Image"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
