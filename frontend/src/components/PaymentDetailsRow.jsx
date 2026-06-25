function PaymentDetailsRow({ item, index, updatePM }) {
  return (
    <div className="flex gap-2 mb-2">
      <select
        value={item.payment_method || ""}
        onChange={(e) => updatePM(index, "payment_method", e.target.value)}
        className="border p-2"
      >
        <option value="">Select Payment Method</option>

        <option value="CASH">CASH</option>

        <option value="UPI">UPI</option>

        <option value="CARD">CARD</option>

        <option value="BANK_TRANSFER">BANK TRANSFER</option>

        <option value="CREDIT">CREDIT</option>
      </select>

      <input
        type="number"
        placeholder="Amount Paid"
        value={item.amount_paid || ""}
        onChange={(e) => updatePM(index, "amount_paid", Number(e.target.value))}
        className="border p-2"
      />
    </div>
  );
}

export default PaymentDetailsRow;
