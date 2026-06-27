import { useEffect, useState } from "react";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import DetailModal from "../components/common/DetailModal";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import SearchBar from "../components/common/SearchBar";
import SelectDropdown from "../components/common/SelectDropdown";
import Textarea from "../components/common/Textarea";
import TransactionItemRows from "../components/pages/transactions/TransactionItemRows";
import { createExchange, getExchanges } from "../api/exchangeApi";
import { getProductOptions } from "../api/productApi";
import { getSales } from "../api/salesApi";
import { getMyDetails } from "../api/userApi";
import { useToast } from "../context/ToastContext";
import MainLayout from "../layouts/MainLayout";
import { formatDateIST, formatMoney } from "../utils/formatters";

const defaultForm = {
  sale_id: "",
  invoice_id: "",
  returned_items: [{}],
  replacement_items: [{}],
  adjustment_amount: 0,
  notes: "",
};

const itemLabel = (item = {}) =>
  item.sku ? `${item.sku} - ${item.name || "Product"}` : item.name || "-";

function ExchangeTable({ exchanges, onView }) {
  if (!exchanges.length) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5 text-center text-sm text-slate-500">
        No exchanges found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/70">
              {["Date", "Exchange ID", "Invoice", "Returned", "Replacement", "Qty", "Adjustment"].map((label) => (
                <th
                  key={label}
                  className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exchanges.map((exchange) => {
              const returned = exchange.returned_items?.[0] || {};
              const replacement = exchange.replacement_items?.[0] || {};

              return (
                <tr
                  key={exchange.exchange_id}
                  onClick={() => onView(exchange)}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-slate-50/70"
                >
                  <td className="px-5 py-4 text-slate-700">{formatDateIST(exchange.created_at)}</td>
                  <td className="px-5 py-4 text-slate-700">{exchange.exchange_id}</td>
                  <td className="px-5 py-4 text-slate-700">{exchange.invoice_id || "-"}</td>
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {itemLabel(returned)}
                    {exchange.returned_items?.length > 1 ? ` +${exchange.returned_items.length - 1}` : ""}
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {itemLabel(replacement)}
                    {exchange.replacement_items?.length > 1 ? ` +${exchange.replacement_items.length - 1}` : ""}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {exchange.returned_quantity} / {exchange.replacement_quantity}
                  </td>
                  <td className="px-5 py-4 text-slate-700">{formatMoney(exchange.adjustment_amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExchangePage() {
  const [exchanges, setExchanges] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [selectedExchange, setSelectedExchange] = useState(null);
  const { addToast } = useToast();

  const canAdd = ["admin", "superadmin"].includes(currentUser?.role);

  const loadExchanges = async () => {
    const response = await getExchanges();
    setExchanges(response.data.data || []);
  };

  const loadProducts = async () => {
    if (products.length) return;
    const response = await getProductOptions({ activeOnly: currentUser?.role !== "superadmin" });
    setProducts(response.data.data || []);
  };

  const loadSales = async () => {
    if (sales.length) return;
    const response = await getSales();
    setSales(response.data.data || []);
  };

  useEffect(() => {
    let isActive = true;

    Promise.all([getExchanges(), getMyDetails()])
      .then(([exchangesResponse, userResponse]) => {
        if (!isActive) return;
        setExchanges(exchangesResponse.data.data || []);
        setCurrentUser(userResponse.data.data);
      })
      .catch((error) => {
        addToast(error.response?.data?.message || "Failed to load exchanges", "error");
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [addToast]);

  const filteredExchanges = exchanges.filter((exchange) => {
    const value = search.toLowerCase();
    return (
      exchange.exchange_id?.toLowerCase().includes(value) ||
      exchange.invoice_id?.toLowerCase().includes(value) ||
      exchange.returned_items?.some((item) => item.name?.toLowerCase().includes(value)) ||
      exchange.replacement_items?.some((item) => item.name?.toLowerCase().includes(value))
    );
  });

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateItem = (collection, index, key, value) => {
    setForm((current) => {
      const items = [...current[collection]];
      items[index] = { ...items[index], [key]: value };
      return { ...current, [collection]: items };
    });
  };

  const buildReturnedItemsFromSale = (sale) =>
    (sale?.items?.length ? sale.items : [{}]).map((item) => ({
      sku: item.sku || "",
      name: item.name || "",
      quantity: item.quantity || "",
      unit_price: item.unit_price || "",
      item_status: "RESELLABLE",
      reason: "",
    }));

  const handleSaleInvoiceSelect = (invoiceId) => {
    const sale = sales.find((item) => item.invoice_id === invoiceId);

    setForm((current) => ({
      ...current,
      sale_id: sale?.sale_id || "",
      invoice_id: invoiceId,
      returned_items: sale ? buildReturnedItemsFromSale(sale) : current.returned_items,
      adjustment_amount: 0,
    }));
  };

  const openAdd = async () => {
    try {
      setForm(defaultForm);
      setFormOpen(true);
      await Promise.all([loadProducts(), loadSales()]);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load product options", "error");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      await createExchange({
        ...form,
        sale_id: form.sale_id || null,
        invoice_id: form.invoice_id || null,
      });
      addToast("Exchange created successfully", "success");
      setFormOpen(false);
      await loadExchanges();
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to create exchange", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading exchanges..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Exchanges</h1>
          <p className="mt-1 text-slate-600">Record product swaps and replacement stock movement.</p>
        </div>
        {canAdd && (
          <Button variant="primary" size="md" onClick={openAdd}>
            + Add Exchange
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-5">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search exchange, invoice, or product"
          />
        </div>
        <ExchangeTable exchanges={filteredExchanges} onView={setSelectedExchange} />
        <div className="mt-6 rounded-2xl border border-border bg-slate-50 p-4 text-sm text-slate-700">
          Showing <span className="font-semibold">{filteredExchanges.length}</span> exchanges.
        </div>
      </Card>

      <DetailModal
        isOpen={Boolean(selectedExchange)}
        onClose={() => setSelectedExchange(null)}
        title={selectedExchange?.exchange_id || "Exchange Details"}
        sections={[
          {
            title: "Exchange",
            fields: [
              { label: "Exchange ID", value: selectedExchange?.exchange_id },
              { label: "Invoice", value: selectedExchange?.invoice_id },
              { label: "Sale ID", value: selectedExchange?.sale_id },
              { label: "Returned Qty", value: selectedExchange?.returned_quantity },
              { label: "Replacement Qty", value: selectedExchange?.replacement_quantity },
              { label: "Adjustment", value: selectedExchange?.adjustment_amount, money: true },
              { label: "Created", value: formatDateIST(selectedExchange?.created_at) },
            ],
          },
          {
            title: "Returned Items",
            fields: selectedExchange?.returned_items?.map((item) => ({
              label: itemLabel(item),
              value: `${item.quantity} @ ${formatMoney(item.unit_price)} - ${item.item_status || "RESELLABLE"}`,
            })) || [],
          },
          {
            title: "Replacement Items",
            fields: selectedExchange?.replacement_items?.map((item) => ({
              label: itemLabel(item),
              value: `${item.quantity} @ ${formatMoney(item.unit_price)}`,
            })) || [],
          },
          {
            title: "Notes",
            fields: [{ label: "Notes", value: selectedExchange?.notes }],
          },
        ]}
      />

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Add Exchange" size="6xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectDropdown
              label="Original Sale Invoice"
              value={form.invoice_id}
              onChange={handleSaleInvoiceSelect}
              placeholder="Select sale invoice"
              options={sales.map((sale) => ({
                value: sale.invoice_id,
                label: `${sale.invoice_id} - ${
                  sale.items?.[0]?.sku
                    ? `${sale.items[0].sku} - ${sale.items[0].name || "Product"}`
                    : sale.items?.[0]?.name || "Sale"
                }${
                  sale.items?.length > 1 ? ` +${sale.items.length - 1}` : ""
                }`,
              }))}
              required
            />
            <Input
              label="Adjustment Amount"
              type="number"
              value={form.adjustment_amount || ""}
              onChange={(value) => updateForm("adjustment_amount", Number(value))}
            />
          </div>
          <TransactionItemRows
            title="Returned Items"
            items={form.returned_items}
            products={products}
            onAdd={() => updateForm("returned_items", [...form.returned_items, {}])}
            onChange={(index, key, value) => updateItem("returned_items", index, key, value)}
          />
          <TransactionItemRows
            title="Replacement Items"
            items={form.replacement_items}
            products={products}
            onAdd={() => updateForm("replacement_items", [...form.replacement_items, {}])}
            onChange={(index, key, value) => updateItem("replacement_items", index, key, value)}
            showReason={false}
            showStatus={false}
          />
          <Textarea label="Notes" value={form.notes} onChange={(value) => updateForm("notes", value)} rows={3} />
          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Save Exchange
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}

export default ExchangePage;
