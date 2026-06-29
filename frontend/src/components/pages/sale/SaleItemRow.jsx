import SelectDropdown from "../../common/SelectDropdown";
import StockStatusBadge from "../../common/StockStatusBadge";

function SaleItemRow({ item, index, products, updateItem }) {
  const selectedProduct = products.find((product) => product.sku === item.sku);

  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-3 lg:grid-cols-[minmax(220px,1fr)_120px_140px_140px]">
      <div>
        <SelectDropdown
          label={
            <span className="flex flex-wrap items-center gap-2">
              <span>Product</span>
              {selectedProduct && (
                <StockStatusBadge status={selectedProduct.stock_status} />
              )}
            </span>
          }
          value={item.sku || ""}
          onChange={(value) => updateItem(index, "sku", value)}
          placeholder="Select Product"
          options={products.map((product) => ({
            value: product.sku,
            label: `${product.sku} - ${product.name}`,
          }))}
        />
      </div>

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
        placeholder="Price (Exc Tax)"
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
