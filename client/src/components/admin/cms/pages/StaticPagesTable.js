"use client";

import { Edit3, ExternalLink, Trash2 } from "lucide-react";

const footerLabels = {
  none: "None",
  footer_column_1: "Footer Column 1",
  footer_column_2: "Footer Column 2",
  footer_column_3: "Footer Column 3",
};

export default function StaticPagesTable({ pages, loading, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto min-h-[320px]">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
          <tr>
            <th className="px-4 py-4">Title</th>
            <th className="px-4 py-4">URL</th>
            <th className="px-4 py-4">Footer Section</th>
            <th className="px-4 py-4">Publish Status</th>
            <th className="px-4 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pages.length > 0 ? (
            pages.map((page) => (
              <tr key={page._id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-4">
                  <div className="font-bold text-slate-900">{page.title}</div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                    Updated {new Date(page.updatedAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <a
                    href={`https://sheetal-blue.vercel.app/${page.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-medium"
                  >
                    /{page.slug}
                    <ExternalLink size={13} />
                  </a>
                </td>
                <td className="px-4 py-4 text-slate-600 font-medium">
                  {footerLabels[page.footerPlacement] || "None"}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      page.status === "Published"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {page.status || "Draft"}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex justify-end gap-4 text-slate-400">
                    <button
                      type="button"
                      title="Edit"
                      onClick={() => onEdit(page)}
                      className="hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => onDelete(page)}
                      className="hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan="5"
                className="px-4 py-20 text-center text-slate-500 font-medium italic"
              >
                {loading ? "Loading static pages..." : "No static pages found."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
