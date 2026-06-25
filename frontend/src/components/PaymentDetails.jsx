function PaymentDetails({ form, setForm }) {
  return (
    <div className="flex gap-2 mb-2 mt-4">
      <select
        value={form.payment_details.payment_method}
        onChange={(e) =>
          setForm({
            ...form,
            payment_details: {
              ...form.payment_details,
              payment_method: e.target.value,
            },
          })
        }
        className="border p-2"
      >
        <option>Select Payment Method</option>
        <option value="CASH">Cash</option>
        <option value="UPI">UPI</option>
        <option value="CARD">Card</option>
        <option value="BANK_TRANSFER">Bank Transfer</option>
        <option value="CREDIT">Credit</option>
      </select>

      <input
        type="number"
        placeholder="Amount Paid"
        value={form.payment_details.amount_paid || ""}
        onChange={(e) =>
          setForm({
            ...form,
            payment_details: {
              ...form.payment_details,
              amount_paid: Number(e.target.value),
            },
          })
        }
        className="border p-2"
      />
    </div>
  );
}

export default PaymentDetails;
