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
    <div className="group relative flex overflow-hidden rounded-xl border border-[var(--border)] bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <div
        className={`${bgColor} absolute -right-3 -top-3 flex h-20 w-20 rotate-6 items-center justify-center rounded-[1.75rem] opacity-70 transition-transform duration-300 group-hover:rotate-0 group-hover:scale-105`}
        aria-hidden="true"
      >
        <Icon
          className={`${iconColor} text-4xl opacity-45 transition-opacity duration-300 group-hover:opacity-75`}
        />
      </div>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <p className="pr-16 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </p>

        <div className="mt-1 pr-16">
          <p className="font-mono text-xl font-bold leading-6 text-slate-900">
            {value}
          </p>
        </div>

        <div className="mt-4 flex min-h-4 items-center justify-between gap-2 text-[10px]">
          <p className="min-w-0 truncate font-medium text-slate-500">
            {subtitle}
          </p>
          {delta && (
            <div className="flex shrink-0 items-center gap-1.5">
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
            <p className="shrink-0 text-right font-medium text-slate-500">
              {footerText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default KPICard;
