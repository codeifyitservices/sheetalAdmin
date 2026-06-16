import { Loader2, Trash2, MessageSquare } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { formatEnquiryDate } from "@/services/enquiryService";

const TABLE_HEADERS = ["Name", "Product", "Size", "Date", "Status", "Actions"];
const CONTACT_TABLE_HEADERS = ["Name", "Email", "Query", "Date", "Status", "Actions"];

export default function EnquiryTable({
  enquiries,
  isLoading,
  deletingId,
  onSelect,
  onDelete,
  type = "notify",
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  if (enquiries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-300">
        <MessageSquare size={40} strokeWidth={1} />
        <p className="text-[10px] font-bold mt-2 uppercase tracking-widest text-slate-400">
          No {type === "contact" ? "contact enquiries" : "enquiries"} found
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            {(type === "contact" ? CONTACT_TABLE_HEADERS : TABLE_HEADERS).map((h) => (
              <th
                key={h}
                className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 py-3.5"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {enquiries.map((e) => (
            <tr
              key={e._id}
              className="hover:bg-slate-50 transition-colors group"
            >
              <td className="px-5 py-3.5">
                <button
                  onClick={() => onSelect(e)}
                  className="font-semibold text-slate-800 hover:underline text-left flex items-center gap-1.5"
                >
                  {e.status === "new" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  )}
                  {e.name}
                </button>
              </td>
              <td className="px-5 py-3.5 text-slate-600 font-medium">
                <span className="truncate max-w-[150px] block">
                  {type === "contact" ? e.email : e.productName}
                </span>
              </td>
              <td className="px-5 py-3.5">
                {type === "contact" ? (
                  <span className="text-slate-600 font-medium truncate max-w-[250px] block">
                    {e.query?.length > 40 ? e.query.substring(0, 40) + "..." : e.query}
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    {e.size}
                  </span>
                )}
              </td>
              <td className="px-5 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                {formatEnquiryDate(e.createdAt)}
              </td>
              <td className="px-5 py-3.5">
                <StatusBadge status={e.status} />
              </td>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                  <button
                    onClick={() => onSelect(e)}
                    className="text-[10px] cursor-pointer font-bold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 hover:border-slate-400 transition"
                  >
                    View
                  </button>
                  <button
                    aria-label={`Delete ${type === "contact" ? "contact enquiry" : "enquiry"} from ${e.name}`}
                    onClick={() => onDelete(e._id)}
                    disabled={deletingId === e._id}
                    className="p-1.5 rounded-lg cursor-pointer text-rose-400 hover:bg-rose-500 hover:text-white border border-slate-200 hover:border-rose-500 transition disabled:opacity-50"
                  >
                    {deletingId === e._id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
