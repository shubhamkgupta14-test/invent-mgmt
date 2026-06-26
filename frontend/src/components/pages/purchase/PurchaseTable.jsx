import { useState } from "react";
import { FaSortDown, FaSortUp } from "react-icons/fa";
import StatusBadge from "../../common/StatusBadge";
import { formatDateIST } from "../../../utils/formatters";

function PurchaseTable({ purchases, onView }) {
  const [sortOrder, setSortOrder] = useState("asc");

  const sorted = [...purchases].sort((a, b) => {
    if (sortOrder === "desc") {
      return a.created_at.localeCompare(b.created_at);
    }

    return b.created_at.localeCompare(a.created_at);
  });

  if (!sorted?.length) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <p className="py-8 text-center text-slate-500">
          No purchases found
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
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
              >
                <div className="inline-flex items-center gap-2">
                  Order Date
                  {sortOrder === "asc" ? (
                    <FaSortUp size={12} className="text-slate-500" />
                  ) : (
                    <FaSortDown size={12} className="text-slate-500" />
                  )}
                </div>
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Invoice Id
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Supplier
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Items
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Quantity
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Total
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((purchase) => (
              <tr
                key={purchase.purchase_id}
                onClick={() => onView?.(purchase)}
                className="cursor-pointer border-b border-[var(--border)] transition-colors last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-5 py-4 text-slate-700">
                  {formatDateIST(purchase.created_at)}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {purchase.invoice_id}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {purchase.supplier_id}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {purchase.items.length || 0}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {purchase.total_quantity}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  Rs {purchase.final_total_amount?.toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  <StatusBadge status={purchase.purchase_status} type="purchase" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PurchaseTable;
