import SelectDropdown from "../../common/SelectDropdown";
import StockStatusBadge from "../../common/StockStatusBadge";
import { formatMoney } from "../../../utils/formatters";

const money = (value) => `Min ${formatMoney(value)}`;
const isLowStock = (product) => product?.stock_status === "LOW_QUANTITY";

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
              {isLowStock(selectedProduct) ? (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Quantity {Number(selectedProduct.quantity || 0).toLocaleString("en-IN")}
                </span>
              ) : null}
              {selectedProduct?.min_selling_price ? (
                <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                  {money(selectedProduct.min_selling_price)}
                </span>
              ) : null}
            </span>
          }
          value={item.sku || ""}
          onChange={(value) => updateItem(index, "sku", value)}
          placeholder="Select product"
          allowCustom
          options={products.map((product) => ({
            value: product.sku,
            label: `${product.sku} - ${product.name}`,
          }))}
        />
      </div>

      <input
        type="number"
        placeholder="Quantity"
        value={item.quantity || ""}
        onChange={(event) =>
          updateItem(index, "quantity", Number(event.target.value))
        }
        className="mt-7 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
      />

      <input
        type="number"
        placeholder="Unit price (excl. tax)"
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
