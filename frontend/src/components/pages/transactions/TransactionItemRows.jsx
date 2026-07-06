import Button from "../../common/Button";
import Input from "../../common/Input";
import SelectDropdown from "../../common/SelectDropdown";

function TransactionItemRows({
  title,
  items,
  products,
  onAdd,
  onChange,
  showReason = true,
  showStatus = true,
}) {
  const productOptions = [
    ...products.map((product) => ({
      value: product.sku,
      label: `${product.sku} - ${product.name}`,
    })),
    ...items
      .filter(
        (item) =>
          item.sku && !products.some((product) => product.sku === item.sku),
      )
      .map((item) => ({
        value: item.sku,
        label: `${item.sku} - ${item.name || "Product"}`,
      })),
  ];

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-slate-50 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
          Add Item
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className={`grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-3 ${
              showReason && showStatus
                ? "xl:grid-cols-[minmax(260px,1fr)_100px_120px_150px_minmax(220px,1fr)]"
                : showReason
                  ? "xl:grid-cols-[minmax(260px,1fr)_110px_130px_minmax(220px,1fr)]"
                  : "xl:grid-cols-[minmax(260px,1fr)_110px_130px]"
            }`}
          >
            <SelectDropdown
              label="Product"
              value={item.sku || ""}
              onChange={(value) => onChange(index, "sku", value)}
              placeholder="Select product"
              options={productOptions}
              allowCustom
              required
            />
            <Input
              label="Quantity"
              type="number"
              value={item.quantity || ""}
              onChange={(value) => onChange(index, "quantity", Number(value))}
              required
            />
            <Input
              label="Unit Price"
              type="number"
              value={item.unit_price || ""}
              onChange={(value) => onChange(index, "unit_price", Number(value))}
            />
            {showStatus && (
              <SelectDropdown
                label="Item Status"
                value={item.item_status || "RESELLABLE"}
                onChange={(value) => onChange(index, "item_status", value)}
                options={[
                  { value: "RESELLABLE", label: "Resellable" },
                  { value: "DAMAGED", label: "Damaged" },
                  { value: "LOST", label: "Lost" },
                ]}
                required
              />
            )}
            {showReason && (
              <Input
                label="Reason"
                value={item.reason || ""}
                onChange={(value) => onChange(index, "reason", value)}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default TransactionItemRows;
