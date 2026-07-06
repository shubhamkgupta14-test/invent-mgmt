import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import SearchBar from "../components/common/SearchBar";
import StockTable from "../components/pages/stock/StockTable";
import Loader from "../components/common/Loader";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import DetailModal from "../components/common/DetailModal";
import ExportMenu from "../components/common/ExportMenu";
import Input from "../components/common/Input";
import TablePagination from "../components/common/TablePagination";
import StockStatusBadge from "../components/common/StockStatusBadge";
import { getStocks, updateStockActualPrice } from "../api/stockApi";
import { getMyDetails } from "../api/userApi";
import { useToast } from "../context/useToast";
import { formatDateIST, formatMoney } from "../utils/formatters";
import { toggleSort } from "../utils/sortUtils";
import { defaultPagination, listParams, parseListResponse } from "../utils/tableQuery";

const stockExportColumns = [
  { header: "SKU", key: "sku" },
  { header: "Product", key: "name" },
  { header: "Supplier", key: "supplier_id" },
  { header: "Quantity", key: "quantity" },
  { header: "Damaged", key: "damaged_quantity" },
  { header: "Lost", key: "lost_quantity" },
  { header: "Tax Rate", value: (item) => `${item.tax_rate ?? 0}%` },
  { header: "Avg Purchase Price", key: "avg_price" },
  { header: "Actual Price", key: "actual_price" },
  { header: "Inventory Value", key: "inventory_value" },
  { header: "Status", key: "stock_status" },
  { header: "Created", value: (item) => formatDateIST(item.created_at) },
];

function Stocks() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStock, setSelectedStock] = useState(null);
  const [actualPriceValue, setActualPriceValue] = useState("");
  const [savingActualPrice, setSavingActualPrice] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [pagination, setPagination] = useState(defaultPagination);
  const [sortConfig, setSortConfig] = useState({
    field: "created_at",
    order: "desc",
  });
  const { page, limit } = pagination;
  const { addToast } = useToast();
  const canEditActualPrice = ["admin", "superadmin"].includes(
    String(currentUser?.role || "").toLowerCase(),
  );

  useEffect(() => {
    let isActive = true;

    Promise.all([
      getStocks(listParams({ search, sortConfig, pagination: { page, limit } })),
      getMyDetails(),
    ])
      .then(([stocksResponse, userResponse]) => {
        if (!isActive) return;
        const parsed = parseListResponse(stocksResponse);
        setStocks(parsed.items);
        setPagination(parsed.pagination);
        setCurrentUser(userResponse.data.data);
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
  }, [limit, page, search, sortConfig]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPagination((current) => ({ ...current, page: 1 }));
  };
  const handleSort = (field) => {
    setSortConfig((current) => toggleSort(current, field));
    setPagination((current) => ({ ...current, page: 1 }));
  };
  const handlePageChange = (page) => setPagination((current) => ({ ...current, page }));
  const handleLimitChange = (limit) => setPagination((current) => ({ ...current, limit, page: 1 }));
  const handleViewStock = (stock) => {
    setSelectedStock(stock);
    setActualPriceValue(stock.actual_price || "");
  };
  const handleSaveActualPrice = async () => {
    if (!selectedStock?.sku) return;

    try {
      setSavingActualPrice(true);
      const response = await updateStockActualPrice(
        selectedStock.sku,
        actualPriceValue,
      );
      const updatedStock = response.data.data;
      setStocks((current) =>
        current.map((stock) =>
          stock.sku === updatedStock.sku ? updatedStock : stock,
        ),
      );
      setSelectedStock(updatedStock);
      setActualPriceValue(updatedStock.actual_price || "");
      addToast("Actual price updated successfully", "success");
    } catch (error) {
      addToast(
        error.response?.data?.message || "Failed to update actual price",
        "error",
      );
    } finally {
      setSavingActualPrice(false);
    }
  };

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
        <div className="flex justify-end">
          <ExportMenu
            rows={stocks}
            columns={stockExportColumns}
            filename="stocks"
            title="Stocks"
          />
        </div>
      </div>

      <Card>
        <div className="mb-5">
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder="Search stock items"
          />
        </div>

        {loading ? (
          <Loader fullScreen={false} message="Loading stock data..." />
        ) : (
          <StockTable
            stocks={stocks}
            sortConfig={sortConfig}
            handleSort={handleSort}
            onView={handleViewStock}
          />
        )}

        <TablePagination
          pagination={pagination}
          label="stock items"
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          disabled={loading}
        />
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
              { label: "Tax", value: `${selectedStock?.tax_rate ?? 0}%` },
              { label: "Avg Purchase Price", value: selectedStock?.avg_price, money: true },
              { label: "Actual Price", value: selectedStock?.actual_price, money: true },
              { label: "Min Selling Price", value: selectedStock?.min_selling_price, money: true },
              {
                label: "Visible Discount",
                value:
                  selectedStock?.actual_price && selectedStock?.min_selling_price
                    ? formatMoney(
                        Math.max(
                          Number(selectedStock.actual_price || 0) -
                            Number(selectedStock.min_selling_price || 0),
                          0,
                        ),
                      )
                    : "-",
              },
              { label: "Inventory Value", value: selectedStock?.inventory_value, money: true },
              {
                label: "Status",
                value: selectedStock?.stock_status,
                render: (value) => <StockStatusBadge status={value} />,
              },
              { label: "Created", value: formatDateIST(selectedStock?.created_at) },
            ],
          },
          {
            title: "Actual / MRP Price",
            render: () => (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Input
                  type="number"
                  label="Actual Price / MRP"
                  min="0"
                  value={actualPriceValue}
                  disabled={!canEditActualPrice}
                  onChange={setActualPriceValue}
                />
                <Button
                  type="button"
                  variant="primary"
                  disabled={!canEditActualPrice}
                  loading={savingActualPrice}
                  onClick={handleSaveActualPrice}
                  className="whitespace-nowrap sm:mb-0.5"
                >
                  Save Price
                </Button>
              </div>
            ),
          },
        ]}
      />
    </MainLayout>
  );
}

export default Stocks;
