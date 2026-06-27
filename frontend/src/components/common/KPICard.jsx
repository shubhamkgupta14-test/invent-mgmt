import { FaArrowDown, FaArrowUp, FaMinus } from "react-icons/fa";

export function KPICard({
  icon: Icon,
  title,
  value,
  subtitle,
  delta,
  deltaType = "up",
  deltaLabel = "vs last month",
  footerText,
  bgColor = "bg-indigo-100",
}) {
  const iconColor =
    {
      "bg-indigo-100": "text-indigo-600",
      "bg-amber-100": "text-amber-600",
      "bg-rose-100": "text-rose-600",
      "bg-emerald-100": "text-emerald-600",
      "bg-violet-100": "text-violet-600",
      "bg-slate-100": "text-slate-600",
    }[bgColor] || "text-indigo-600";

  const deltaStyles = {
    up: {
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      icon: FaArrowUp,
    },
    down: {
      color: "text-rose-600",
      bg: "bg-rose-50",
      icon: FaArrowDown,
    },
    neutral: {
      color: "text-slate-500",
      bg: "bg-slate-100",
      icon: FaMinus,
    },
  };
  const deltaStyle = deltaStyles[deltaType] || deltaStyles.neutral;
  const DeltaIcon = deltaStyle.icon;

  return (
    <div className="flex min-h-[148px] flex-col rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <div
          className={`${bgColor} flex h-9 w-9 items-center justify-center rounded-xl`}
        >
          <Icon className={`${iconColor} text-base`} />
        </div>
      </div>

      <div className="mt-4">
        <p className="font-mono text-2xl font-bold text-slate-900">{value}</p>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>

      <div className="mt-auto pt-4">
        {delta && (
          <div className="flex min-h-5 items-center gap-2 text-[10px]">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-px font-semibold ${deltaStyle.bg} ${deltaStyle.color}`}
            >
              <DeltaIcon size={9} />
              {delta}
            </span>
            <span className="font-medium text-slate-500">{deltaLabel}</span>
          </div>
        )}
        {!delta && footerText && (
          <p className="min-h-5 text-xs font-medium text-slate-500">
            {footerText}
          </p>
        )}
      </div>
    </div>
  );
}

export default KPICard;
