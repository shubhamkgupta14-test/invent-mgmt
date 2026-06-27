import ActionButtons from "../../common/ActionButtons";

function ProductTable({
  products,
  onView,
  onEdit,
  onDelete,
  onToggleActive,
  canEdit = false,
  canDelete = false,
  canToggleActive = false,
}) {
  const hasActions = canEdit || canDelete;

  if (!products?.length) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <p className="py-8 text-center text-slate-500">
          No products found
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
              {canToggleActive && (
                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Active
                </th>
              )}
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
              {hasActions && (
                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.sku}
                onClick={() => onView?.(product)}
                className="cursor-pointer border-b border-[var(--border)] transition-colors last:border-0 hover:bg-slate-50/70"
              >
                {canToggleActive && (
                  <td
                    className="px-5 py-4"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(product.is_active)}
                      onChange={(event) =>
                        onToggleActive?.(product, event.target.checked)
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                      aria-label={`Set ${product.name} active`}
                    />
                  </td>
                )}
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
                {hasActions && (
                  <td
                    className="px-5 py-4"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <ActionButtons
                      onEdit={canEdit ? () => onEdit?.(product) : undefined}
                      onDelete={canDelete ? () => onDelete?.(product) : undefined}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProductTable;
