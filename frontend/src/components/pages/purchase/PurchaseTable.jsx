import StatusBadge from "../../common/StatusBadge";
import SortableHeader from "../../common/SortableHeader";
import { formatDateIST } from "../../../utils/formatters";

const getItemSummary = (items = []) => {
  const firstItem = items[0];
  if (!firstItem) return "-";

  return firstItem.sku
    ? `${firstItem.sku} - ${firstItem.name || "Product"}`
    : firstItem.name || "Product";
};

function PurchaseTable({ purchases, onView, sortConfig, handleSort }) {
  if (!purchases?.length) {
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
              <SortableHeader label="Order Date" field="created_at" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Invoice Id" field="invoice_id" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Supplier" field="supplier_id" sortConfig={sortConfig} onSort={handleSort} />
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Product</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Items</th>
              <SortableHeader label="Quantity" field="total_quantity" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Total" field="final_total_amount" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Payment" field="payment_status" sortConfig={sortConfig} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => {
              const itemSummary = getItemSummary(purchase.items);
              const extraCount = Math.max((purchase.items?.length || 0) - 1, 0);

              return (
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
                  <td className="px-5 py-4 font-medium text-slate-900">
                    <div className="flex max-w-[240px] items-center gap-2">
                      <span className="truncate" title={itemSummary}>
                        {itemSummary}
                      </span>
                      {extraCount > 0 && (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200">
                          +{extraCount}
                        </span>
                      )}
                    </div>
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
                    <StatusBadge status={purchase.payment_status} type="payment" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PurchaseTable;
