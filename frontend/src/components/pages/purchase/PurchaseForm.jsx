import { useState } from "react";
import Button from "../../common/Button";
import Input from "../../common/Input";
import Textarea from "../../common/Textarea";
import PaymentDetailsRow from "./PaymentDetailsRow";
import PurchaseItemRow from "./PurchaseItemRow";
import { formatMoney } from "../../../utils/formatters";

function PurchaseForm({ products, onSubmit }) {
  const [form, setForm] = useState({
    invoice_id: "",
    items: [{}],
    additional_discount: 0,
    shipping_charges: 0,
    other_charges: 0,
    payment_details: [
      {
        payment_method: "",
        amount_paid: 0,
      },
    ],
    notes: "",
  });

  const addItemRow = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, {}],
    }));
  };

  const addPmRow = () => {
    setForm((current) => ({
      ...current,
      payment_details: [...current.payment_details, {}],
    }));
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

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const getProductTaxRate = (sku) =>
    Number(products.find((product) => product.sku === sku)?.tax_rate || 0);

  const calculateTotal = () => {
    const itemTotal = form.items.reduce((sum, item) => {
      const price = (item.quantity || 0) * (item.unit_price || 0);
      const discount = price * ((item.discount_percentage || 0) / 100);
      const taxableAmount = price - discount;
      const tax = taxableAmount * (getProductTaxRate(item.sku) / 100);
      return sum + taxableAmount + tax;
    }, 0);

    return (
      itemTotal +
      (form.shipping_charges || 0) +
      (form.other_charges || 0) -
      (form.additional_discount || 0)
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      ...form,
      total_amount: calculateTotal(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section>
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <Input
            label="Invoice Number"
            placeholder="Enter invoice number"
            value={form.invoice_id || ""}
            onChange={(value) => updateForm("invoice_id", value)}
            required
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-slate-50 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Purchase Items
            </h2>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={addItemRow}>
            Add Item
          </Button>
        </div>

        <div className="space-y-3">
          {form.items.map((item, i) => (
            <PurchaseItemRow
              key={i}
              item={item}
              index={i}
              products={products}
              updateItem={updateItem}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-slate-50 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Payment Details
          </h2>
          <Button type="button" variant="secondary" size="sm" onClick={addPmRow}>
            Add Payment
          </Button>
        </div>

        <div className="space-y-3">
          {form.payment_details.map((payment, index) => (
            <PaymentDetailsRow
              key={index}
              item={payment}
              index={index}
              updatePM={updatePM}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Additional Discount (Fixed Amount)"
            type="number"
            placeholder="0"
            value={form.additional_discount || ""}
            onChange={(value) => updateForm("additional_discount", Number(value))}
          />
          <Input
            label="Shipping Charges"
            type="number"
            placeholder="0"
            value={form.shipping_charges || ""}
            onChange={(value) => updateForm("shipping_charges", Number(value))}
          />
          <Input
            label="Other Charges"
            type="number"
            placeholder="0"
            value={form.other_charges || ""}
            onChange={(value) => updateForm("other_charges", Number(value))}
          />
        </div>
      </section>

      <Textarea
        label="Notes"
        placeholder="Add internal notes"
        value={form.notes || ""}
        onChange={(value) => updateForm("notes", value)}
        rows={3}
      />

      <div className="flex flex-col items-end gap-4 border-t border-[var(--border)] pt-5 md:flex-row md:items-center md:justify-between">
        <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          <span className="font-semibold">Estimated total:</span>{" "}
          <span className="font-mono">{formatMoney(calculateTotal())}</span>
        </div>
        <Button type="submit" variant="primary">
          Save Purchase
        </Button>
      </div>
    </form>
  );
}

export default PurchaseForm;
