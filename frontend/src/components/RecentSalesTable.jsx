function RecentSalesTable({ sales }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow mt-6">
      <h2 className="text-xl font-bold mb-4">Recent Sales</h2>

      <table className="w-full">
        <thead>
          <tr>
            <th>Invoice</th>

            <th>Total</th>

            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {sales.map((sale) => (
            <tr key={sale._id}>
              <td>{sale.invoice_id}</td>

              <td>₹ {sale.final_total_amount}</td>

              <td>{sale.sale_status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RecentSalesTable;
