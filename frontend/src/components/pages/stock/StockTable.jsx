import StockStatusBadge from "../../common/StockStatusBadge";
import { FaSortDown, FaSortUp } from "react-icons/fa";

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
              <th
                className="cursor-pointer select-none px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500"
                onClick={() => handleSort("sku")}
              >
                <div className="inline-flex items-center gap-2">
                  SKU
                  {sortConfig.field === "sku" ? (
                    sortConfig.order === "asc" ? (
                      <FaSortUp size={12} className="text-slate-500" />
                    ) : (
                      <FaSortDown size={12} className="text-slate-500" />
                    )
                  ) : (
                    <FaSortDown size={12} className="text-slate-300" />
                  )}
                </div>
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Product Name
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Quantity
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Avg Purchase Price
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Min Selling Price
              </th>
              <th
                className="cursor-pointer select-none px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500"
                onClick={() => handleSort("inventory_value")}
              >
                <div className="inline-flex items-center gap-2">
                  Inventory Value
                  {sortConfig.field === "inventory_value" ? (
                    sortConfig.order === "asc" ? (
                      <FaSortUp size={12} className="text-slate-500" />
                    ) : (
                      <FaSortDown size={12} className="text-slate-500" />
                    )
                  ) : (
                    <FaSortDown size={12} className="text-slate-300" />
                  )}
                </div>
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Stock Status
              </th>
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
                <td className="px-5 py-4 text-slate-700">{stock.name}</td>
                <td className="px-5 py-4 text-slate-700">{stock.quantity}</td>
                <td className="px-5 py-4 text-slate-700">
                  Rs {stock.avg_price?.toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-4 text-slate-700">TBC</td>
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
