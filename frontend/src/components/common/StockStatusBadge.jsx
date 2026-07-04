import {
  FaCheckCircle,
  FaExclamationCircle,
  FaTimesCircle,
} from "react-icons/fa";

function StockStatusBadge({ status }) {
  const statusConfig = {
    IN_STOCK: {
      className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      label: "In Stock",
      icon: FaCheckCircle,
    },
    LOW_QUANTITY: {
      className: "bg-amber-100 text-amber-700 border border-amber-200",
      label: "Low Stock",
      icon: FaExclamationCircle,
    },
    OUT_OF_STOCK: {
      className: "bg-rose-100 text-rose-700 border border-rose-200",
      label: "Out of Stock",
      icon: FaTimesCircle,
    },
  };

  const config = statusConfig[status] || {
    className: "bg-slate-100 text-slate-700 border border-slate-200",
    label: status,
    icon: null,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.className}`}
    >
      {Icon && <Icon size={10} className="shrink-0" />}
      {config.label}
    </span>
  );
}

export default StockStatusBadge;
