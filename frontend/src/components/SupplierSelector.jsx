function SupplierSelector({ suppliers, value, onChange }) {
  return (
    <select
      className="border p-2 w-full mb-4"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select Supplier</option>

      {suppliers.map((s) => (
        <option key={s.supplier_id} value={s.supplier_id}>
          {s.supplier_id} - {s.name}
        </option>
      ))}
    </select>
  );
}

export default SupplierSelector;
