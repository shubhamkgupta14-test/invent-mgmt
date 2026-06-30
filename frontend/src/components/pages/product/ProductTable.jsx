import ActionButtons from "../../common/ActionButtons";
import SortableHeader from "../../common/SortableHeader";

function ProductTable({
  products,
  onView,
  onEdit,
  onDelete,
  onToggleActive,
  canEdit = false,
  canDelete = false,
  canToggleActive = false,
  sortConfig,
  handleSort,
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
                <SortableHeader label="Active" field="is_active" sortConfig={sortConfig} onSort={handleSort} />
              )}
              <SortableHeader label="SKU" field="sku" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Name" field="name" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Category" field="category" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="GST" field="tax_rate" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Supplier" field="supplier_id" sortConfig={sortConfig} onSort={handleSort} />
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Manufactured
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
                <td className="px-5 py-4 font-semibold text-slate-900">
                  <div className="max-w-[240px] truncate" title={product.name}>
                    {product.name}
                  </div>
                </td>
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
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                      product.is_manufactured
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-slate-100 text-slate-600 ring-slate-200"
                    }`}
                  >
                    {product.is_manufactured ? "Yes" : "No"}
                  </span>
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
