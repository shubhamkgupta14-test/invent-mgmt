import { useState } from "react";
import SupplierSelector from "./SupplierSelector";
import ProductSelectors from "./ProductSelector";
import PurchaseItemRow from "./PurchaseItemRow";
import PaymentDetails from "./PaymentDetails";

function PurchaseForm({ products, onSubmit }) {
  //   const [supplier, setSupplier] = useState("");

  const [form, setForm] = useState({
    invoice_no: "",
    items: [
      {
        sku: "",
        quantity: 1,
        unit_price: 0,
        discount_percentage: 0,
      },
    ],
    additional_discount: 0,
    shipping_charges: 0,
    other_charges: 0,
    payment_details: {
      payment_method: "CASH",
      amount_paid: 0,
    },
    notes: "",
  });

  const [items, setItems] = useState([
    {
      qty: 1,
      price: 0,
    },
  ]);

  const addRow = () => {
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          sku: "",
          quantity: 1,
          unit_price: 0,
          discount_percentage: 0,
        },
      ],
    });
  };

  const updateItem = (index, key, value) => {
    const updated = [...form.items];
    updated[index][key] = value;

    setForm({ ...form, items: updated });
  };

  const calculateTotal = () => {
    return form.items.reduce((sum, item) => {
      const price = item.quantity * item.unit_price;

      const discount = price * (item.discount_percentage / 100);

      return sum + (price - discount);
    }, 0);
  };

  const handleSubmit = () => {
    onSubmit({
      ...form,
      total_amount: calculateTotal(),
    });
  };

  return (
    <div>
      {/* <SupplierSelector suppliers={suppliers} /> */}

      {form.items.map((item, i) => (
        <PurchaseItemRow
          key={i}
          item={item}
          index={i}
          products={products}
          updateItem={updateItem}
        />
      ))}

      <button onClick={addRow}>+ Add Item</button>

      <PaymentDetails form={form} setForm={setForm} />

      <div className="flex gap-2 my-2">
        <input type="text" placeholder="Notes" className="border p-2" />
      </div>

      <div className="mt-3 font-bold">Total: ₹ {calculateTotal()}</div>

      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 mt-4"
      >
        Save Purchase
      </button>
    </div>
  );
}

export default PurchaseForm;
