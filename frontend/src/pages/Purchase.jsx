import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import BulkUpdateMenu from "../components/common/BulkUpdateMenu";
import BulkUploadResultModal from "../components/common/BulkUploadResultModal";
import SearchBar from "../components/common/SearchBar";
import PurchaseTable from "../components/pages/purchase/PurchaseTable";
import PurchaseForm from "../components/pages/purchase/PurchaseForm";
import Loader from "../components/common/Loader";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import ExportMenu from "../components/common/ExportMenu";
import Modal from "../components/common/Modal";
import DetailModal from "../components/common/DetailModal";
import TablePagination from "../components/common/TablePagination";
import StatusBadge from "../components/common/StatusBadge";
import { getProductOptions } from "../api/productApi";
import { bulkUploadPurchases, createPurchase, getPurchases } from "../api/purchaseApi";
import { getMyDetails } from "../api/userApi";
import { useToast } from "../context/useToast";
import { formatDateIST, formatMoney } from "../utils/formatters";
import { toggleSort } from "../utils/sortUtils";
import { defaultPagination, listParams, parseListResponse } from "../utils/tableQuery";

const PURCHASE_BULK_HEADERS = [
  "Invoice ID",
  "SKU",
  "Quantity",
  "Unit Price",
  "Discount %",
  "Additional Discount",
  "Shipping Charges",
  "Other Charges",
  "Payment Method",
  "Amount Paid",
  "Notes",
];
const PURCHASE_BULK_SAMPLE_ROWS = [{
  "Invoice ID": "PUR-001",
  SKU: "SKU-001",
  Quantity: 10,
  "Unit Price": 100,
  "Discount %": 0,
  "Additional Discount": 0,
  "Shipping Charges": 0,
  "Other Charges": 0,
  "Payment Method": "CASH",
  "Amount Paid": 1000,
  Notes: "Sample purchase",
}];

const purchaseItemSummary = (purchase) =>
  (purchase.items || [])
    .map((item) => `${item.sku || "-"} x ${item.quantity || 0} @ ${formatMoney(item.unit_price)}`)
    .join("; ");

const purchaseExportColumns = [
  { header: "Invoice", key: "invoice_id" },
  { header: "Date", value: (item) => formatDateIST(item.created_at) },
  { header: "Supplier", key: "supplier_id" },
  { header: "Items", value: purchaseItemSummary },
  { header: "Total Quantity", key: "total_quantity" },
  { header: "Subtotal", key: "subtotal" },
  { header: "Discount", key: "total_discount" },
  { header: "Tax", key: "total_tax" },
  { header: "Shipping", key: "shipping_charges" },
  { header: "Other Charges", key: "other_charges" },
  { header: "Final Total", key: "final_total_amount" },
  { header: "Paid", key: "total_paid" },
  { header: "Remaining", key: "remaining_amount" },
  { header: "Payment Status", key: "payment_status" },
  { header: "Status", key: "purchase_status" },
  { header: "Notes", key: "notes" },
];

