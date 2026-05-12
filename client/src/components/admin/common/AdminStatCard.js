export default function AdminStatCard({
  title,
  label,
  count,
  value,
  icon,
  isCurrency = false,
  isText = false,
  subtext = null,
  valueClassName = "",
}) {
  const resolvedLabel = title || label || "";
  const rawValue = value ?? count ?? 0;

  const formattedValue =
    typeof rawValue === "number"
      ? isCurrency
        ? `₹${rawValue.toLocaleString()}`
        : rawValue.toLocaleString()
      : rawValue;

  return (
    <div className="bg-white p-5 border border-slate-200 rounded-xl flex items-center gap-4 hover:shadow-md transition-shadow duration-300">
      <div className="p-3 rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600 flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
          {resolvedLabel}
        </p>
        <p
          className={`text-slate-900 mt-1.5 leading-none ${isText ? "text-sm font-black truncate" : "text-2xl font-black"} ${valueClassName}`.trim()}
        >
          {formattedValue}
        </p>
        {subtext ? <div className="mt-1">{subtext}</div> : null}
      </div>
    </div>
  );
}
