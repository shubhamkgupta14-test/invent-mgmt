function PurchaseItemRow({ item, index, products, updateItem }) {
  return (
    <div className="flex gap-2 mb-2">
      <select
        onChange={(e) => updateItem(index, "sku", e.target.value)}
        className="border p-2"
      >
        <option>Select Product</option>

        {products.map((p) => (
          <option key={p.sku} value={p.sku}>
            {p.sku} - {p.name}
          </option>
        ))}
      </select>

      <input
        type="number"
        placeholder="Qty"
        value={item.quantity}
        onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
        className="border p-2"
      />

      <input
        type="number"
        placeholder="Price"
        value={item.unit_price}
        onChange={(e) =>
          updateItem(index, "unit_price", Number(e.target.value))
        }
        className="border p-2"
      />

      <input
        type="number"
        placeholder="Discount %"
        value={item.discount_percentage}
        onChange={(e) =>
          updateItem(index, "discount_percentage", Number(e.target.value))
        }
        className="border p-2"
      />
    </div>
  );
}

export default PurchaseItemRow;
