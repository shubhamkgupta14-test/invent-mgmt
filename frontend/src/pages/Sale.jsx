import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import BulkUpdateMenu from "../components/common/BulkUpdateMenu";
import BulkUploadResultModal from "../components/common/BulkUploadResultModal";
import SearchBar from "../components/common/SearchBar";
import SaleTable from "../components/pages/sale/SaleTable";
import SaleForm from "../components/pages/sale/SaleForm";
import Loader from "../components/common/Loader";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import ExportMenu from "../components/common/ExportMenu";
import Modal from "../components/common/Modal";
import DetailModal from "../components/common/DetailModal";
import TablePagination from "../components/common/TablePagination";
import StatusBadge from "../components/common/StatusBadge";
import PlatformBadge from "../components/common/PlatformBadge";
import { bulkUploadSales, createSale, getSales } from "../api/salesApi";
import { getMyDetails } from "../api/userApi";
import { getProductOptions } from "../api/productApi";
import { getStocks } from "../api/stockApi";
import { useToast } from "../context/useToast";
import { formatDateIST, formatMoney } from "../utils/formatters";
import { toggleSort } from "../utils/sortUtils";
import { defaultPagination, listParams, parseListResponse } from "../utils/tableQuery";

const SALE_BULK_HEADERS = [
  "Invoice ID",
  "Platform",
  "Customer Name",
  "Customer Phone",
  "Customer Email",
  "SKU",
  "Quantity",
  "Unit Price",
  "Discount %",
  "Payment Method",
  "Amount Paid",
  "Payment Status",
  "Notes",
];
const SALE_BULK_SAMPLE_ROWS = [{
  "Invoice ID": "SALE-001",
  Platform: "Self Store",
  "Customer Name": "Amit Customer",
  "Customer Phone": "9876543210",
  "Customer Email": "amit@example.com",
  SKU: "SKU-001",
  Quantity: 1,
  "Unit Price": 250,
  "Discount %": 0,
  "Payment Method": "CASH",
  "Amount Paid": 250,
  "Payment Status": "PAID",
  Notes: "Sample sale",
}];

const getSalePaidAmount = (sale) =>
  sale?.total_paid ??
  sale?.payment_details?.reduce(
    (sum, payment) => sum + Number(payment.amount_paid || 0),
    0,
  ) ??
  0;

const saleItemSummary = (sale) =>
  (sale.items || [])
    .map((item) => `${item.sku || "-"} x ${item.quantity || 0} @ ${formatMoney(item.unit_price)}`)
    .join("; ");

const saleExportColumns = [
  { header: "Invoice", key: "invoice_id" },
  { header: "Date", value: (item) => formatDateIST(item.created_at) },
  { header: "Platform", value: (item) => item.platform || "Self Store" },
  { header: "Customer", value: (item) => item.user_info?.name || item.user_info?.phone || item.user_info?.email || "-" },
  { header: "Items", value: saleItemSummary },
  { header: "Subtotal", key: "subtotal" },
  { header: "Discount", key: "total_discount" },
  { header: "Tax", key: "total_tax" },
  { header: "Final Total", key: "final_total_amount" },
  { header: "Paid", value: getSalePaidAmount },
  { header: "Status", key: "sale_status" },
  { header: "Notes", key: "notes" },
];

