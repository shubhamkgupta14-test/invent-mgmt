import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import DashboardCard from "../components/DashboardCard";
import RecentSalesTable from "../components/RecentSalesTable";
import DashboardTable from "../components/DashboardTable";
import Loader from "../components/Loader";

import {
  getDashboardSummary,
  getLowStockProducts,
  getRecentSales,
} from "../api/dashboardApi";

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [recentSales, setRecentSales] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [summaryRes, lowStockRes, salesRes] = await Promise.all([
        getDashboardSummary(),
        getLowStockProducts(),
        getRecentSales(),
      ]);

      setSummary(summaryRes.data.data);
      setLowStock(lowStockRes.data.data);
      setRecentSales(salesRes.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  if (!summary) {
    return (
      <MainLayout>
        <Loader />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* FIRST ROW */}

      <div className="grid grid-cols-4 gap-6">
        <DashboardCard
          title="Total Products"
          value={summary.inventory.total_products}
          bgColor="bg-blue-100 text-blue-700"
        />

        <DashboardCard
          title="Inventory Value"
          value={`₹ ${summary.inventory.total_inventory_value}`}
          bgColor="bg-green-100 text-green-700"
        />

        <DashboardCard
          title="Low Stock"
          value={summary.inventory.low_stock_products}
          bgColor="bg-yellow-100 text-yellow-700"
        />

        <DashboardCard
          title="Out Of Stock"
          value={summary.inventory.out_of_stock_products}
          bgColor="bg-red-100 text-red-700"
        />
      </div>

      {/* SECOND ROW */}

      <div className="grid grid-cols-2 gap-6 mt-6">
        <DashboardCard
          title="Total Sales"
          value={`₹ ${summary.sales.total_sales_amount}`}
          bgColor="bg-purple-100 text-purple-700"
        />

        <DashboardCard
          title="Total Purchases"
          value={`₹ ${summary.purchases.total_purchase_amount}`}
          bgColor="bg-orange-100 text-orange-700"
        />
      </div>

      {/* THIRD ROW */}

      <div className="grid grid-cols-2 gap-6 mt-6">
        <DashboardTable
          title="Recent Sold Products"
          columns={["Invoice", "Amount", "Date"]}
          data={recentSales.map((sale) => ({
            invoice: sale.invoice_id,

            amount: `₹ ${sale.final_total_amount}`,

            date: sale.created_at,
          }))}
        />

        <DashboardTable
          title="Most Selling Products"
          columns={["SKU", "Product", "Sold Qty"]}
          data={[]}
        />
      </div>

      {/* FOURTH ROW */}

      <div className="grid grid-cols-2 gap-6 mt-6">
        <DashboardTable
          title="Low Stock Items"
          columns={["SKU", "Name", "Quantity"]}
          data={lowStock.map((item) => ({
            sku: item.sku,

            name: item.name,

            quantity: item.quantity,
          }))}
        />

        <DashboardTable
          title="Out Of Stock Items"
          columns={["SKU", "Name", "Quantity"]}
          data={[]}
        />
      </div>
    </MainLayout>
  );
}

export default Dashboard;
