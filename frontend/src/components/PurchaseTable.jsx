import Loader from "./Loader";
import { useEffect, useState } from "react";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

function PurchaseTable({ purchases }) {
  const [sortOrder, setSortOrder] = useState("asc");

  const sorted = [...purchases].sort((a, b) => {
    if (sortOrder === "desc") {
      return a.created_at.localeCompare(b.created_at);
    }

    return b.created_at.localeCompare(a.created_at);
  });

  if (!sorted?.length) {
    return (
      <div className="bg-white rounded-xl shadow p-5">
        <p>No purchases found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th
              className="
                p-3
                text-left
                cursor-pointer
                select-none
              "
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              <div className="inline-flex items-center gap-1">
                <span>Order Date</span>

                {sortOrder === "asc" ? (
                  <FaSortUp size={12} className="text-blue-600" />
                ) : (
                  <FaSortDown size={12} className="text-blue-600" />
                )}
              </div>
            </th>

            <th className="text-left p-3">Invoice Id</th>

            <th className="text-left p-3">Supplier</th>

            <th className="text-left p-3">Items</th>

            <th className="text-left p-3">Quantity</th>

            <th className="text-left p-3">Total</th>

            <th className="text-left p-3">Other</th>
          </tr>
        </thead>

        <tbody>
          {sorted.map((purchase) => (
            <tr key={purchase.purchase_id} className="border-b">
              <td className="p-3">
                {new Date(purchase.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </td>

              <td className="p-3">{purchase.invoice_id}</td>

              <td className="p-3">{purchase.supplier_id}</td>

              <td className="p-3">{purchase.items.length || 0}</td>

              <td className="p-3">{purchase.total_quantity}</td>

              <td className="p-3">
                ₹ {purchase.final_total_amount?.toLocaleString("en-IN")}
              </td>

              <td className="p-3">
                ₹{" "}
                {(
                  (purchase.shipping_charges || 0) +
                  (purchase.other_charges || 0)
                ).toLocaleString("en-IN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PurchaseTable;
