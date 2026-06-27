import {
  FaCheckCircle,
  FaExchangeAlt,
  FaHourglassHalf,
  FaMinusCircle,
  FaTimesCircle,
  FaUndo,
} from "react-icons/fa";

const STATUS_CONFIG = {
  sale: {
    SOLD: {
      label: "Sold",
      className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      icon: FaCheckCircle,
    },
    EXCHANGE: {
      label: "Exchange",
      className: "bg-indigo-100 text-indigo-700 border border-indigo-200",
      icon: FaExchangeAlt,
    },
    RETURN: {
      label: "Return",
      className: "bg-rose-100 text-rose-700 border border-rose-200",
      icon: FaUndo,
    },
  },
  purchase: {
    COMPLETED: {
      label: "Completed",
      className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      icon: FaCheckCircle,
    },
    PENDING: {
      label: "Pending",
      className: "bg-amber-100 text-amber-700 border border-amber-200",
      icon: FaHourglassHalf,
    },
    CANCELLED: {
      label: "Cancelled",
      className: "bg-rose-100 text-rose-700 border border-rose-200",
      icon: FaTimesCircle,
    },
  },
  payment: {
    PAID: {
      label: "Paid",
      className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      icon: FaCheckCircle,
    },
    PARTIAL: {
      label: "Partial",
      className: "bg-amber-100 text-amber-700 border border-amber-200",
      icon: FaHourglassHalf,
    },
    UNPAID: {
      label: "Unpaid",
      className: "bg-rose-100 text-rose-700 border border-rose-200",
      icon: FaMinusCircle,
    },
  },
};

function formatLabel(status) {
  return String(status || "UNKNOWN").replaceAll("_", " ");
}

function StatusBadge({ status, type = "sale" }) {
  const normalized = String(status || "UNKNOWN").toUpperCase();
  const config = STATUS_CONFIG[type]?.[normalized] || {
    label: formatLabel(normalized),
    className: "bg-slate-100 text-slate-700 border border-slate-200",
    icon: null,
  };
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.className}`}
    >
      {Icon && <Icon size={10} />}
      {config.label}
    </span>
  );
}

export default StatusBadge;
