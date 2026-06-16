import React, { useState, useEffect } from "react";
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
import { GripVertical, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { getProducts, reorderProducts } from "@/services/productService";

function SortableProductItem({ product }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: product._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm mb-2"
    >
      <div {...attributes} {...listeners} className="cursor-grab text-slate-400">
        <GripVertical size={20} />
      </div>
      <img
        src={product.mainImage?.url.replace(/\\/g, "/")}
        alt={product.name}
        className="w-10 h-10 object-cover rounded"
      />
      <span className="font-medium text-sm text-slate-800">{product.name}</span>
    </div>
  );
}

export default function ReorderProductsModal({ isOpen, onClose, onSuccess }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all products (increase limit to get enough for reordering)
      const res = await getProducts(1, 500); 
      if (res.success) {
        setProducts(res.products);
      }
    } catch (err) {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setProducts((items) => {
        const oldIndex = items.findIndex((p) => p._id === active.id);
        const newIndex = items.findIndex((p) => p._id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const orderedIds = products.map((p) => p._id);
    try {
      const res = await reorderProducts(orderedIds);
      if (res.success) {
        toast.success("Products reordered successfully");
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || "Failed to reorder");
      }
    } catch (err) {
      toast.error("Failed to reorder");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold">Reorder Products</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 cursor-pointer">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={products.map(p => p._id)} strategy={verticalListSortingStrategy}>
                {products.map((product) => (
                  <SortableProductItem key={product._id} product={product} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
        <div className="p-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 cursor-pointer">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-4 py-2 text-sm font-bold bg-slate-900 text-white rounded-lg hover:bg-black cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Save Order
          </button>
        </div>
      </div>
    </div>
  );
}
