import StockStatusBadge from "../../common/StockStatusBadge";
import SortableHeader from "../../common/SortableHeader";

function quantityBadgeClass(stock) {
  if (stock.stock_status === "OUT_OF_STOCK" || Number(stock.quantity || 0) <= 0) {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (stock.stock_status === "LOW_QUANTITY") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

function StockTable({ stocks, sortConfig, handleSort, onView }) {
  if (!stocks?.length) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <p className="py-8 text-center text-slate-500">
          No stocks found
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-slate-50/70">
              <SortableHeader label="SKU" field="sku" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Product Name" field="name" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Quantity" field="quantity" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Tax" field="tax_rate" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Avg Purchase Price" field="avg_price" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Min Selling Price" field="min_selling_price" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Inventory Value" field="inventory_value" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Stock Status" field="stock_status" sortConfig={sortConfig} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => (
              <tr
                key={stock.sku}
                onClick={() => onView?.(stock)}
                className="cursor-pointer border-b border-[var(--border)] transition-colors last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-5 py-4 text-slate-700">{stock.sku}</td>
                <td className="px-5 py-4 text-slate-700">
                  <div className="max-w-[220px] truncate" title={stock.name}>
                    {stock.name}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex min-w-9 justify-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${quantityBadgeClass(stock)}`}>
                    {stock.quantity}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-700">{stock.tax_rate ?? 0}%</td>
                <td className="px-5 py-4 text-slate-700">
                  Rs {stock.avg_price?.toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {stock.min_selling_price
                    ? `Rs ${stock.min_selling_price.toLocaleString("en-IN")}`
                    : "-"}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  Rs {stock.inventory_value?.toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-4">
                  <StockStatusBadge status={stock.stock_status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StockTable;
