import SelectDropdown from "../../common/SelectDropdown";

function PaymentDetailsRow({ item, index, updatePM }) {
  return (
    <div className="grid gap-3 rounded-lg border border-[var(--border)] bg-white p-3 md:grid-cols-[minmax(220px,1fr)_180px]">
      <div>
        <SelectDropdown
          label="Payment Method"
          value={item.payment_method || ""}
          onChange={(value) => updatePM(index, "payment_method", value)}
          placeholder="Select Payment Method"
          options={[
            { value: "CASH", label: "Cash" },
            { value: "UPI", label: "UPI" },
            { value: "CARD", label: "Card" },
            { value: "BANK_TRANSFER", label: "Bank Transfer" },
            { value: "CREDIT", label: "Credit" },
          ]}
        />
      </div>

      <input
        type="number"
        placeholder="Amount Paid"
        value={item.amount_paid || ""}
        onChange={(e) => updatePM(index, "amount_paid", Number(e.target.value))}
        className="mt-7 w-full rounded-lg border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
      />
    </div>
  );
}

export default PaymentDetailsRow;
