const platformStyles = {
  Flipkart: {
    label: "Flipkart",
    className: "border-[#f8d84a] bg-[#2874f0] text-white",
  },
  Amazon: {
    label: "Amazon",
    className: "border-[#ff9900] bg-[#232f3e] text-white",
  },
  Meesho: {
    label: "Meesho",
    className: "border-[#f43397] bg-[#fdf2f8] text-[#9f0f5f]",
  },
  "Self Store": {
    label: "Self Store",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  Offline: {
    label: "Offline",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  Other: {
    label: "Other",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
};

function PlatformBadge({ platform }) {
  const config = platformStyles[platform] || platformStyles.Other;

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export default PlatformBadge;
