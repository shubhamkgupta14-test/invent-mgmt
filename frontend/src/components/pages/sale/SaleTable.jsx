import StatusBadge from "../../common/StatusBadge";
import { formatDateIST } from "../../../utils/formatters";

const getQuantity = (sale) =>
  sale.total_quantity ||
  sale.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) ||
  0;

function SaleTable({ sales, onView }) {
  if (!sales?.length) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <p className="py-8 text-center text-slate-500">No sales found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-slate-50/70">
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Order Date
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Invoice Id
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
            {sales.map((sale) => (
              <tr
                key={sale.sale_id}
                onClick={() => onView?.(sale)}
                className="cursor-pointer border-b border-[var(--border)] transition-colors last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-5 py-4 text-slate-700">
                  {formatDateIST(sale.created_at)}
                </td>
                <td className="px-5 py-4 text-slate-700">{sale.invoice_id}</td>
                <td className="px-5 py-4 text-slate-700">
                  {sale.items?.length || 0}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {getQuantity(sale)}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  Rs {sale.final_total_amount?.toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  <StatusBadge status={sale.sale_status} type="sale" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SaleTable;
