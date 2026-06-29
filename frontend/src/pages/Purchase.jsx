import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import SearchBar from "../components/common/SearchBar";
import PurchaseTable from "../components/pages/purchase/PurchaseTable";
import PurchaseForm from "../components/pages/purchase/PurchaseForm";
import Loader from "../components/common/Loader";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Modal from "../components/common/Modal";
import DetailModal from "../components/common/DetailModal";
import StatusBadge from "../components/common/StatusBadge";
import { getProductOptions } from "../api/productApi";
import { createPurchase, getPurchases } from "../api/purchaseApi";
import { getMyDetails } from "../api/userApi";
import { useToast } from "../context/ToastContext";
import { formatDateIST, formatMoney } from "../utils/formatters";

function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false);
  const { addToast } = useToast();

  const loadPurchases = async () => {
    const response = await getPurchases();
    setPurchases(response.data.data || []);
  };

  const loadProductOptions = async () => {
    if (products.length) return;
    const response = await getProductOptions();
    setProducts(response.data.data || []);
  };

  useEffect(() => {
    let isActive = true;

    Promise.all([getPurchases(), getMyDetails()])
      .then(([purchasesResponse, userResponse]) => {
        if (!isActive) return;
        setPurchases(purchasesResponse.data.data);
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
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading purchases..." />
        </div>
      </MainLayout>
    );
  }

  const filteredPurchases = purchases.filter(
    (purchase) =>
      purchase.supplier_id?.toLowerCase().includes(search.toLowerCase()) ||
      purchase.invoice_id?.toLowerCase().includes(search.toLowerCase()) ||
      purchase.final_total_amount?.toString().includes(search),
  );

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
              {["Name", "Qty", "Price (Exc Tax)", "Disc", "Tax", "Total"].map((label) => (
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
        {currentUser?.role !== "user" && (
          <Button variant="primary" size="md" onClick={handleAddPurchase}>
            + Add Purchase
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-5">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search invoice, supplier, or total"
          />
        </div>

        <PurchaseTable
          purchases={filteredPurchases}
          onView={setSelectedPurchase}
        />

        <div className="mt-6 rounded-2xl border border-border bg-slate-50 p-4 text-sm text-slate-700">
          Showing{" "}
          <span className="font-semibold">{filteredPurchases.length}</span>{" "}
          purchases.
        </div>
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
    </MainLayout>
  );
}

export default Purchases;
