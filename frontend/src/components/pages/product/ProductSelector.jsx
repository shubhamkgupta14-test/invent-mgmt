function ProductSelectors({ products, value, onChange }) {
  return (
    <select
      className="border p-2"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option>Select Product</option>

      {products.map((p) => (
        <option key={p.sku} value={p.sku}>
          {p.sku} - {p.name}
        </option>
      ))}
    </select>
  );
}

export default ProductSelectors;
