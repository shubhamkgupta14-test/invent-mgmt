import { useEffect, useMemo, useState } from "react";
import {
  FaBoxes,
  FaChartLine,
  FaExclamationCircle,
  FaMoneyBillWave,
  FaShoppingCart,
  FaTruck,
} from "react-icons/fa";
import { getDashboardSummary } from "../api/dashboardApi";
import { getProducts } from "../api/productApi";
import { getSales } from "../api/salesApi";
import { getStocks } from "../api/stockApi";
import KPICard from "../components/common/KPICard";
import Loader from "../components/common/Loader";
import StockStatusBadge from "../components/common/StockStatusBadge";
import DashboardTable from "../components/pages/dashboard/DashboardTable";
import MainLayout from "../layouts/MainLayout";

const money = (value = 0) => `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const CountBadge = ({ children, tone = "slate" }) => {
  const tones = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    red: "bg-rose-50 text-rose-700 ring-rose-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

// TODO: need to make dynamic and should come from sales table.
const SaleStatusBadge = ({ status = "SOLD" }) => {
  const label = status.replaceAll("_", " ");
  return <CountBadge tone="green">{label}</CountBadge>;
};

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [summaryRes, salesRes, stocksRes, productsRes] = await Promise.all([
        getDashboardSummary(),
        getSales(),
        getStocks(),
        getProducts(),
      ]);

      setSummary(summaryRes.data.data);
      setSales(salesRes.data.data || []);
      setStocks(stocksRes.data.data || []);
      setProducts(productsRes.data.data || []);
    } catch (error) {
      console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const dashboardData = useMemo(() => {
    const stockBySku = new Map(stocks.map((stock) => [stock.sku, stock]));
    const productBySku = new Map(products.map((product) => [product.sku, product]));

    console.log(stockBySku)

    const recentSales = [...sales]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map((sale) => {
        const firstItem = sale.items?.[0] || {};
        const quantity = sale.items?.reduce(
          (sum, item) => sum + Number(item.quantity || 0),
          0,
        );

        return {
          id: sale.sale_id,
          product:
            sale.items?.length > 1
              ? `${firstItem.name || firstItem.sku} +${sale.items.length - 1}`
              : firstItem.name || firstItem.sku || sale.invoice_id,
          quantity,
          total: sale.final_total_amount,
          date: sale.created_at,
          status: sale.sale_status,
        };
      });

    const soldMap = new Map();
    sales.forEach((sale) => {
      sale.items?.forEach((item) => {
        const existing = soldMap.get(item.sku) || {
          sku: item.sku,
          product: item.name || item.sku,
          quantity: 0,
        };
        existing.quantity += Number(item.quantity || 0);
        soldMap.set(item.sku, existing);
      });
    });

    const mostSoldItems = [...soldMap.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map((item) => {
        const product = productBySku.get(item.sku);
        const stock = stockBySku.get(item.sku);
        return {
          ...item,
          category: product?.category || "-",
          stock: stock?.quantity ?? 0,
          status: stock?.stock_status || "UNKNOWN",
        };
      });

    const lowQuantityProducts = stocks
      .filter((stock) => stock.stock_status === "LOW_QUANTITY")
      .sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0))
      .slice(0, 5)
      .map((stock) => ({
        ...stock,
        product: stock.name,
        price: stock.avg_price,
      }));

    const outOfStockProducts = stocks
      .filter((stock) => stock.stock_status === "OUT_OF_STOCK")
      .slice(0, 5)
      .map((stock) => {
        const product = productBySku.get(stock.sku);
        return {
          ...stock,
          product: stock.name,
          category: product?.category || "-",
          price: stock.avg_price,
        };
      });

    return {
      recentSales,
      mostSoldItems,
      lowQuantityProducts,
      outOfStockProducts,
    };
  }, [products, sales, stocks]);

  if (loading || !summary) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading dashboard..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-600">
          Welcome back. Here's your HappiHome inventory overview.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KPICard
          icon={FaBoxes}
          title="Total Products"
          value={summary.inventory.total_products}
          subtitle="In catalog"
          bgColor="bg-indigo-100"
        />
        <KPICard
          icon={FaMoneyBillWave}
          title="Inventory Value"
          value={`Rs ${(summary.inventory.total_inventory_value / 1000).toFixed(1)}K`}
          subtitle="Total valuation"
          bgColor="bg-emerald-100"
        />
        <KPICard
          icon={FaChartLine}
          title="Total Sales"
          value={`Rs ${(summary.sales.total_sales_amount / 1000).toFixed(1)}K`}
          subtitle="All time"
          delta={`${summary.sales.total_orders || 0} orders`}
          deltaType="up"
          bgColor="bg-violet-100"
        />
        <KPICard
          icon={FaTruck}
          title="Total Purchases"
          value={`Rs ${(summary.purchases.total_purchase_amount / 1000).toFixed(1)}K`}
          subtitle="All time"
          bgColor="bg-amber-100"
        />
        <KPICard
          icon={FaExclamationCircle}
          title="Stock Alerts"
          value={
            summary.inventory.low_stock_products +
            summary.inventory.out_of_stock_products
          }
          subtitle={`${summary.inventory.low_stock_products} low + ${summary.inventory.out_of_stock_products} out`}
          delta={summary.inventory.out_of_stock_products ? "Needs review" : "Healthy"}
          deltaType={summary.inventory.out_of_stock_products ? "down" : "up"}
          bgColor="bg-rose-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardTable
          title="Recent Sales"
          badge={dashboardData.recentSales.length}
          columns={[
            { key: "product", label: "PRODUCT" },
            {
              key: "quantity",
              label: "QTY",
              render: (row) => <CountBadge>{row.quantity}</CountBadge>,
            },
            {
              key: "total",
              label: "TOTAL",
              render: (row) => (
                <span className="font-mono font-semibold text-slate-900">
                  {money(row.total)}
                </span>
              ),
            },
            { key: "date", label: "DATE", render: (row) => formatDate(row.date) },
            {
              key: "status",
              label: "STATUS",
              render: (row) => <SaleStatusBadge status={row.status} />,
            },
          ]}
          data={dashboardData.recentSales}
          emptyMessage="No recent sales found"
        />

        <DashboardTable
          title="Most Sold Items"
          badge={dashboardData.mostSoldItems.length}
          columns={[
            { key: "product", label: "PRODUCT" },
            { key: "sku", label: "SKU" },
            { key: "category", label: "CATEGORY" },
            {
              key: "stock",
              label: "STOCK",
              render: (row) => <CountBadge tone="slate">{row.stock}</CountBadge>,
            },
            {
              key: "status",
              label: "STATUS",
              render: (row) => <StockStatusBadge status={row.status} />,
            },
          ]}
          data={dashboardData.mostSoldItems}
          emptyMessage="No sold items found"
        />

        <DashboardTable
          title="Low Quantity Products"
          badge={summary.inventory.low_stock_products}
          columns={[
            { key: "product", label: "PRODUCT" },
            { key: "sku", label: "SKU" },
            {
              key: "quantity",
              label: "QTY",
              render: (row) => <CountBadge tone="red">{row.quantity}</CountBadge>,
            },
            {
              key: "price",
              label: "PRICE",
              render: (row) => (
                <span className="font-mono text-slate-900">{money(row.price)}</span>
              ),
            },
          ]}
          data={dashboardData.lowQuantityProducts}
          emptyMessage="No low quantity products found"
        />

        <DashboardTable
          title="Out Of Stock Products"
          badge={summary.inventory.out_of_stock_products}
          columns={[
            { key: "product", label: "PRODUCT" },
            { key: "sku", label: "SKU" },
            { key: "category", label: "CATEGORY" },
            {
              key: "price",
              label: "PRICE",
              render: (row) => (
                <span className="font-mono text-slate-900">{money(row.price)}</span>
              ),
            },
          ]}
          data={dashboardData.outOfStockProducts}
          emptyMessage="No out of stock products found"
        />
      </div>
    </MainLayout>
  );
}

export default Dashboard;
