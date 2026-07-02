import SelectDropdown from "../../common/SelectDropdown";

function PurchaseItemRow({ item, index, products, updateItem }) {
  const selectedProduct = products.find((product) => product.sku === item.sku);

  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-3 lg:grid-cols-[minmax(220px,1fr)_120px_140px_140px]">
      <div>
        <SelectDropdown
          label={
            <span className="flex flex-wrap items-center gap-2">
              <span>Product</span>
              {selectedProduct && (
                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                  GST - {selectedProduct.tax_rate ?? 0}%
                </span>
              )}
            </span>
          }
          value={item.sku || ""}
          onChange={(value) => updateItem(index, "sku", value)}
          placeholder="Select product"
          options={products.map((p) => ({
            value: p.sku,
            label: `${p.sku} - ${p.name}`,
          }))}
        />
      </div>

      <input
        type="number"
        placeholder="Quantity"
        value={item.quantity || ""}
        onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
        className="mt-7 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
      />

      <input
        type="number"
        placeholder="Unit price (excl. tax)"
        value={item.unit_price || ""}
        onChange={(e) =>
          updateItem(index, "unit_price", Number(e.target.value))
        }
        className="mt-7 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
      />

      <input
        type="number"
        placeholder="Discount %"
        value={item.discount_percentage || ""}
        onChange={(e) =>
          updateItem(index, "discount_percentage", Number(e.target.value))
        }
        className="mt-7 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
      />
    </div>
  );
}

export default PurchaseItemRow;
