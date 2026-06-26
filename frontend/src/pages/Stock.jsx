import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import SearchBar from "../components/common/SearchBar";
import StockTable from "../components/pages/stock/StockTable";
import Loader from "../components/common/Loader";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import DetailModal from "../components/common/DetailModal";
import StockStatusBadge from "../components/common/StockStatusBadge";
import { getStocks } from "../api/stockApi";
import { formatDateIST } from "../utils/formatters";

function Stocks() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStock, setSelectedStock] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    field: "sku",
    order: "asc",
  });

  useEffect(() => {
    let isActive = true;

    getStocks()
      .then((stocksResponse) => {
        if (isActive) setStocks(stocksResponse.data.data);
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const searchText = search.toLowerCase().replace(/[_\s]/g, "");

  const filteredStocks = stocks.filter((stock) => {
    const normalizedStatus = stock.stock_status
      ?.toLowerCase()
      .replace(/[_\s]/g, "");

    return (
      stock.sku?.toLowerCase().includes(search.toLowerCase()) ||
      stock.name?.toLowerCase().includes(search.toLowerCase()) ||
      normalizedStatus?.includes(searchText)
    );
  });

  const handleSort = (field) => {
    setSortConfig((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  const sortedStocks = [...filteredStocks].sort((a, b) => {
    const { field, order } = sortConfig;
    let comparison = 0;

    if (field === "sku") {
      comparison = a.sku.localeCompare(b.sku);
    } else if (field === "inventory_value") {
      comparison = a.inventory_value - b.inventory_value;
    }

    return order === "desc" ? comparison : -comparison;
  });

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading stock data..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stock Overview</h1>
          <p className="text-slate-600 mt-1">
            Monitor stock quantities and alerts in real time.
          </p>
        </div>
        <Button variant="secondary" size="md">
          Export Stock
        </Button>
      </div>

      <Card>
        <div className="mb-5">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search SKU, product name, or status"
          />
        </div>

        {loading ? (
          <Loader fullScreen={false} message="Loading stock data..." />
        ) : (
          <StockTable
            stocks={sortedStocks}
            sortConfig={sortConfig}
            handleSort={handleSort}
            onView={setSelectedStock}
          />
        )}

        <div className="mt-6 rounded-2xl border border-border bg-slate-50 p-4 text-sm text-slate-700">
          Showing <span className="font-semibold">{sortedStocks.length}</span>{" "}
          stock items.
        </div>
      </Card>
      <DetailModal
        isOpen={Boolean(selectedStock)}
        onClose={() => setSelectedStock(null)}
        title={selectedStock?.name || "Stock Details"}
        sections={[
          {
            title: "Stock",
            fields: [
              { label: "SKU", value: selectedStock?.sku },
              { label: "Product", value: selectedStock?.name },
              { label: "Quantity", value: selectedStock?.quantity },
              { label: "Avg Purchase Price", value: selectedStock?.avg_price, money: true },
              { label: "Inventory Value", value: selectedStock?.inventory_value, money: true },
              {
                label: "Status",
                value: selectedStock?.stock_status,
                render: (value) => <StockStatusBadge status={value} />,
              },
              { label: "Created", value: formatDateIST(selectedStock?.created_at) },
              { label: "Updated", value: formatDateIST(selectedStock?.updated_at) },
            ],
          },
        ]}
      />
    </MainLayout>
  );
}

export default Stocks;
