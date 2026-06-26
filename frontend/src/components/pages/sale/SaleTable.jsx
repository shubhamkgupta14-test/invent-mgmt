function SaleTable({ sales }) {
  if (!sales?.length) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm">
        <p className="py-8 text-center text-slate-500">No sales found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-sm">
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
                Other
              </th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr
                key={sale.sale_id}
                className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-5 py-4 text-slate-700">
                  {new Date(sale.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-5 py-4 text-slate-700">{sale.invoice_id}</td>
                <td className="px-5 py-4 text-slate-700">
                  {sale.supplier_id}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {sale.items.length || 0}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {sale.total_quantity}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  Rs {sale.final_total_amount?.toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  Rs{" "}
                  {(
                    (sale.shipping_charges || 0) + (sale.other_charges || 0)
                  ).toLocaleString("en-IN")}
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
