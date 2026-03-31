"use client";
import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  entityName,
  itemName,
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const displayEntityName =
    entityName.charAt(0).toUpperCase() + entityName.slice(1);
  const confirmationText = itemName
    ? `Are you sure you want to delete ${itemName}?`
    : `Are you sure you want to delete this ${entityName}?`;

  const handleConfirm = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await Promise.resolve(onConfirm?.());
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute cursor-pointer top-4 right-4 text-slate-400 hover:text-slate-700 disabled:opacity-50 disabled:cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-rose-100 text-rose-600 p-3 rounded-full">
            <AlertTriangle size={24} />
          </div>
        </div>

        <h2 className="text-lg font-bold text-center text-slate-900">
          Delete {displayEntityName}?
        </h2>
        <p className="text-sm text-slate-500 text-center mt-2">
          {confirmationText}
          This action cannot be undone.
        </p>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 border cursor-pointer border-slate-300 text-slate-700 py-2 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 cursor-pointer bg-rose-600 text-white py-2 rounded hover:bg-rose-700 disabled:opacity-70 disabled:cursor-pointer"
          >
            {isDeleting ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
