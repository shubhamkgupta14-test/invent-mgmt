import { useState } from "react";
import SupplierSelector from "./SupplierSelector";
import ProductSelectors from "./ProductSelector";
import PurchaseItemRow from "./PurchaseItemRow";
import PaymentDetails from "./PaymentDetails";
import PaymentDetailsRow from "./PaymentDetailsRow";

function PurchaseForm({ products, onSubmit }) {
  const [form, setForm] = useState({
    invoice_id: "",
    items: [{}],
    additional_discount: 0,
    shipping_charges: 0,
    other_charges: 0,
    payment_details: [
      {
        payment_method: "Payment Method",
        amount_paid: 0,
      },
    ],
    notes: "",
  });

  const [items, setItems] = useState([{}]);
  const [pm, setPm] = useState([{}]);

  const addItemRow = () => {
    setForm({
      ...form,
      items: [...form.items, {}],
    });
  };

  const addPmRow = () => {
    setForm({
      ...form,
      payment_details: [...form.payment_details, {}],
    });
  };

  const updateItem = (index, key, value) => {
    const updated = [...form.items];
    updated[index][key] = value;

    setForm({ ...form, items: updated });
  };

  const updatePM = (index, key, value) => {
    const updated = [...form.payment_details];
    updated[index][key] = value;

    setForm({ ...form, payment_details: updated });
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
      <div className="flex gap-2 my-2">
        <input
          type="text"
          placeholder="Invoice Number"
          value={form.invoice_id || ""}
          onChange={(e) =>
            setForm({
              ...form,
              invoice_id: e.target.value,
            })
          }
          className="border p-2 w-1/3"
        />
      </div>

      {form.items.map((item, i) => (
        <PurchaseItemRow
          key={i}
          item={item}
          index={i}
          products={products}
          updateItem={updateItem}
        />
      ))}

      <button onClick={addItemRow}>+ Add Item</button>

      {form.payment_details.map((payment, index) => (
        <PaymentDetailsRow
          key={index}
          item={payment}
          index={index}
          updatePM={updatePM}
        />
      ))}

      <button onClick={addPmRow}>+ Add Payment method</button>

      <div className="flex gap-2 my-2">
        <input
          type="number"
          placeholder="Additional Discount %"
          value={form.additional_discount || ""}
          onChange={(e) =>
            setForm({
              ...form,
              additional_discount: Number(e.target.value),
            })
          }
          className="border p-2"
        />

        <input
          type="number"
          placeholder="Shipping Charges"
          value={form.shipping_charges || ""}
          onChange={(e) =>
            setForm({
              ...form,
              shipping_charges: Number(e.target.value),
            })
          }
          className="border p-2"
        />

        <input
          type="number"
          placeholder="Other Charges"
          value={form.other_charges || ""}
          onChange={(e) =>
            setForm({
              ...form,
              other_charges: Number(e.target.value),
            })
          }
          className="border p-2"
        />
      </div>

      <div className="flex gap-2 my-2">
        <input
          type="text"
          placeholder="Notes"
          value={form.notes || ""}
          onChange={(e) =>
            setForm({
              ...form,
              notes: e.target.value,
            })
          }
          className="border p-2 w-1/3"
        />
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
