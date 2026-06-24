import Loader from "./Loader";
import StockStatusBadge from "../components/StockStatusBadge";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

function StockTable({ stocks, sortConfig, handleSort }) {
  // if (loading) {
  //   return <Loader />;
  // }

  if (!stocks?.length) {
    return (
      <div className="bg-white rounded-xl shadow p-5">
        <p>No stocks found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th
              className="p-3 text-left cursor-pointer select-none"
              onClick={() => handleSort("sku")}
            >
              <div className="inline-flex items-center gap-1">
                SKU
                {sortConfig.field === "sku" ? (
                  sortConfig.order === "asc" ? (
                    <FaSortUp size={12} className="text-blue-600" />
                  ) : (
                    <FaSortDown size={12} className="text-blue-600" />
                  )
                ) : (
                  <FaSortDown size={12} className="text-gray-300" />
                )}
              </div>
            </th>

            <th className="text-left p-3">Product name</th>

            <th className="text-left p-3">Quanity</th>

            <th className="text-left p-3">Avg Purchase Price</th>

            <th className="text-left p-3">Min Selling Price</th>

            <th
              className="p-3 text-left cursor-pointer select-none"
              onClick={() => handleSort("inventory_value")}
            >
              <div className="inline-flex items-center gap-1">
                Inventory Value
                {sortConfig.field === "inventory_value" ? (
                  sortConfig.order === "asc" ? (
                    <FaSortUp size={12} className="text-blue-600" />
                  ) : (
                    <FaSortDown size={12} className="text-blue-600" />
                  )
                ) : (
                  <FaSortDown size={12} className="text-gray-300" />
                )}
              </div>
            </th>

            <th className="text-left p-3">Stock Status</th>
          </tr>
        </thead>

        <tbody>
          {stocks.map((stock) => (
            <tr key={stock.sku} className="border-b">
              <td className="p-3">{stock.sku}</td>

              <td className="p-3">{stock.name}</td>

              <td className="p-3">{stock.quantity}</td>

              <td className="p-3">
                ₹ {stock.avg_price?.toLocaleString("en-IN")}
              </td>

              <td className="p-3">TBC</td>

              <td className="p-3">
                ₹ {stock.inventory_value?.toLocaleString("en-IN")}
              </td>

              <td className="p-3">
                <StockStatusBadge status={stock.stock_status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StockTable;
