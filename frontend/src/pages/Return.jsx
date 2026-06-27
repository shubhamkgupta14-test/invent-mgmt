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
import { getProductOptions } from "../api/productApi";
import { createReturn, getReturns } from "../api/returnApi";
import { getSales } from "../api/salesApi";
import { getMyDetails } from "../api/userApi";
import { useToast } from "../context/ToastContext";
import MainLayout from "../layouts/MainLayout";
import { formatDateIST, formatMoney } from "../utils/formatters";

const defaultForm = {
  sale_id: "",
  invoice_id: "",
  items: [{}],
  refund_amount: 0,
  notes: "",
};

const itemLabel = (item = {}) =>
  item.sku ? `${item.sku} - ${item.name || "Product"}` : item.name || "-";

function ReturnTable({ returns, onView }) {
  if (!returns.length) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5 text-center text-sm text-slate-500">
        No returns found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/70">
              {["Date", "Return ID", "Invoice", "Product", "Items", "Qty", "Refund"].map((label) => (
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
            {returns.map((item) => {
              const firstItem = item.items?.[0] || {};
              const productLabel = `${itemLabel(firstItem)}${
                item.items?.length > 1 ? ` +${item.items.length - 1}` : ""
              }`;

              return (
                <tr
                  key={item.return_id}
                  onClick={() => onView(item)}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-slate-50/70"
                >
                  <td className="px-5 py-4 text-slate-700">{formatDateIST(item.created_at)}</td>
                  <td className="px-5 py-4 text-slate-700">{item.return_id}</td>
                  <td className="px-5 py-4 text-slate-700">{item.invoice_id || "-"}</td>
                  <td className="px-5 py-4 font-medium text-slate-900">{productLabel}</td>
                  <td className="px-5 py-4 text-slate-700">{item.items?.length || 0}</td>
                  <td className="px-5 py-4 text-slate-700">{item.total_quantity}</td>
                  <td className="px-5 py-4 text-slate-700">{formatMoney(item.refund_amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReturnPage() {
  const [returns, setReturns] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const { addToast } = useToast();

  const canAdd = ["admin", "superadmin"].includes(currentUser?.role);

  const loadReturns = async () => {
    const response = await getReturns();
    setReturns(response.data.data || []);
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

    Promise.all([getReturns(), getMyDetails()])
      .then(([returnsResponse, userResponse]) => {
        if (!isActive) return;
        setReturns(returnsResponse.data.data || []);
        setCurrentUser(userResponse.data.data);
      })
      .catch((error) => {
        addToast(error.response?.data?.message || "Failed to load returns", "error");
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [addToast]);

  const filteredReturns = returns.filter((item) => {
    const value = search.toLowerCase();
    return (
      item.return_id?.toLowerCase().includes(value) ||
      item.invoice_id?.toLowerCase().includes(value) ||
      item.items?.some((product) => product.name?.toLowerCase().includes(value))
    );
  });

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateItem = (index, key, value) => {
    setForm((current) => {
      const items = [...current.items];
      items[index] = { ...items[index], [key]: value };
      return { ...current, items };
    });
  };

  const buildReturnItemsFromSale = (sale) =>
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
      items: sale ? buildReturnItemsFromSale(sale) : current.items,
      refund_amount: sale?.final_total_amount || current.refund_amount,
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
      await createReturn({
        ...form,
        sale_id: form.sale_id || null,
        invoice_id: form.invoice_id || null,
      });
      addToast("Return created successfully", "success");
      setFormOpen(false);
      await loadReturns();
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to create return", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading returns..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Returns</h1>
          <p className="mt-1 text-slate-600">Track returned products and stock reversals.</p>
        </div>
        {canAdd && (
          <Button variant="primary" size="md" onClick={openAdd}>
            + Add Return
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-5">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search return, invoice, or product"
          />
        </div>
        <ReturnTable returns={filteredReturns} onView={setSelectedReturn} />
        <div className="mt-6 rounded-2xl border border-border bg-slate-50 p-4 text-sm text-slate-700">
          Showing <span className="font-semibold">{filteredReturns.length}</span> returns.
        </div>
      </Card>

      <DetailModal
        isOpen={Boolean(selectedReturn)}
        onClose={() => setSelectedReturn(null)}
        title={selectedReturn?.return_id || "Return Details"}
        sections={[
          {
            title: "Return",
            fields: [
              { label: "Return ID", value: selectedReturn?.return_id },
              { label: "Invoice", value: selectedReturn?.invoice_id },
              { label: "Sale ID", value: selectedReturn?.sale_id },
              { label: "Quantity", value: selectedReturn?.total_quantity },
              { label: "Refund", value: selectedReturn?.refund_amount, money: true },
              { label: "Created", value: formatDateIST(selectedReturn?.created_at) },
            ],
          },
          {
            title: "Items",
            fields: selectedReturn?.items?.map((item) => ({
              label: itemLabel(item),
              value: `${item.quantity} @ ${formatMoney(item.unit_price)} - ${item.item_status || "RESELLABLE"}`,
            })) || [],
          },
          {
            title: "Notes",
            fields: [{ label: "Notes", value: selectedReturn?.notes }],
          },
        ]}
      />

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Add Return" size="6xl">
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
              label="Refund Amount"
              type="number"
              value={form.refund_amount || ""}
              onChange={(value) => updateForm("refund_amount", Number(value))}
            />
          </div>
          <TransactionItemRows
            title="Returned Items"
            items={form.items}
            products={products}
            onAdd={() => updateForm("items", [...form.items, {}])}
            onChange={updateItem}
          />
          <Textarea label="Notes" value={form.notes} onChange={(value) => updateForm("notes", value)} rows={3} />
          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Save Return
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}

export default ReturnPage;
