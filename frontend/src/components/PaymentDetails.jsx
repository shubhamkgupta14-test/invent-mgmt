function PaymentDetails({ form, setForm }) {
  return (
    <div className="mt-4">
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
        <option value="CASH">Cash</option>
        <option value="UPI">UPI</option>
        <option value="CARD">Card</option>
        <option value="BANK_TRANSFER">Bank Transfer</option>
        <option value="CREDIT">Credit</option>
      </select>
    </div>
  );
}

export default PaymentDetails;