function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState(defaultPagination);
  const [sortConfig, setSortConfig] = useState({ field: "created_at", order: "desc" });
  const [selectedSale, setSelectedSale] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [saleFormOpen, setSaleFormOpen] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkResultOpen, setBulkResultOpen] = useState(false);
  const { addToast } = useToast();
  const { page, limit } = pagination;

  const loadSales = async () => {
    const response = await getSales(listParams({ search, sortConfig, pagination: { page, limit } }));
    const parsed = parseListResponse(response);
    setSales(parsed.items);
    setPagination(parsed.pagination);
  };

  const loadProductOptions = async () => {
    if (products.length) return;
    const [productResponse, stockResponse] = await Promise.all([
      getProductOptions({ activeOnly: true }),
      getStocks({ limit: 100, sort_by: "sku", sort_order: "asc" }),
    ]);

    const stockBySku = new Map(
      (stockResponse.data.data || [])
        .filter((stock) => Number(stock.quantity || 0) > 0)
        .map((stock) => [stock.sku, stock]),
    );

    const sellableProducts = (productResponse.data.data || [])
      .filter((product) => stockBySku.has(product.sku))
      .map((product) => ({
        ...product,
        quantity: stockBySku.get(product.sku)?.quantity || 0,
        stock_status: stockBySku.get(product.sku)?.stock_status,
        min_selling_price: stockBySku.get(product.sku)?.min_selling_price,
        barcode: stockBySku.get(product.sku)?.barcode || "",
      }));

    setProducts(sellableProducts);
  };

  useEffect(() => {
    let isActive = true;

    Promise.all([getSales(listParams({ search, sortConfig, pagination: { page, limit } })), getMyDetails()])
      .then(([salesResponse, userResponse]) => {
        if (!isActive) return;
        const parsed = parseListResponse(salesResponse);
        setSales(parsed.items);
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

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading sales..." />
        </div>
      </MainLayout>
    );
  }

  const handleAddSale = async () => {
    try {
      setSaleFormOpen(true);
      await loadProductOptions();
    } catch (error) {
      addToast(
        error.response?.data?.message || "Failed to load sale form options",
        "error",
      );
    }
  };

  const handleSubmitSale = async (payload) => {
    try {
      await createSale(payload);
      addToast("Sale created successfully", "success");
      setSaleFormOpen(false);
      await loadSales();
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to create sale", "error");
    }
  };

  const renderSaleItems = () => (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50">
              {["Product", "Quantity", "Unit Price (Excl. Tax)", "Discount", "Tax", "Total"].map((label) => (
                <th
                  key={label}
                  className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selectedSale?.items?.map((item) => (
              <tr key={`${item.sku}-${item.name}`} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-slate-900">{item.name || "-"}</td>
                <td className="px-4 py-3 text-slate-700">{item.quantity || 0}</td>
                <td className="px-4 py-3 text-slate-700">{formatMoney(item.unit_price)}</td>
                <td className="px-4 py-3 text-slate-700">
                  {item.discount_percentage ?? 0}% / {formatMoney(item.discount_amount)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {item.tax_percentage ?? 0}% / {formatMoney(item.tax_amount)}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {formatMoney(item.total_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sales</h1>
          <p className="text-slate-600 mt-1">
            Review orders, revenue, and sales performance.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <ExportMenu
            rows={sales}
            columns={saleExportColumns}
            filename="sales"
            title="Sales"
          />
          {currentUser?.role !== "user" && (
            <>
              <BulkUpdateMenu
                headers={SALE_BULK_HEADERS}
                sampleRows={SALE_BULK_SAMPLE_ROWS}
                sampleFileName="sale-bulk-upload-sample.xlsx"
                uploadFile={bulkUploadSales}
                onResult={(result) => {
                  setBulkResult(result);
                  setBulkResultOpen(true);
                }}
                onUploaded={loadSales}
                addToast={addToast}
              />
              <Button
                variant="primary"
                size="md"
                onClick={handleAddSale}
              >
                + Add Sale
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <div className="mb-5">
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder="Search invoice, platform, product, status, or amount"
          />
        </div>

        {loading ? (
          <Loader fullScreen={false} message="Loading sales..." />
        ) : (
          <SaleTable
            sales={sales}
            onView={setSelectedSale}
            sortConfig={sortConfig}
            handleSort={handleSort}
          />
        )}

        <TablePagination
          pagination={pagination}
          label="sales records"
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          disabled={loading}
        />
      </Card>
      <DetailModal
        isOpen={Boolean(selectedSale)}
        onClose={() => setSelectedSale(null)}
        title={selectedSale?.invoice_id || "Sale Details"}
        size="4xl"
        sections={[
          {
            title: "Sale",
            fields: [
              { label: "Invoice", value: selectedSale?.invoice_id },
              {
                label: "Sales Channel",
                value: selectedSale?.platform || "Self Store",
                render: (value) => <PlatformBadge platform={value} />,
              },
              { label: "Date", value: formatDateIST(selectedSale?.created_at) },
              {
                label: "Status",
                value: selectedSale?.sale_status,
                render: (value) => <StatusBadge status={value} type="sale" />,
              },
              {
                label: "Customer",
                value:
                  selectedSale?.user_info?.name ||
                  selectedSale?.user_info?.phone ||
                  selectedSale?.user_info?.email,
              },
              { label: "Items", value: selectedSale?.items?.length || 0 },
              { label: "Final Total", value: selectedSale?.final_total_amount, money: true },
              { label: "Paid", value: getSalePaidAmount(selectedSale), money: true },
            ],
          },
          {
            title: "Items",
            render: renderSaleItems,
          },
          {
            title: "Amounts",
            fields: [
              { label: "Subtotal", value: selectedSale?.subtotal, money: true },
              { label: "Discount", value: selectedSale?.total_discount, money: true },
              { label: "Tax", value: selectedSale?.total_tax, money: true },
              { label: "Final Total", value: selectedSale?.final_total_amount, money: true },
              { label: "Paid", value: getSalePaidAmount(selectedSale), money: true },
              { label: "Notes", value: selectedSale?.notes },
            ],
          },
        ]}
      />
      <Modal
        isOpen={saleFormOpen}
        onClose={() => setSaleFormOpen(false)}
        title="Add Sale"
        size="4xl"
      >
        <SaleForm
          key={saleFormOpen ? "new-sale" : "closed-sale"}
          products={products}
          onSubmit={handleSubmitSale}
        />
      </Modal>
      <BulkUploadResultModal
        isOpen={bulkResultOpen}
        onClose={() => setBulkResultOpen(false)}
        title="Sale Bulk Upload Result"
        result={bulkResult}
        fallbackHeaders={SALE_BULK_HEADERS}
      />
    </MainLayout>
  );
}

export default Sales;