function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState(defaultPagination);
  const [sortConfig, setSortConfig] = useState({ field: "created_at", order: "desc" });
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkResultOpen, setBulkResultOpen] = useState(false);
  const { addToast } = useToast();
  const { page, limit } = pagination;

  const loadPurchases = async () => {
    const response = await getPurchases(listParams({ search, sortConfig, pagination: { page, limit } }));
    const parsed = parseListResponse(response);
    setPurchases(parsed.items);
    setPagination(parsed.pagination);
  };

  const loadProductOptions = async () => {
    if (products.length) return;
    const response = await getProductOptions();
    setProducts(response.data.data || []);
  };

  useEffect(() => {
    let isActive = true;

    Promise.all([getPurchases(listParams({ search, sortConfig, pagination: { page, limit } })), getMyDetails()])
      .then(([purchasesResponse, userResponse]) => {
        if (!isActive) return;
        const parsed = parseListResponse(purchasesResponse);
        setPurchases(parsed.items);
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

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading purchases..." />
        </div>
      </MainLayout>
    );
  }

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

  const handleAddPurchase = async () => {
    try {
      setPurchaseFormOpen(true);
      await loadProductOptions();
    } catch (error) {
      addToast(
        error.response?.data?.message || "Failed to load product options",
        "error",
      );
    }
  };

  const handleSubmitPurchase = async (payload) => {
    try {
      await createPurchase(payload);
      addToast("Purchase created successfully", "success");
      setPurchaseFormOpen(false);
      await loadPurchases();
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to create purchase", "error");
    }
  };

  const renderPurchaseItems = () => (
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
            {selectedPurchase?.items?.map((item) => (
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
          <h1 className="text-3xl font-bold text-slate-900">Purchases</h1>
          <p className="text-slate-600 mt-1">
            Track and manage your purchase orders.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <ExportMenu
            rows={purchases}
            columns={purchaseExportColumns}
            filename="purchases"
            title="Purchases"
          />
          {currentUser?.role !== "user" && (
            <>
            <BulkUpdateMenu
              headers={PURCHASE_BULK_HEADERS}
              sampleRows={PURCHASE_BULK_SAMPLE_ROWS}
              sampleFileName="purchase-bulk-upload-sample.xlsx"
              uploadFile={bulkUploadPurchases}
              onResult={(result) => {
                setBulkResult(result);
                setBulkResultOpen(true);
              }}
              onUploaded={loadPurchases}
              addToast={addToast}
            />
            <Button variant="primary" size="md" onClick={handleAddPurchase}>
              + Add Purchase
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
            placeholder="Search invoice, supplier, product, payment, or total"
          />
        </div>

        <PurchaseTable
          purchases={purchases}
          onView={setSelectedPurchase}
          sortConfig={sortConfig}
          handleSort={handleSort}
        />

        <TablePagination
          pagination={pagination}
          label="purchases"
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          disabled={loading}
        />
      </Card>
      <DetailModal
        isOpen={Boolean(selectedPurchase)}
        onClose={() => setSelectedPurchase(null)}
        title={selectedPurchase?.invoice_id || "Purchase Details"}
        size="4xl"
        sections={[
          {
            title: "Purchase",
            fields: [
              { label: "Invoice", value: selectedPurchase?.invoice_id },
              { label: "Supplier", value: selectedPurchase?.supplier_id },
              { label: "Date", value: formatDateIST(selectedPurchase?.created_at) },
              {
                label: "Status",
                value: selectedPurchase?.purchase_status,
                render: (value) => <StatusBadge status={value} type="purchase" />,
              },
              {
                label: "Payment",
                value: selectedPurchase?.payment_status,
                render: (value) => <StatusBadge status={value} type="payment" />,
              },
              { label: "Items", value: selectedPurchase?.items?.length || 0 },
            ],
          },
          {
            title: "Items",
            render: renderPurchaseItems,
          },
          {
            title: "Amounts",
            fields: [
              { label: "Subtotal", value: selectedPurchase?.subtotal, money: true },
              { label: "Discount", value: selectedPurchase?.total_discount, money: true },
              { label: "Tax", value: selectedPurchase?.total_tax, money: true },
              { label: "Shipping", value: selectedPurchase?.shipping_charges, money: true },
              { label: "Other Charges", value: selectedPurchase?.other_charges, money: true },
              { label: "Final Total", value: selectedPurchase?.final_total_amount, money: true },
              { label: "Paid", value: selectedPurchase?.total_paid, money: true },
              { label: "Remaining", value: selectedPurchase?.remaining_amount, money: true },
            ],
          },
        ]}
      />
      <Modal
        isOpen={purchaseFormOpen}
        onClose={() => setPurchaseFormOpen(false)}
        title="Add Purchase"
        size="4xl"
      >
        <PurchaseForm
          key={purchaseFormOpen ? "new-purchase" : "closed-purchase"}
          products={products}
          onSubmit={handleSubmitPurchase}
        />
      </Modal>
      <BulkUploadResultModal
        isOpen={bulkResultOpen}
        onClose={() => setBulkResultOpen(false)}
        title="Purchase Bulk Upload Result"
        result={bulkResult}
        fallbackHeaders={PURCHASE_BULK_HEADERS}
      />
    </MainLayout>
  );
}

export default Purchases;
