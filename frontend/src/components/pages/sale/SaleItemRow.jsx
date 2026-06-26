import SelectDropdown from "../../common/SelectDropdown";

function SaleItemRow({ item, index, products, updateItem }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-3 lg:grid-cols-[minmax(220px,1fr)_120px_140px_140px]">
      <SelectDropdown
        label="Product"
        value={item.sku || ""}
        onChange={(value) => updateItem(index, "sku", value)}
        placeholder="Select Product"
        options={products.map((product) => ({
          value: product.sku,
          label: `${product.sku} - ${product.name}`,
        }))}
      />

      <input
        type="number"
        placeholder="Qty"
        value={item.quantity || ""}
        onChange={(event) =>
          updateItem(index, "quantity", Number(event.target.value))
        }
        className="mt-7 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
      />

      <input
        type="number"
        placeholder="Price"
        value={item.unit_price || ""}
        onChange={(event) =>
          updateItem(index, "unit_price", Number(event.target.value))
        }
        className="mt-7 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
      />

      <input
        type="number"
        placeholder="Discount %"
        value={item.discount_percentage || ""}
        onChange={(event) =>
          updateItem(index, "discount_percentage", Number(event.target.value))
        }
        className="mt-7 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
      />
    </div>
  );
}

export default SaleItemRow;
