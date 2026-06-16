import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImageIcon, Edit3, Trash2, Star, CheckSquare, Square } from "lucide-react";

export function SortableProductRow({ 
  product, 
  isSelected, 
  toggleSelectOne, 
  selectMode, 
  setViewProduct, 
  setShowDrawer, 
  handleStar, 
  starringId, 
  setEditData, 
  setShowModal, 
  setDeleteId, 
  setShowDeleteModal, 
  setSelectedProductName, 
  i, 
  currentPage, 
  rowsPerPage 
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: product._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`transition-colors bg-white ${selectMode ? "cursor-pointer" : ""} ${isSelected ? "bg-slate-50" : "hover:bg-slate-50/80"}`}
    >
      <td className="px-4 py-3 text-slate-500 font-medium text-center touch-none">
        <button
          {...listeners}
          {...attributes}
          className="cursor-grab p-2 hover:bg-slate-200 rounded-lg"
        >
          <GripVertical size={16} />
        </button>
      </td>
      {selectMode && (
        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => toggleSelectOne(product._id)}
            className="flex cursor-pointer items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            {isSelected ? (
              <CheckSquare size={16} className="text-slate-900" />
            ) : (
              <Square size={16} />
            )}
          </button>
        </td>
      )}

      <td className="px-4 py-4 text-slate-500 font-medium text-center">
        {(currentPage - 1) * rowsPerPage + i + 1}
      </td>

      <td className="px-4 py-4">
        <div
          className="w-10 h-10 mx-auto rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setViewProduct(product);
            setShowDrawer(true);
          }}
        >
          {product.images?.[0]?.url || product.mainImage?.url ? (
            <img
              src={(
                product.images?.[0]?.url || product.mainImage?.url
              ).replace(/\\/g, "/")}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon size={16} className="text-slate-300" />
          )}
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900">{product.name}</span>
          </div>
          <span className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">
            SKU: {product.sku || "N/A"}
          </span>
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1 max-w-xs">
          {product.wearType?.slice(0, 2).map((tag, idx) => (
            <span
              key={idx}
              className="bg-purple-100 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
            >
              {tag}
            </span>
          ))}
          {product.occasion?.slice(0, 2).map((tag, idx) => (
            <span
              key={idx}
              className="bg-pink-100 text-pink-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
            >
              {tag}
            </span>
          ))}
          {product.tags?.slice(0, 1).map((tag, idx) => (
            <span
              key={idx}
              className="bg-slate-100 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
            >
              {tag}
            </span>
          ))}
          {(product.wearType?.length > 2 ||
            product.occasion?.length > 2 ||
            product.tags?.length > 1) && (
            <span className="text-[9px] text-slate-400 font-medium">+more</span>
          )}
        </div>
      </td>

      <td className="px-4 py-4 text-slate-600 font-medium">
        {product.category?.name || (
          <span className="text-slate-400 text-xs italic">Uncategorized</span>
        )}
      </td>

      <td className="px-4 py-4 text-slate-600 font-medium">
        {product.subCategory || <span className="text-slate-400 text-xs">-</span>}
      </td>

      <td className="px-4 py-4">
        {product.lowStockVariantCount > 0 ? (
          <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {product.lowStockVariantCount} Variant
            {product.lowStockVariantCount > 1 ? "s" : ""} Low Stock
            {product.lowStockThreshold !== undefined && (
              <span className="ml-1 text-red-600 font-normal">
                (≤{product.lowStockThreshold})
              </span>
            )}
          </span>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </td>

      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end gap-4 text-slate-400">
          <button
            title={product.isStarred ? "Unstar" : "Star"}
            disabled={starringId === product._id}
            onClick={(e) => handleStar(e, product._id)}
            className={`transition-colors cursor-pointer disabled:opacity-40 ${
              product.isStarred
                ? "text-amber-400 hover:text-slate-400"
                : "hover:text-amber-400"
            }`}
          >
            <Star
              size={18}
              className={product.isStarred ? "fill-amber-400" : ""}
            />
          </button>

          <button
            title="Edit"
            className="hover:text-blue-600 cursor-pointer transition-colors"
            onClick={() => {
              setEditData(product);
              setShowModal(true);
            }}
          >
            <Edit3 size={18} />
          </button>
          <button
            title="Delete"
            className="hover:text-rose-600 cursor-pointer transition-colors"
            onClick={() => {
              setDeleteId(product._id);
              setSelectedProductName(product.name);
              setShowDeleteModal(true);
            }}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
}
