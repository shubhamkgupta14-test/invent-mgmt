function ProductTable({ products }) {
  if (!products?.length) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm">
        <p className="py-8 text-center text-slate-500">
          No products found
        </p>
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
                SKU
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Name
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Category
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                GST
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Supplier
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.sku}
                className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-5 py-4 text-slate-700">{product.sku}</td>
                <td className="px-5 py-4 font-semibold text-slate-900">{product.name}</td>
                <td className="px-5 py-4 text-slate-700">
                  {product.category}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {product.tax_rate}%
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {product.supplier_id}
                </td>
                <td className="px-5 py-4">
                  <button className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-indigo-700">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProductTable;
