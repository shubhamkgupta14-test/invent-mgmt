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
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full ${config.className}`}
    >
      {Icon && <Icon size={14} />}
      {config.label}
    </span>
  );
}

export default StockStatusBadge;
