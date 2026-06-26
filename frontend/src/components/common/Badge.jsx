function Badge({
  children,
  tone = "slate",
  size = "md",
  icon: Icon,
  className = "",
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    danger: "bg-rose-50 text-rose-700 ring-rose-200",
    info: "bg-blue-50 text-blue-700 ring-blue-200",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  };

  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3.5 py-1.5 text-sm",
    lg: "px-4.5 py-2 text-base",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-semibold ring-1 ${
        tones[tone] || tones.slate
      } ${sizes[size]} ${className}`}
    >
      {Icon && <Icon size={14} className="flex-shrink-0" />}
      {children}
    </span>
  );
}

export default Badge;
