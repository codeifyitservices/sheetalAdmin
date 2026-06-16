"use client";

"use client";

import React, { useState, useEffect } from "react";
import {
  PlusSquare,
  Trash2,
  Loader2,
  Images,
  Pencil,
  X,
  Check,
  Info,
  MessageSquare,
  GripVertical,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { API_BASE_URL } from "@/services/api";

const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png";
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

const validateImage = (file) =>
  new Promise((resolve, reject) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return reject(`"${file.name}" must be JPG or PNG.`);
    }
    resolve();
  });

function Avatar({ url, name, size = "md" }) {
  const sizes = {
    sm: "w-10 h-10 text-sm",
    md: "w-14 h-14 text-base",
    lg: "w-20 h-20 text-xl",
  };
  const initials =
    name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover border-2 border-slate-200 shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${sizes[size]} rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center font-black text-slate-400 shrink-0`}
    >
      {initials}
    </div>
  );
}

function SortableTestimonial({
  t,
  editingId,
  deletingId,
  isSavingEdit,
  editName,
  setEditName,
  editComment,
  setEditComment,
  editPreview,
  handleFileChange,
  setEditFile,
  setEditPreview,
  cancelEdit,
  saveEdit,
  startEdit,
  handleDelete,
  ACCEPTED_EXTENSIONS,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: t._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    position: "relative",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group border border-slate-200 hover:border-slate-300 rounded-2xl p-4 transition-colors relative ${isDragging ? "bg-slate-50 shadow-lg border-slate-400" : "bg-white"}`}
    >
      {editingId === t._id ? (
        /* ── Edit Mode ── */
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* Avatar edit */}
          <label className="shrink-0 cursor-pointer group/avatar relative">
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 hover:border-slate-400 overflow-hidden flex items-center justify-center bg-slate-50 transition-all">
              {editPreview ? (
                <img
                  src={editPreview}
                  className="w-full h-full object-cover"
                  alt="Preview"
                />
              ) : (
                <Images size={16} className="text-slate-300" strokeWidth={1.5} />
              )}
            </div>
            <input
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              className="hidden"
              onChange={(e) => handleFileChange(e, setEditFile, setEditPreview)}
            />
          </label>

          <div className="flex-1 flex flex-col gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-slate-400 transition"
            />
            <textarea
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              rows={3}
              className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-slate-400 transition resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition"
              >
                <X size={13} /> Cancel
              </button>
              <button
                onClick={() => saveEdit(t._id)}
                disabled={isSavingEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition disabled:opacity-60"
              >
                {isSavingEdit ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── View Mode ── */
        <div className="flex gap-4 items-start">
          <div
            {...attributes}
            {...listeners}
            className="mt-2 text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing transition-colors"
          >
            <GripVertical size={16} />
          </div>
          <Avatar url={t.image?.url} name={t.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-800">{t.name}</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {t.comment}
            </p>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => startEdit(t)}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
            >
              <Pencil size={13} className="cursor-pointer" />
            </button>
            <button
              onClick={() => handleDelete(t._id)}
              disabled={deletingId === t._id}
              className="p-1.5 rounded-lg bg-slate-100 text-rose-400 hover:bg-rose-500 hover:text-white transition disabled:opacity-60"
            >
              {deletingId === t._id ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} className="cursor-pointer" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TestimonialForm() {
  const [testimonials, setTestimonials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add form
  const [newFile, setNewFile] = useState(null);
  const [newPreview, setNewPreview] = useState(null);
  const [newName, setNewName] = useState("");
  const [newComment, setNewComment] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editComment, setEditComment] = useState("");
  const [editFile, setEditFile] = useState(null);
  const [editPreview, setEditPreview] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/testimonials`, {
        withCredentials: true,
      });
      if (data.success) setTestimonials(data.testimonials);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load testimonials");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = testimonials.findIndex((t) => t._id === active.id);
    const newIndex = testimonials.findIndex((t) => t._id === over.id);

    const newTestimonials = arrayMove(testimonials, oldIndex, newIndex);
    setTestimonials(newTestimonials);

    const loadingToast = toast.loading("Updating order...");
    try {
      const reorderedIds = newTestimonials.map((t) => t._id);
      await axios.put(
        `${API_BASE_URL}/testimonials/reorder`,
        { reorderedIds },
        { withCredentials: true },
      );
      toast.success("Order updated successfully", { id: loadingToast });
    } catch (err) {
      toast.error("Failed to update order", { id: loadingToast });
      fetchTestimonials(); // Revert on failure
    }
  };

  const handleFileChange = async (e, setFile, setPreview) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await validateImage(file);
      setFile(file);
      setPreview(URL.createObjectURL(file));
    } catch (err) {
      toast.error(err, { duration: 4000 });
    }
    e.target.value = "";
  };

  const handleAdd = async () => {
    if (!newName.trim()) return toast.error("Name is required.");
    if (!newComment.trim()) return toast.error("Comment is required.");

    setIsAdding(true);
    const formData = new FormData();
    formData.append("name", newName.trim());
    formData.append("comment", newComment.trim());
    if (newFile) formData.append("image", newFile);

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/testimonials`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        },
      );
      if (data.success) {
        setTestimonials((prev) => [data.testimonial, ...prev]);
        setNewFile(null);
        setNewPreview(null);
        setNewName("");
        setNewComment("");
        toast.success("Testimonial added!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add testimonial");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const { data } = await axios.delete(
        `${API_BASE_URL}/testimonials/${id}`,
        { withCredentials: true },
      );
      if (data.success) {
        setTestimonials((prev) => prev.filter((t) => t._id !== id));
        toast.success("Testimonial deleted");
      }
    } catch (err) {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (t) => {
    setEditingId(t._id);
    setEditName(t.name);
    setEditComment(t.comment);
    setEditPreview(t.image?.url || null);
    setEditFile(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditComment("");
    setEditFile(null);
    setEditPreview(null);
  };

  const saveEdit = async (id) => {
    if (!editName.trim()) return toast.error("Name cannot be empty.");
    if (!editComment.trim()) return toast.error("Comment cannot be empty.");

    setIsSavingEdit(true);
    const formData = new FormData();
    formData.append("name", editName.trim());
    formData.append("comment", editComment.trim());
    if (editFile) formData.append("image", editFile);

    try {
      const { data } = await axios.patch(
        `${API_BASE_URL}/testimonials/${id}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        },
      );
      if (data.success) {
        setTestimonials((prev) =>
          prev.map((t) => (t._id === id ? data.testimonial : t)),
        );
        cancelEdit();
        toast.success("Testimonial updated!");
      }
    } catch (err) {
      toast.error("Failed to update");
    } finally {
      setIsSavingEdit(false);
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

      {/* Add New */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-sm font-black text-slate-900 uppercase">
            Add New Testimonial
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Fill in the details below to add a customer testimonial.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              👤 Optional Photo
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              🖼 JPG · PNG
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-5 items-start">
          {/* Avatar picker */}
          <label className="shrink-0 cursor-pointer group relative">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50 overflow-hidden flex items-center justify-center transition-all">
              {newPreview ? (
                <img
                  src={newPreview}
                  className="w-full h-full object-cover"
                  alt="Preview"
                />
              ) : (
                <div className="flex flex-col items-center">
                  <Images
                    size={20}
                    className="text-slate-300 group-hover:text-slate-400 transition-colors"
                    strokeWidth={1.5}
                  />
                  <span className="text-[8px] font-bold text-slate-300 group-hover:text-slate-400 mt-0.5 uppercase tracking-widest">
                    Photo
                  </span>
                </div>
              )}
            </div>
            <input
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              className="hidden"
              onChange={(e) => handleFileChange(e, setNewFile, setNewPreview)}
            />
          </label>

          {/* Fields */}
          <div className="flex-1 flex flex-col gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Customer name"
              className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition placeholder:text-slate-300"
            />
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Their testimonial comment..."
              rows={3}
              className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition placeholder:text-slate-300 resize-none"
            />
            <button
              onClick={handleAdd}
              disabled={isAdding || !newName.trim() || !newComment.trim()}
              className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md w-full sm:w-auto self-end"
            >
              {isAdding ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                <PlusSquare size={15} />
              )}
              <span>{isAdding ? "Adding..." : "Add Testimonial"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Existing Testimonials */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-sm font-black text-slate-900 uppercase">
            Testimonials
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {testimonials.length} testimonial
            {testimonials.length !== 1 ? "s" : ""} published
          </p>
        </div>

        {testimonials.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <MessageSquare
              size={40}
              strokeWidth={1}
              className="text-slate-300"
            />
            <p className="text-[10px] font-bold mt-2 uppercase tracking-widest text-slate-400">
              No testimonials yet
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={testimonials.map((t) => t._id)}
                strategy={verticalListSortingStrategy}
              >
                {testimonials.map((t) => (
                  <SortableTestimonial
                    key={t._id}
                    t={t}
                    editingId={editingId}
                    deletingId={deletingId}
                    isSavingEdit={isSavingEdit}
                    editName={editName}
                    setEditName={setEditName}
                    editComment={editComment}
                    setEditComment={setEditComment}
                    editPreview={editPreview}
                    handleFileChange={handleFileChange}
                    setEditFile={setEditFile}
                    setEditPreview={setEditPreview}
                    cancelEdit={cancelEdit}
                    saveEdit={saveEdit}
                    startEdit={startEdit}
                    handleDelete={handleDelete}
                    ACCEPTED_EXTENSIONS={ACCEPTED_EXTENSIONS}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  );
}
