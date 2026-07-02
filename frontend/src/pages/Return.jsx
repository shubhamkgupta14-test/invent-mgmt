import { useEffect, useState } from "react";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import DetailModal from "../components/common/DetailModal";
import ExportMenu from "../components/common/ExportMenu";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import SearchBar from "../components/common/SearchBar";
import SelectDropdown from "../components/common/SelectDropdown";
import SortableHeader from "../components/common/SortableHeader";
import TablePagination from "../components/common/TablePagination";
import Textarea from "../components/common/Textarea";
import TransactionItemRows from "../components/pages/transactions/TransactionItemRows";
import { getExchanges } from "../api/exchangeApi";
import { getProductOptions } from "../api/productApi";
import { createReturn, getReturns } from "../api/returnApi";
import { getSales } from "../api/salesApi";
import { getMyDetails } from "../api/userApi";
import { useToast } from "../context/useToast";
import MainLayout from "../layouts/MainLayout";
import { formatDateIST, formatMoney } from "../utils/formatters";
import { toggleSort } from "../utils/sortUtils";
import { defaultPagination, listParams, parseListResponse } from "../utils/tableQuery";

const defaultForm = {
  return_id: "",
  sale_id: "",
  invoice_id: "",
  items: [{}],
  refund_amount: 0,
  notes: "",
};

const itemLabel = (item = {}) =>
  item.sku ? `${item.sku} - ${item.name || "Product"}` : item.name || "-";

const returnItemSummary = (returnRecord) =>
  (returnRecord.items || [])
    .map((item) => `${item.sku || "-"} x ${item.quantity || 0} @ ${formatMoney(item.unit_price)} (${item.item_status || "RESELLABLE"})`)
    .join("; ");

const returnExportColumns = [
  { header: "Return ID", key: "return_id" },
  { header: "Date", value: (item) => formatDateIST(item.created_at) },
  { header: "Invoice", key: "invoice_id" },
  { header: "Sale ID", key: "sale_id" },
  { header: "Items", value: returnItemSummary },
  { header: "Total Quantity", key: "total_quantity" },
  { header: "Total Amount", key: "total_amount" },
  { header: "Refund Amount", key: "refund_amount" },
  { header: "Created By", key: "created_by" },
  { header: "Notes", key: "notes" },
];

function ReturnTable({ returns, onView, sortConfig, handleSort }) {
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
              <SortableHeader label="Date" field="created_at" sortConfig={sortConfig} onSort={handleSort} />
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Return ID</th>
              <SortableHeader label="Invoice" field="invoice_id" sortConfig={sortConfig} onSort={handleSort} />
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Product</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Items</th>
              <SortableHeader label="Quantity" field="total_quantity" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Refund" field="refund_amount" sortConfig={sortConfig} onSort={handleSort} />
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
                  <td className="px-5 py-4 font-medium text-slate-900">
                    <div className="max-w-[240px] truncate" title={productLabel}>
                      {productLabel}
                    </div>
                  </td>
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
  const [exchanges, setExchanges] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState(defaultPagination);
  const [sortConfig, setSortConfig] = useState({ field: "created_at", order: "desc" });
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const { addToast } = useToast();
  const { page, limit } = pagination;

  const canAdd = ["admin", "superadmin"].includes(currentUser?.role);

  const loadReturns = async () => {
    const response = await getReturns(listParams({ search, sortConfig, pagination: { page, limit } }));
    const parsed = parseListResponse(response);
    setReturns(parsed.items);
    setPagination(parsed.pagination);
  };

  const loadProducts = async () => {
    if (products.length) return;
    const response = await getProductOptions({ activeOnly: currentUser?.role !== "superadmin" });
    setProducts(response.data.data || []);
  };

  const loadSales = async () => {
    if (sales.length) return;
    const response = await getSales({ limit: 100 });
    setSales(response.data.data || []);
  };

  const loadExchanges = async () => {
    if (exchanges.length) return;
    const response = await getExchanges({ limit: 100 });
    setExchanges(response.data.data || []);
  };

  useEffect(() => {
    let isActive = true;

    Promise.all([getReturns(listParams({ search, sortConfig, pagination: { page, limit } })), getMyDetails()])
      .then(([returnsResponse, userResponse]) => {
        if (!isActive) return;
        const parsed = parseListResponse(returnsResponse);
        setReturns(parsed.items);
        setPagination(parsed.pagination);
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
  }, [addToast, limit, page, search, sortConfig]);

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

  const isSameTransaction = (record, sale) =>
    record?.sale_id === sale?.sale_id || record?.invoice_id === sale?.invoice_id;

  const addQuantity = (map, item, direction = 1) => {
    const sku = item?.sku;
    if (!sku) return;
    map.set(sku, (map.get(sku) || 0) + direction * Number(item.quantity || 0));
  };

  const buildReturnItemsFromSale = (sale) => {
    if (!sale) return [];

    const baseItems = [];
    const quantities = new Map();

    (sale.items || []).forEach((item) => {
      baseItems.push(item);
      addQuantity(quantities, item);
    });

    exchanges.filter((exchange) => isSameTransaction(exchange, sale)).forEach((exchange) => {
      (exchange.returned_items || []).forEach((item) => addQuantity(quantities, item, -1));
      (exchange.replacement_items || []).forEach((item) => {
        baseItems.push(item);
        addQuantity(quantities, item);
      });
    });

    returns.filter((returnRecord) => isSameTransaction(returnRecord, sale)).forEach((returnRecord) => {
      (returnRecord.items || []).forEach((item) => addQuantity(quantities, item, -1));
    });

    const seenSkus = new Set();

    return baseItems
      .filter((item) => {
        if (!item.sku || seenSkus.has(item.sku)) return false;
        seenSkus.add(item.sku);
        return true;
      })
      .map((item) => ({
      sku: item.sku || "",
      name: item.name || "",
      quantity: quantities.get(item.sku) || 0,
      unit_price: item.unit_price || "",
      item_status: "RESELLABLE",
      reason: "",
    }))
      .filter((item) => item.sku && item.quantity > 0);
  };

  const returnableSales = sales.filter((sale) =>
    ["SOLD", "EXCHANGE"].includes(String(sale.sale_status || "").toUpperCase()) &&
    buildReturnItemsFromSale(sale).length > 0
  );

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
      await Promise.all([loadProducts(), loadSales(), loadExchanges()]);
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
        <div className="flex flex-wrap items-center gap-3">
          <ExportMenu
            rows={returns}
            columns={returnExportColumns}
            filename="returns"
            title="Returns"
          />
          {canAdd && (
            <Button variant="primary" size="md" onClick={openAdd}>
              + Add Return
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="mb-5">
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder="Search return, invoice, or product"
          />
        </div>
        <ReturnTable
          returns={returns}
          onView={setSelectedReturn}
          sortConfig={sortConfig}
          handleSort={handleSort}
        />
        <TablePagination
          pagination={pagination}
          label="returns"
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          disabled={loading}
        />
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
            <Input
              label="Return ID"
              value={form.return_id}
              onChange={(value) => updateForm("return_id", value)}
              required
            />
            <SelectDropdown
              label="Original Sale Invoice"
              value={form.invoice_id}
              onChange={handleSaleInvoiceSelect}
              placeholder="Select sale invoice"
              options={returnableSales.map((sale) => ({
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
