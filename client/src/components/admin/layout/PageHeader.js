import React from "react";
import { Calendar, Plus } from "lucide-react";

const PageHeader = ({
  title,
  subtitle,
  actionLabel,
  onActionClick,
  action,
}) => {
  return (
    <div className="flex flex-row justify-between items-center gap-4 mb-8 font-sans">
      <div className="min-w-0">
        <h1 className="text-xl md:text-3xl font-bold text-slate-900 tracking-tight truncate">
          {title}
        </h1>

        {subtitle && (
          <p className="text-slate-500 text-[12px] md:text-sm font-medium mt-0.5 flex items-center gap-1.5 truncate">
            <Calendar size={14} className="text-slate-400 shrink-0" />
            {subtitle}
          </p>
        )}
      </div>

      {action ? (
        <div className="shrink-0">{action}</div>
      ) : actionLabel ? (
        <button
          onClick={onActionClick}
          className="whitespace-nowrap w-fit px-4 py-2 md:px-5 md:py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-[13px] md:text-sm shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span className="inline-block">{actionLabel}</span>
        </button>
      ) : null}
    </div>
  );
};

export default PageHeader;
