import { FaArrowUp, FaArrowDown } from "react-icons/fa";

export function KPICard({
  icon: Icon,
  title,
  value,
  subtitle,
  delta,
  deltaType = "up",
  bgColor = "bg-indigo-100",
}) {
  const iconColor =
    {
      "bg-indigo-100": "text-indigo-600",
      "bg-amber-100": "text-amber-600",
      "bg-rose-100": "text-rose-600",
      "bg-emerald-100": "text-emerald-600",
      "bg-violet-100": "text-violet-600",
    }[bgColor] || "text-indigo-600";

  const deltaColor = deltaType === "up" ? "text-emerald-600" : "text-rose-600";
  const DeltaIcon = deltaType === "up" ? FaArrowUp : FaArrowDown;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <div
          className={`${bgColor} flex h-9 w-9 items-center justify-center rounded-lg`}
        >
          <Icon className={`${iconColor} text-base`} />
        </div>
      </div>

      <p className="mb-1 font-mono text-2xl font-bold text-slate-900">
        {value}
      </p>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{subtitle}</p>
        {delta && (
          <div
            className={`flex items-center gap-1 ${deltaColor} text-xs font-semibold`}
          >
            <DeltaIcon size={11} />
            {delta}
          </div>
        )}
      </div>
    </div>
  );
}

export default KPICard;
