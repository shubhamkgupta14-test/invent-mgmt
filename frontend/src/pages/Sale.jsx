import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import SearchBar from "../components/common/SearchBar";
import SaleTable from "../components/pages/sale/SaleTable";
import SaleForm from "../components/pages/sale/SaleForm";
import Loader from "../components/common/Loader";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Modal from "../components/common/Modal";
import DetailModal from "../components/common/DetailModal";
import StatusBadge from "../components/common/StatusBadge";
import { createSale, getSales } from "../api/salesApi";
import { getMyDetails } from "../api/userApi";
import { getProductOptions } from "../api/productApi";
import { getStocks } from "../api/stockApi";
import { useToast } from "../context/useToast";
import { formatDateIST, formatMoney } from "../utils/formatters";

const getSalePaidAmount = (sale) =>
  sale?.total_paid ??
  sale?.payment_details?.reduce(
    (sum, payment) => sum + Number(payment.amount_paid || 0),
    0,
  ) ??
  0;

function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [saleFormOpen, setSaleFormOpen] = useState(false);
  const { addToast } = useToast();

  const loadSales = async () => {
    const response = await getSales();
    setSales(response.data.data || []);
  };

  const loadProductOptions = async () => {
    if (products.length) return;
    const [productResponse, stockResponse] = await Promise.all([
      getProductOptions({ activeOnly: true }),
      getStocks(),
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
      }));

    setProducts(sellableProducts);
  };

  useEffect(() => {
    let isActive = true;

    Promise.all([getSales(), getMyDetails()])
      .then(([salesResponse, userResponse]) => {
        if (!isActive) return;
        setSales(salesResponse.data.data);
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

  const filteredSales = sales.filter(
    (sale) =>
      sale.supplier_id?.toLowerCase().includes(search.toLowerCase()) ||
      sale.invoice_id?.toLowerCase().includes(search.toLowerCase()) ||
      sale.final_total_amount?.toString().includes(search),
  );

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
        <div className="flex gap-3">
          {currentUser?.role !== "user" && (
            <Button
              variant="primary"
              size="md"
              onClick={handleAddSale}
            >
              + Add Sale
            </Button>
          )}
          <Button variant="secondary" size="md">
            Export Report
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-5">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search invoice, supplier, or amount"
          />
        </div>

        {loading ? (
          <Loader fullScreen={false} message="Loading sales…" />
        ) : (
          <SaleTable sales={filteredSales} onView={setSelectedSale} />
        )}

        <div className="mt-6 rounded-2xl border border-border bg-slate-50 p-4 text-sm text-slate-700">
          Showing <span className="font-semibold">{filteredSales.length}</span>{" "}
          sales records.
        </div>
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
    </MainLayout>
  );
}

export default Sales;
