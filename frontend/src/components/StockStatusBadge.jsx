function StockStatusBadge({ status }) {
  const statusConfig = {
    IN_STOCK: {
      className: "bg-green-50 border-green-600 text-green-700",
      label: "IN STOCK",
    },

    LOW_QUANTITY: {
      className: "bg-orange-50 border-orange-600 text-orange-700",
      label: "LOW QUANTITY",
    },

    OUT_OF_STOCK: {
      className: "bg-red-50 border-red-600 text-red-700",
      label: "OUT OF STOCK",
    },
  };

  const config = statusConfig[status] || {
    className: "bg-gray-50 border-gray-500 text-gray-700",

    label: status,
  };

  return (
    <span
      className={` inline-flex items-center px-2 py-0.5 text-[9px] font-semibold rounded-md border ${config.className} `}
    >
      {config.label}
    </span>
  );
}

export default StockStatusBadge;
