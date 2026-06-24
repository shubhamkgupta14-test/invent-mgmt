import Loader from "./Loader";

function SaleTable({ sales }) {
  // if (loading) {
  //   return <Loader />;
  // }

  if (!sales?.length) {
    return (
      <div className="bg-white rounded-xl shadow p-5">
        <p>No sales found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3">Order Date</th>

            <th className="text-left p-3">Invoice Id</th>

            <th className="text-left p-3">Supplier</th>

            <th className="text-left p-3">Items</th>

            <th className="text-left p-3">Quantity</th>

            <th className="text-left p-3">Total</th>

            <th className="text-left p-3">Other</th>
          </tr>
        </thead>

        <tbody>
          {sales.map((sale) => (
            <tr key={sale.sale_id} className="border-b">
              <td className="p-3">
                {new Date(sale.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </td>

              <td className="p-3">{sale.invoice_id}</td>

              <td className="p-3">{sale.supplier_id}</td>

              <td className="p-3">{sale.items.length || 0}</td>

              <td className="p-3">{sale.total_quantity}</td>

              <td className="p-3">
                ₹ {sale.final_total_amount?.toLocaleString("en-IN")}
              </td>

              <td className="p-3">
                ₹{" "}
                {(
                  (sale.shipping_charges || 0) +
                  (sale.other_charges || 0)
                ).toLocaleString("en-IN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SaleTable;
