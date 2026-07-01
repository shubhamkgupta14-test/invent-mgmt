import { useEffect, useMemo, useState } from "react";
import {
  FaBan,
  FaBoxes,
  FaChartLine,
  FaExclamationCircle,
  FaMoneyBillWave,
  FaTruck,
} from "react-icons/fa";
import { getDashboardSummary } from "../api/dashboardApi";
import KPICard from "../components/common/KPICard";
import Loader from "../components/common/Loader";
import StatusBadge from "../components/common/StatusBadge";
import DashboardTable from "../components/pages/dashboard/DashboardTable";
import MainLayout from "../layouts/MainLayout";
import useCompanySettings from "../hooks/useCompanySettings";
import { formatCompactMoney, formatDateIST } from "../utils/formatters";

const formatPercentageDelta = (change) => {
  const percentage = Number(change?.percentage || 0);

  return {
    label: `${percentage.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}%`,
    type:
      change?.status === "DECREASED"
        ? "down"
        : change?.status === "NO_CHANGE"
          ? "neutral"
          : "up",
  };
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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

const SaleStatusBadge = ({ status = "SOLD" }) => {
  return <StatusBadge status={status} type="sale" />;
};

const PaymentStatusBadge = ({ status = "UNPAID" }) => {
  return <StatusBadge status={status} type="payment" />;
};

const InvoiceCell = ({ row }) => (
  <div className="w-[108px]">
    <p className="truncate font-semibold text-slate-900">
      {row.invoice_id || "-"}
    </p>
    <p className="truncate text-xs text-slate-500">
      {formatDateIST(row.created_at)}
    </p>
  </div>
);

const ProductCell = ({ row }) => (
  <div className="w-[150px]">
    <div className="flex items-center gap-2">
      <p className="truncate font-semibold text-slate-900">
        {row.product || row.name || "-"}
      </p>
      {Number(row.extra_count || 0) > 0 && (
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200">
          +{row.extra_count}
        </span>
      )}
    </div>
    <p className="truncate text-xs text-slate-500">{row.sku || "-"}</p>
  </div>
);

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const { brand } = useCompanySettings();

  useEffect(() => {
    let isActive = true;

    getDashboardSummary()
      .then((summaryRes) => {
        if (!isActive) return;

        setSummary(summaryRes.data.data);
      })
      .catch((error) => {
        console.error("Dashboard load error:", error);
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const dashboardData = useMemo(() => {
    return {
      recentSales: summary?.recent_sales || [],
      recentPurchases: summary?.recent_purchases || [],
      todaysSoldItems: summary?.todays_sold_items || [],
      mostSoldItems: summary?.most_sold_items || [],
      lowQuantityProducts: summary?.low_quantity_products || [],
      outOfStockProducts: summary?.out_of_stock_products || [],
    };
  }, [summary]);

  if (loading || !summary) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading dashboard..." />
        </div>
      </MainLayout>
    );
  }

  const salesDelta = formatPercentageDelta(summary.sales.sales_percentage);
  const purchasesDelta = formatPercentageDelta(
    summary.purchases.purchase_percentage,
  );

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-600">
          Welcome back. Here's your {brand.name} inventory overview.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KPICard
          icon={FaBoxes}
          title="Total Products"
          value={summary.inventory.total_products}
          subtitle="In catalog"
          footerText="Current inventory"
          bgColor="bg-indigo-100"
        />
        <KPICard
          icon={FaMoneyBillWave}
          title="Inventory Value"
          value={formatCompactMoney(summary.inventory.total_inventory_value)}
          subtitle="Total valuation"
          footerText="Current valuation"
          bgColor="bg-emerald-100"
        />
        <KPICard
          icon={FaChartLine}
          title="Total Sales"
          value={formatCompactMoney(summary.sales.total_sales_amount)}
          subtitle="All time"
          delta={salesDelta.label}
          deltaType={salesDelta.type}
          deltaLabel="vs last month"
          bgColor="bg-violet-100"
        />
        <KPICard
          icon={FaTruck}
          title="Total Purchases"
          value={formatCompactMoney(summary.purchases.total_purchase_amount)}
          subtitle="All time"
          delta={purchasesDelta.label}
          deltaType={purchasesDelta.type}
          deltaLabel="vs last month"
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
          delta={
            summary.inventory.out_of_stock_products ? "Needs review" : "Healthy"
          }
          deltaType={summary.inventory.out_of_stock_products ? "down" : "up"}
          deltaLabel="Stock status"
          bgColor="bg-rose-100"
        />
        <KPICard
          icon={FaBan}
          title="Damage / Lost"
          value={
            (summary.inventory.damaged_items || 0) +
            (summary.inventory.lost_items || 0)
          }
          subtitle={`${summary.inventory.damaged_items || 0} damaged + ${summary.inventory.lost_items || 0} lost`}
          footerText="Unsellable returns"
          bgColor="bg-slate-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardTable
          title="Recent Sales"
          badge={dashboardData.recentSales.length}
          columns={[
            {
              key: "invoice_id",
              label: "INVOICE",
              className: "w-[116px]",
              render: (row) => <InvoiceCell row={row} />,
            },
            {
              key: "product",
              label: "PRODUCT",
              className: "w-[166px]",
              render: (row) => <ProductCell row={row} />,
            },
            {
              key: "quantity",
              label: "QTY",
              render: (row) => <CountBadge>{row.quantity}</CountBadge>,
            },
            {
              key: "total",
              label: "TOTAL",
              className: "whitespace-nowrap",
              render: (row) => (
                <span className="font-mono text-slate-900">
                  {formatCompactMoney(row.total)}
                </span>
              ),
            },
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
          title="Recent Purchases"
          badge={dashboardData.recentPurchases.length}
          columns={[
            {
              key: "invoice_id",
              label: "INVOICE",
              className: "w-[116px]",
              render: (row) => <InvoiceCell row={row} />,
            },
            {
              key: "product",
              label: "PRODUCT",
              className: "w-[166px]",
              render: (row) => <ProductCell row={row} />,
            },
            {
              key: "quantity",
              label: "QTY",
              render: (row) => <CountBadge>{row.quantity}</CountBadge>,
            },
            {
              key: "total",
              label: "TOTAL",
              className: "whitespace-nowrap",
              render: (row) => (
                <span className="font-mono text-slate-900">
                  {formatCompactMoney(row.total)}
                </span>
              ),
            },
            {
              key: "payment_status",
              label: "PAYMENT",
              render: (row) => (
                <PaymentStatusBadge status={row.payment_status} />
              ),
            },
          ]}
          data={dashboardData.recentPurchases}
          emptyMessage="No recent purchases found"
        />

        <DashboardTable
          title="Today's Sold Items"
          badge={dashboardData.todaysSoldItems.length}
          columns={[
            { key: "invoice_id", label: "INVOICE" },
            {
              key: "product",
              label: "PRODUCT",
              render: (row) => <ProductCell row={row} />,
            },
            {
              key: "quantity",
              label: "QTY",
              render: (row) => (
                <CountBadge tone="green">{row.quantity}</CountBadge>
              ),
            },
            {
              key: "sold_count",
              label: "SOLD COUNT",
              render: (row) => <CountBadge>{row.sold_count}</CountBadge>,
            },
          ]}
          data={dashboardData.todaysSoldItems}
          emptyMessage="No items sold today"
        />

        <DashboardTable
          title="Most Sold Items"
          badge={dashboardData.mostSoldItems.length}
          columns={[
            {
              key: "product",
              label: "PRODUCT",
              render: (row) => <ProductCell row={row} />,
            },
            {
              key: "quantity",
              label: "QTY SOLD",
              render: (row) => (
                <CountBadge tone="green">{row.quantity}</CountBadge>
              ),
            },
            {
              key: "sold_count",
              label: "SOLD COUNT",
              render: (row) => <CountBadge>{row.sold_count}</CountBadge>,
            },
            {
              key: "stock",
              label: "STOCK",
              render: (row) => (
                <CountBadge tone="slate">{row.stock}</CountBadge>
              ),
            },
          ]}
          data={dashboardData.mostSoldItems}
          emptyMessage="No sold items found"
        />

        <DashboardTable
          title="Low Quantity Products"
          badge={summary.inventory.low_stock_products}
          columns={[
            {
              key: "product",
              label: "PRODUCT",
              render: (row) => <ProductCell row={row} />,
            },
            { key: "supplier_id", label: "SUPPLIER" },
            {
              key: "quantity",
              label: "QTY",
              render: (row) => (
                <CountBadge tone="red">{row.quantity}</CountBadge>
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
            {
              key: "product",
              label: "PRODUCT",
              render: (row) => <ProductCell row={row} />,
            },
            { key: "supplier_id", label: "SUPPLIER" },
            { key: "category", label: "CATEGORY" },
          ]}
          data={dashboardData.outOfStockProducts}
          emptyMessage="No out of stock products found"
        />
      </div>
    </MainLayout>
  );
}

export default Dashboard;
