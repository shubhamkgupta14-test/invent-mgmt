import { useEffect, useMemo, useState } from "react";
import {
  FaFileInvoice,
  FaBarcode,
  FaBan,
  FaEnvelope,
  FaEye,
  FaPlus,
  FaPrint,
  FaTrash,
} from "react-icons/fa";
import MainLayout from "../layouts/MainLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import SearchBar from "../components/common/SearchBar";
import Select from "../components/common/Select";
import SelectDropdown from "../components/common/SelectDropdown";
import Modal from "../components/common/Modal";
import TablePagination from "../components/common/TablePagination";
import Textarea from "../components/common/Textarea";
import {
  cancelInvoice,
  createInvoice,
  getInvoices,
  sendBulkInvoiceEmails,
  sendInvoiceEmail,
} from "../api/invoiceApi";
import { getProductOptions } from "../api/productApi";
import { getStockByBarcode, getStocks } from "../api/stockApi";
import { getCompanySettings } from "../api/companyApi";
import { getMyDetails } from "../api/userApi";
import { useToast } from "../context/useToast";
import { formatDateIST, formatMoney } from "../utils/formatters";
import { defaultPagination, listParams, parseListResponse } from "../utils/tableQuery";

const emptyItem = () => ({
  sku: "",
  quantity: 1,
  unit_price: "",
});

const emptyBuyer = {
  name: "",
  phone: "",
  email: "",
  address: "",
  gst_number: "",
  place_of_supply: "",
};

const paymentMethodOptions = [
  { label: "Cash", value: "CASH" },
  { label: "UPI", value: "UPI" },
  { label: "Card", value: "CARD" },
  { label: "Bank Transfer", value: "BANK_TRANSFER" },
  { label: "Cheque", value: "CHEQUE" },
  { label: "Credit", value: "CREDIT" },
  { label: "Other", value: "OTHER" },
];

const todayInputValue = () => new Date().toISOString().slice(0, 10);

function numberValue(value) {
  return Number(value || 0);
}

function taxBreakup(items = []) {
  return items.reduce((rows, item) => {
    const taxRate = Number(item.tax_percentage || 0);
    const current = rows.get(taxRate) || { taxRate, taxable: 0, tax: 0 };
    current.taxable += Number(item.taxable_amount || 0);
    current.tax += Number(item.tax_amount || 0);
    rows.set(taxRate, current);
    return rows;
  }, new Map());
}

function InvoiceGenerator() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [companySettings, setCompanySettings] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("create");
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [viewInvoices, setViewInvoices] = useState([]);
  const [viewPagination, setViewPagination] = useState(defaultPagination);
  const [viewSearch, setViewSearch] = useState("");
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const [form, setForm] = useState({
    invoice_id: "",
    invoice_date: todayInputValue(),
    buyer: emptyBuyer,
    items: [emptyItem()],
    sold_offline: false,
    additional_discount: 0,
    payment_method: "CASH",
    payment_status: "PAID",
    notes: "",
  });
  const { addToast } = useToast();
  const canCreateInvoice = ["admin", "superadmin"].includes(
    String(currentUser?.role || "").toLowerCase(),
  );
  const canCancelInvoice = String(currentUser?.role || "").toLowerCase() === "superadmin";
  const visibleTab = canCreateInvoice ? activeTab : "view";

  const productBySku = useMemo(
    () => new Map(products.map((product) => [product.sku, product])),
    [products],
  );

  const printableInvoice = selectedInvoice || {
    ...form,
    invoice_date: form.invoice_date,
    company: companySettings,
    buyer: form.buyer,
    items: form.items.map((item) => {
      const product = productBySku.get(item.sku) || {};
      const quantity = numberValue(item.quantity);
      const unitPrice = numberValue(item.unit_price || product.min_selling_price);
      const actualPrice = numberValue(product.actual_price || Math.max(unitPrice, product.min_selling_price || 0));
      const subtotal = quantity * unitPrice;
      const actualSubtotal = quantity * actualPrice;
      const mrpDiscount = Math.max(actualPrice - unitPrice, 0) * quantity;
      const offlineDiscount = form.sold_offline ? subtotal * 0.2 : 0;
      const taxableBase = subtotal - offlineDiscount;
      return {
        sku: item.sku,
        name: product.name || item.sku || "-",
        unit_of_measure: product.unit_of_measure || "pcs",
        quantity,
        actual_price: actualPrice,
        actual_subtotal: actualSubtotal,
        min_selling_price: product.min_selling_price || 0,
        unit_price: unitPrice,
        subtotal,
        mrp_discount_amount: mrpDiscount,
        offline_discount_percentage: form.sold_offline ? 20 : 0,
        offline_discount_amount: offlineDiscount,
        additional_discount_amount: 0,
        taxable_amount: taxableBase,
        tax_percentage: product.tax_rate || 0,
        tax_amount: taxableBase * ((product.tax_rate || 0) / 100),
        total_price: taxableBase + taxableBase * ((product.tax_rate || 0) / 100),
      };
    }),
    offline_discount_percentage: form.sold_offline ? 20 : 0,
  };

  const previewTotals = useMemo(() => {
    const lineAmounts = printableInvoice.items || [];
    const subtotal = lineAmounts.reduce((sum, item) => sum + numberValue(item.subtotal), 0);
    const offlineDiscount = lineAmounts.reduce(
      (sum, item) => sum + numberValue(item.offline_discount_amount),
      0,
    );
    const taxableBeforeAdditional = subtotal - offlineDiscount;
    const additionalDiscount = Math.min(
      numberValue(form.additional_discount),
      taxableBeforeAdditional,
    );

    const taxableBases = lineAmounts.map(
      (item) => numberValue(item.subtotal) - numberValue(item.offline_discount_amount),
    );
    const preliminaryDiscounts = taxableBases.map((base, index) => (
      index === lineAmounts.length - 1 || taxableBeforeAdditional <= 0
        ? 0
        : additionalDiscount * (base / taxableBeforeAdditional)
    ));
    const allocatedBeforeLast = preliminaryDiscounts.reduce(
      (sum, amount) => sum + amount,
      0,
    );
    const itemDiscounts = preliminaryDiscounts.map((amount, index) => (
      index === lineAmounts.length - 1
        ? additionalDiscount - allocatedBeforeLast
        : amount
    ));

    const items = lineAmounts.map((item, index) => {
      const base = numberValue(item.subtotal) - numberValue(item.offline_discount_amount);
      const itemAdditionalDiscount = itemDiscounts[index] || 0;
      const taxableAmount = Math.max(base - itemAdditionalDiscount, 0);
      const taxAmount = taxableAmount * (numberValue(item.tax_percentage) / 100);
      const customerDiscountAmount =
        numberValue(item.mrp_discount_amount) +
        numberValue(item.offline_discount_amount) +
        itemAdditionalDiscount;
      return {
        ...item,
        additional_discount_amount: itemAdditionalDiscount,
        customer_discount_amount: customerDiscountAmount,
        taxable_amount: taxableAmount,
        tax_amount: taxAmount,
        total_price: taxableAmount + taxAmount,
      };
    });

    const totalTax = items.reduce((sum, item) => sum + numberValue(item.tax_amount), 0);
    const mrpDiscount = items.reduce(
      (sum, item) => sum + numberValue(item.mrp_discount_amount),
      0,
    );
    const actualSubtotal = items.reduce(
      (sum, item) => sum + numberValue(item.actual_subtotal),
      0,
    );
    const finalTotal = Math.ceil(subtotal - offlineDiscount - additionalDiscount + totalTax);
    return {
      items,
      actualSubtotal,
      subtotal,
      mrpDiscount,
      offlineDiscount,
      additionalDiscount,
      totalDiscount: offlineDiscount + additionalDiscount,
      totalTax,
      finalTotal,
    };
  }, [form.additional_discount, printableInvoice.items]);

  const invoiceForPrint = selectedInvoice || {
    ...printableInvoice,
    items: previewTotals.items,
    actual_subtotal: previewTotals.actualSubtotal,
    mrp_discount_amount: previewTotals.mrpDiscount,
    subtotal: previewTotals.subtotal,
    offline_discount_amount: previewTotals.offlineDiscount,
    additional_discount: previewTotals.additionalDiscount,
    total_discount: previewTotals.totalDiscount,
    total_tax: previewTotals.totalTax,
    final_total_amount: previewTotals.finalTotal,
  };

  const loadRecentInvoices = async ({
    query = "",
    page = 1,
    limit = 5,
  } = {}) => {
    const response = await getInvoices(
      listParams({
        search: query,
        sortConfig: { field: "created_at", order: "desc" },
        pagination: { page, limit },
      }),
    );
    const parsed = parseListResponse(response);
    setRecentInvoices(parsed.items);
  };

  const loadViewInvoices = async ({
    query = viewSearch,
    page = viewPagination.page,
    limit = viewPagination.limit,
  } = {}) => {
    const response = await getInvoices(
      listParams({
        search: query,
        sortConfig: { field: "created_at", order: "desc" },
        pagination: { page, limit },
      }),
    );
    const parsed = parseListResponse(response);
    setViewInvoices(parsed.items);
    setViewPagination(parsed.pagination);
    setSelectedInvoiceIds((current) =>
      current.filter((id) => parsed.items.some((invoice) => invoice.invoice_record_id === id)),
    );
  };

  useEffect(() => {
    let isActive = true;

    Promise.all([
      getProductOptions({ activeOnly: true }),
      getStocks({ limit: 500, sort_by: "sku", sort_order: "asc" }),
      getCompanySettings(),
      getInvoices({ page: 1, limit: 5, sort_by: "created_at", order: "desc" }),
      getInvoices({ page: 1, limit: 10, sort_by: "created_at", order: "desc" }),
      getMyDetails(),
    ])
      .then(([productResponse, stockResponse, companyResponse, invoiceResponse, viewInvoiceResponse, userResponse]) => {
        if (!isActive) return;

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
            barcode: stockBySku.get(product.sku)?.barcode || "",
            min_selling_price: stockBySku.get(product.sku)?.min_selling_price || 0,
            actual_price: stockBySku.get(product.sku)?.actual_price || 0,
          }));

        setProducts(sellableProducts);
        setCompanySettings(companyResponse.data.data || {});
        setCurrentUser(userResponse.data.data);
        const parsedInvoices = parseListResponse(invoiceResponse);
        setRecentInvoices(parsedInvoices.items);
        const parsedViewInvoices = parseListResponse(viewInvoiceResponse);
        setViewInvoices(parsedViewInvoices.items);
        setViewPagination(parsedViewInvoices.pagination);
      })
      .catch((error) => {
        addToast(
          error.response?.data?.message || "Failed to load invoice generator",
          "error",
        );
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [addToast]);

  const updateForm = (key, value) => {
    setSelectedInvoice(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateBuyer = (key, value) => {
    setSelectedInvoice(null);
    setForm((current) => ({
      ...current,
      buyer: { ...current.buyer, [key]: value },
    }));
  };

  const updateItem = (index, key, value) => {
    setSelectedInvoice(null);
    setForm((current) => {
      const items = [...current.items];
      const nextItem = { ...items[index], [key]: value };
      if (key === "sku") {
        nextItem.unit_price = productBySku.get(value)?.min_selling_price || "";
      }
      items[index] = nextItem;
      return { ...current, items };
    });
  };

  const addItem = () => updateForm("items", [...form.items, emptyItem()]);

  const addScannedStock = (stock) => {
    setSelectedInvoice(null);
    setProducts((current) => {
      if (current.some((product) => product.sku === stock.sku)) return current;
      return [
        ...current,
        {
          sku: stock.sku,
          name: stock.name,
          quantity: stock.quantity || 0,
          stock_status: stock.stock_status,
          barcode: stock.barcode || "",
          min_selling_price: stock.min_selling_price || 0,
          actual_price: stock.actual_price || 0,
          tax_rate: stock.tax_rate || 0,
        },
      ];
    });
    setForm((current) => {
      const items = [...current.items];
      const existingIndex = items.findIndex((item) => item.sku === stock.sku);
      const nextItem = {
        sku: stock.sku,
        quantity: 1,
        unit_price: stock.min_selling_price || "",
      };

      if (existingIndex >= 0) {
        items[existingIndex] = {
          ...items[existingIndex],
          quantity: Number(items[existingIndex].quantity || 0) + 1,
          unit_price: items[existingIndex].unit_price || nextItem.unit_price,
        };
      } else {
        const emptyIndex = items.findIndex((item) => !item.sku);
        if (emptyIndex >= 0) {
          items[emptyIndex] = nextItem;
        } else {
          items.push(nextItem);
        }
      }

      return { ...current, items };
    });
  };

  const handleBarcodeScan = async () => {
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    try {
      setScanningBarcode(true);
      const response = await getStockByBarcode(barcode);
      const stock = response.data.data;
      addScannedStock(stock);
      setBarcodeInput("");
      addToast(`${stock.sku} added from barcode`, "success");
    } catch (error) {
      addToast(
        error.response?.data?.message || "No stock found for this barcode",
        "error",
      );
    } finally {
      setScanningBarcode(false);
    }
  };

  const removeItem = (index) => {
    setSelectedInvoice(null);
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const resetForm = () => {
    setSelectedInvoice(null);
    setBarcodeInput("");
    setForm({
      invoice_id: "",
      invoice_date: todayInputValue(),
      buyer: emptyBuyer,
      items: [emptyItem()],
      sold_offline: false,
      additional_discount: 0,
      payment_method: "CASH",
      payment_status: "PAID",
      notes: "",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...form,
        invoice_date: form.invoice_date
          ? new Date(`${form.invoice_date}T00:00:00`).toISOString()
          : undefined,
        items: form.items
          .filter((item) => item.sku && Number(item.quantity || 0) > 0)
          .map((item) => ({
            sku: item.sku,
            quantity: Number(item.quantity || 0),
            unit_price: Number(item.unit_price || productBySku.get(item.sku)?.min_selling_price || 0),
          })),
        additional_discount: Number(form.additional_discount || 0),
      };

      const response = await createInvoice(payload);
      const createdInvoice = response.data.data;
      setSelectedInvoice(createdInvoice);
      setForm({
        invoice_id: "",
        invoice_date: todayInputValue(),
        buyer: emptyBuyer,
        items: [emptyItem()],
        sold_offline: false,
        additional_discount: 0,
        payment_method: "CASH",
        payment_status: "PAID",
        notes: "",
      });
      setBarcodeInput("");
      addToast("Invoice saved successfully", "success");
      await Promise.all([
        loadRecentInvoices({ query: "", page: 1, limit: 5 }),
        loadViewInvoices({ query: viewSearch, page: 1 }),
      ]);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to save invoice", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleViewSearchChange = async (value) => {
    setViewSearch(value);
    try {
      await loadViewInvoices({ query: value, page: 1 });
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to search invoices", "error");
    }
  };

  const handleViewPageChange = async (page) => {
    try {
      await loadViewInvoices({ page });
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load invoices", "error");
    }
  };

  const handleViewLimitChange = async (limit) => {
    try {
      await loadViewInvoices({ page: 1, limit });
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load invoices", "error");
    }
  };

  const openInvoicePreview = (invoice) => {
    setSelectedInvoice(invoice);
    setPreviewOpen(true);
  };

  const handleSendInvoice = async (invoice = selectedInvoice) => {
    if (!invoice?.invoice_record_id) return;
    try {
      setActionLoading(true);
      const response = await sendInvoiceEmail(invoice.invoice_record_id);
      const updatedInvoice = response.data.data;
      setSelectedInvoice(updatedInvoice);
      addToast("Invoice email sent successfully", "success");
      await Promise.all([
        loadRecentInvoices({ limit: 5 }),
        loadViewInvoices(),
      ]);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to send invoice email", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkSend = async () => {
    if (!selectedInvoiceIds.length) {
      addToast("Select at least one invoice", "warning");
      return;
    }
    try {
      setActionLoading(true);
      const response = await sendBulkInvoiceEmails(selectedInvoiceIds);
      const sentCount = (response.data.data || []).filter((item) => item.status === "sent").length;
      addToast(`${sentCount} invoice emails sent`, sentCount ? "success" : "warning");
      setSelectedInvoiceIds([]);
      await loadViewInvoices();
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to send selected invoices", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const openCancelInvoice = (invoice = selectedInvoice) => {
    if (!invoice?.invoice_record_id) return;
    setSelectedInvoice(invoice);
    setCancelReason("");
    setCancelOpen(true);
  };

  const handleCancelInvoice = async (event) => {
    event.preventDefault();
    if (!selectedInvoice?.invoice_record_id) return;
    try {
      setActionLoading(true);
      const response = await cancelInvoice(selectedInvoice.invoice_record_id, cancelReason);
      const updatedInvoice = response.data.data;
      setSelectedInvoice(updatedInvoice);
      setCancelOpen(false);
      setCancelReason("");
      addToast("Invoice cancelled successfully", "success");
      await Promise.all([
        loadRecentInvoices({ limit: 5 }),
        loadViewInvoices(),
      ]);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to cancel invoice", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleInvoiceSelection = (invoiceId, checked) => {
    setSelectedInvoiceIds((current) =>
      checked
        ? [...new Set([...current, invoiceId])]
        : current.filter((id) => id !== invoiceId),
    );
  };

  const toggleAllVisibleInvoices = (checked) => {
    setSelectedInvoiceIds(
      checked
        ? viewInvoices
            .filter((invoice) => invoice.invoice_status !== "CANCELLED")
            .map((invoice) => invoice.invoice_record_id)
        : [],
    );
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading invoice generator..." />
        </div>
      </MainLayout>
    );
  }

  const company = invoiceForPrint.company || {};
  const buyer = invoiceForPrint.buyer || {};
  const taxRows = Array.from(taxBreakup(invoiceForPrint.items || []).values());

  return (
    <MainLayout>
      <div className="invoice-screen space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Invoice Generator</h1>
            <p className="mt-1 text-slate-600">
              {canCreateInvoice
                ? "Create GST invoices from sold stock with discounts and printable totals."
                : "View saved GST invoices and print PDFs."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-end">
            {canCreateInvoice && visibleTab === "create" ? (
              <Button variant="secondary" icon={FaPlus} onClick={resetForm} className="w-full sm:w-auto">
                New Invoice
              </Button>
            ) : null}
            {visibleTab === "create" ? (
            <Button variant="primary" icon={FaPrint} onClick={handlePrint} className="w-full sm:w-auto">
              Print PDF
            </Button>
            ) : null}
          </div>
        </div>

        <div className="inline-flex w-full rounded-lg border border-[var(--border)] bg-white p-1 sm:w-auto">
          {canCreateInvoice ? (
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition sm:min-w-32 ${
                visibleTab === "create"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Create Invoice
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setActiveTab("view")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition sm:min-w-32 ${
              visibleTab === "view"
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            View Invoice
          </button>
        </div>

        {visibleTab === "create" ? (
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,430px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  label="Invoice Number"
                  value={form.invoice_id}
                  onChange={() => {}}
                  placeholder="Generated on save"
                  disabled
                />
                <Input
                  type="date"
                  label="Invoice Date"
                  value={form.invoice_date}
                  onChange={(value) => updateForm("invoice_date", value)}
                  required
                />
                <Select
                  label="Payment Method"
                  value={form.payment_method}
                  onChange={(value) => updateForm("payment_method", value)}
                  options={paymentMethodOptions}
                  placeholder="Select payment method"
                />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Input
                  label="Payment Status"
                  value={form.payment_status}
                  onChange={(value) => updateForm("payment_status", value)}
                />
                <label className="mt-7 flex h-11 items-center gap-3 px-1 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.sold_offline}
                    onChange={(event) => updateForm("sold_offline", event.target.checked)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  Sold Offline
                </label>
                <Input
                  type="number"
                  label="Additional Discount"
                  value={form.additional_discount}
                  min="0"
                  onChange={(value) => updateForm("additional_discount", Number(value))}
                />
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Buyer Details
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Customer Name"
                  value={form.buyer.name}
                  onChange={(value) => updateBuyer("name", value)}
                  required
                />
                <Input
                  label="Customer GSTIN"
                  value={form.buyer.gst_number}
                  onChange={(value) => updateBuyer("gst_number", value)}
                />
                <Input
                  label="Phone"
                  value={form.buyer.phone}
                  onChange={(value) => updateBuyer("phone", value)}
                />
                <Input
                  label="Email"
                  value={form.buyer.email}
                  onChange={(value) => updateBuyer("email", value)}
                />
                <Input
                  label="Place of Supply"
                  value={form.buyer.place_of_supply}
                  onChange={(value) => updateBuyer("place_of_supply", value)}
                />
                <Input
                  label="Billing Address"
                  value={form.buyer.address}
                  onChange={(value) => updateBuyer("address", value)}
                />
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Sold Items
                </h2>
                <Button type="button" variant="secondary" size="sm" icon={FaPlus} onClick={addItem} className="shrink-0">
                  Add Item
                </Button>
              </div>

              <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(180px,1fr)_auto] sm:items-end">
                <Input
                  label="Scan Barcode"
                  value={barcodeInput}
                  onChange={setBarcodeInput}
                  placeholder="Scan barcode"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleBarcodeScan();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  icon={FaBarcode}
                  loading={scanningBarcode}
                  onClick={handleBarcodeScan}
                  className="whitespace-nowrap"
                >
                  Add by Barcode
                </Button>
              </div>

              <div className="space-y-3">
                {form.items.map((item, index) => {
                  const selectedProduct = productBySku.get(item.sku);
                  return (
                    <div
                      key={index}
                      className="grid min-w-0 gap-3 rounded-xl border border-[var(--border)] bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(230px,1fr)_110px_150px_44px]"
                    >
                      <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                      <SelectDropdown
                        label={
                          <span className="flex flex-wrap items-center gap-2">
                            <span>Product</span>
                            {selectedProduct?.min_selling_price ? (
                              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                                Min {formatMoney(selectedProduct.min_selling_price)}
                              </span>
                            ) : null}
                            {selectedProduct?.actual_price ? (
                              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                                MRP {formatMoney(selectedProduct.actual_price)}
                              </span>
                            ) : null}
                            {selectedProduct?.quantity ? (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Qty {selectedProduct.quantity}
                              </span>
                            ) : null}
                          </span>
                        }
                        value={item.sku}
                        onChange={(value) => updateItem(index, "sku", value)}
                        placeholder="Select sold item"
                        options={products.map((product) => ({
                          value: product.sku,
                          label: `${product.sku} - ${product.name}`,
                        }))}
                      />
                      </div>
                      <Input
                        type="number"
                        label="Quantity"
                        value={item.quantity}
                        min="1"
                        onChange={(value) => updateItem(index, "quantity", Number(value))}
                        required
                      />
                      <Input
                        type="number"
                        label="Our Price"
                        value={item.unit_price}
                        min="0"
                        onChange={(value) => updateItem(index, "unit_price", Number(value))}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={form.items.length === 1}
                        className="flex h-11 w-full items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 sm:mt-7 sm:w-11"
                        aria-label="Remove item"
                        title="Remove item"
                      >
                        <FaTrash size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <Textarea
                label="Notes"
                value={form.notes}
                onChange={(value) => updateForm("notes", value)}
                rows={3}
              />
              <div className="mt-5 flex flex-col gap-4 border-t border-[var(--border)] pt-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-4">
                  <span>MRP Savings: <strong>{formatMoney(previewTotals.mrpDiscount)}</strong></span>
                  <span>Bill Discount: <strong>{formatMoney(previewTotals.totalDiscount)}</strong></span>
                  <span>GST: <strong>{formatMoney(previewTotals.totalTax)}</strong></span>
                  <span>Total: <strong>{formatMoney(previewTotals.finalTotal)}</strong></span>
                </div>
                <Button type="submit" variant="primary" icon={FaFileInvoice} loading={saving} className="w-full sm:w-auto">
                  Save Invoice
                </Button>
              </div>
            </Card>
          </form>

          <div className="min-w-0 space-y-6">
            <Card className="min-w-0">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Recent Invoices
                </h2>
                <span className="text-xs font-medium text-slate-500">Last 5</span>
              </div>
              <div className="space-y-2">
                {recentInvoices.length ? recentInvoices.map((invoice) => (
                  <button
                    key={invoice.invoice_record_id}
                    type="button"
                    onClick={() => setSelectedInvoice(invoice)}
                    className="w-full rounded-xl border border-[var(--border)] bg-white p-3 text-left transition hover:border-[var(--primary)] hover:bg-indigo-50"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <span className="break-all font-semibold text-slate-900">{invoice.invoice_id}</span>
                      <span className="font-mono text-sm font-semibold text-slate-900 sm:text-right">
                        {formatMoney(invoice.final_total_amount)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <span>{invoice.buyer?.name || "-"}</span>
                      <span>{formatDateIST(invoice.invoice_date || invoice.created_at)}</span>
                    </div>
                  </button>
                )) : (
                  <p className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-slate-500">
                    No invoices found.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
        ) : (
          <Card className="min-w-0">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="w-full lg:max-w-md">
                <SearchBar
                  value={viewSearch}
                  onChange={handleViewSearchChange}
                  placeholder="Search invoices"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                icon={FaEnvelope}
                onClick={handleBulkSend}
                loading={actionLoading}
                disabled={!selectedInvoiceIds.length}
                className="w-full lg:w-auto"
              >
                Send Selected
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={
                          viewInvoices.length > 0 &&
                          viewInvoices
                            .filter((invoice) => invoice.invoice_status !== "CANCELLED")
                            .every((invoice) => selectedInvoiceIds.includes(invoice.invoice_record_id))
                        }
                        onChange={(event) => toggleAllVisibleInvoices(event.target.checked)}
                        className="h-4 w-4 accent-[var(--primary)]"
                      />
                    </th>
                    {["Invoice", "Buyer", "Date", "Status", "Total", "Email", "Action"].map((label) => (
                      <th key={label} className="px-4 py-3 text-xs font-bold uppercase text-slate-500">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {viewInvoices.map((invoice) => {
                    const isCancelled = invoice.invoice_status === "CANCELLED";
                    return (
                      <tr key={invoice.invoice_record_id} className={isCancelled ? "bg-rose-50/40" : ""}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedInvoiceIds.includes(invoice.invoice_record_id)}
                            disabled={isCancelled}
                            onChange={(event) => toggleInvoiceSelection(invoice.invoice_record_id, event.target.checked)}
                            className="h-4 w-4 accent-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{invoice.invoice_id}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="font-medium">{invoice.buyer?.name || "-"}</div>
                          <div className="text-xs text-slate-500">{invoice.buyer?.email || "No email"}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatDateIST(invoice.invoice_date || invoice.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            isCancelled ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {invoiceStatusLabel(invoice.invoice_status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900">{formatMoney(invoice.final_total_amount)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {invoice.email_sent_count ? `Sent ${invoice.email_sent_count}` : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button type="button" title="View" onClick={() => openInvoicePreview(invoice)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
                              <FaEye size={15} />
                            </button>
                            <button type="button" title="Print" onClick={() => { setSelectedInvoice(invoice); setTimeout(handlePrint, 0); }} className="rounded-lg p-2 text-[var(--primary)] hover:bg-indigo-50">
                              <FaPrint size={15} />
                            </button>
                            <button type="button" title="Send email" disabled={isCancelled || !invoice.buyer?.email} onClick={() => handleSendInvoice(invoice)} className="rounded-lg p-2 text-sky-600 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40">
                              <FaEnvelope size={15} />
                            </button>
                            {canCancelInvoice ? (
                              <button type="button" title="Cancel invoice" disabled={isCancelled} onClick={() => openCancelInvoice(invoice)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40">
                                <FaBan size={15} />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!viewInvoices.length ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                        No invoices found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border pt-4">
              <TablePagination
                pagination={viewPagination}
                label="invoices"
                onPageChange={handleViewPageChange}
                onLimitChange={handleViewLimitChange}
                disabled={loading}
              />
            </div>
          </Card>
        )}
      </div>

      <section className={`invoice-print ${visibleTab === "create" ? "invoice-create-preview" : ""} relative mt-8 overflow-hidden bg-white p-4 text-slate-950 shadow-sm sm:p-6 lg:p-8`}>
        <CancelledWatermark show={invoiceForPrint.invoice_status === "CANCELLED"} />
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tax Invoice</p>
              <h2 className="mt-1 text-2xl font-bold">
                {company.company_name || company.brand_name || "Company Name"}
              </h2>
              <p className="mt-2 max-w-xl whitespace-pre-line text-sm text-slate-700">
                {company.address || "Company address"}
              </p>
              <div className="mt-2 grid gap-1 text-sm text-slate-700">
                <span>GSTIN: {company.gst_number || "-"}</span>
                <span>Phone: {company.phone || "-"} | Email: {company.email || "-"}</span>
                {company.website ? <span>Website: {company.website}</span> : null}
              </div>
            </div>
            <div className="w-full rounded-lg border border-slate-300 p-3 text-sm sm:min-w-52 sm:max-w-64">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Invoice No.</span>
                <strong>{invoiceForPrint.invoice_id || "-"}</strong>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="text-slate-500">Date</span>
                <strong>{formatDateIST(invoiceForPrint.invoice_date)}</strong>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="text-slate-500">Payment</span>
                <strong>{invoiceForPrint.payment_status || "PAID"}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="invoice-party-grid grid gap-4 border-b border-slate-300 py-4 md:grid-cols-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Bill To</h3>
            <p className="mt-2 font-semibold">{buyer.name || "-"}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{buyer.address || "-"}</p>
            {buyer.gst_number ? (
              <p className="mt-1 text-sm text-slate-700">GSTIN: {buyer.gst_number}</p>
            ) : null}
            {buyer.phone ? (
              <p className="text-sm text-slate-700">Phone: {buyer.phone}</p>
            ) : null}
            {buyer.email ? (
              <p className="text-sm text-slate-700">Email: {buyer.email}</p>
            ) : null}
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Supply Details</h3>
            <p className="mt-2 text-sm text-slate-700">Place of Supply: {buyer.place_of_supply || "-"}</p>
            <p className="mt-1 text-sm text-slate-700">Payment Method: {invoiceForPrint.payment_method || "-"}</p>
          </div>
        </div>

        <div className="invoice-items-wrap mt-4 overflow-x-auto">
          <table className="invoice-items-table w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                {["#", "Item", "HSN/SAC", "Qty", "MRP", "Our Price", "Discount", "Taxable", "GST", "Amount"].map((label) => (
                  <th key={label} className="border border-slate-300 px-2 py-2 text-left font-bold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(invoiceForPrint.items || []).map((item, index) => (
                <tr key={`${item.sku}-${index}`}>
                  <td className="border border-slate-300 px-2 py-2">{index + 1}</td>
                  <td className="border border-slate-300 px-2 py-2">
                    <div className="font-semibold">{item.name || "-"}</div>
                    <div className="text-xs text-slate-500">{item.sku}</div>
                  </td>
                  <td className="border border-slate-300 px-2 py-2">{item.hsn_sac || "-"}</td>
                  <td className="border border-slate-300 px-2 py-2">
                    {item.quantity} {item.unit_of_measure || "pcs"}
                  </td>
                  <td className="border border-slate-300 px-2 py-2">{formatMoney(item.actual_price || item.unit_price)}</td>
                  <td className="border border-slate-300 px-2 py-2">{formatMoney(item.unit_price)}</td>
                  <td className="border border-slate-300 px-2 py-2">
                    {formatMoney(
                      numberValue(item.customer_discount_amount) ||
                        numberValue(item.mrp_discount_amount) +
                          numberValue(item.offline_discount_amount) +
                          numberValue(item.additional_discount_amount),
                    )}
                  </td>
                  <td className="border border-slate-300 px-2 py-2">{formatMoney(item.taxable_amount)}</td>
                  <td className="border border-slate-300 px-2 py-2">
                    {item.tax_percentage || 0}% / {formatMoney(item.tax_amount)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 font-semibold">
                    {formatMoney(item.total_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="invoice-summary-grid mt-4 grid gap-4 md:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-slate-300 p-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">GST Summary</h3>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {taxRows.length ? taxRows.map((row) => (
                  <tr key={row.taxRate}>
                    <td className="py-1">GST {row.taxRate}%</td>
                    <td className="py-1 text-right">{formatMoney(row.taxable)}</td>
                    <td className="py-1 text-right">{formatMoney(row.tax)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td className="py-1 text-slate-500">No tax lines</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-slate-300 p-3 text-sm">
            <div className="flex justify-between gap-4 py-1">
              <span>MRP Total</span>
              <strong>{formatMoney(invoiceForPrint.actual_subtotal || invoiceForPrint.subtotal)}</strong>
            </div>
            <div className="flex justify-between gap-4 py-1">
              <span>MRP Savings</span>
              <strong>{formatMoney(invoiceForPrint.mrp_discount_amount)}</strong>
            </div>
            <div className="flex justify-between gap-4 py-1">
              <span>Our Price Subtotal</span>
              <strong>{formatMoney(invoiceForPrint.subtotal)}</strong>
            </div>
            <div className="flex justify-between gap-4 py-1">
              <span>Offline Discount</span>
              <strong>{formatMoney(invoiceForPrint.offline_discount_amount)}</strong>
            </div>
            <div className="flex justify-between gap-4 py-1">
              <span>Additional Discount</span>
              <strong>{formatMoney(invoiceForPrint.additional_discount)}</strong>
            </div>
            <div className="flex justify-between gap-4 py-1">
              <span>Total GST</span>
              <strong>{formatMoney(invoiceForPrint.total_tax)}</strong>
            </div>
            <div className="mt-2 flex justify-between gap-4 border-t border-slate-300 pt-3 text-base">
              <span className="font-bold">Total</span>
              <strong>{formatMoney(invoiceForPrint.final_total_amount)}</strong>
            </div>
          </div>
        </div>

        {invoiceForPrint.notes ? (
          <p className="mt-4 rounded-lg border border-slate-300 p-3 text-sm text-slate-700">
            Notes: {invoiceForPrint.notes}
          </p>
        ) : null}

        <div className="mt-16 flex items-end justify-between gap-6 pt-10 text-sm">
          <p className="text-slate-500">This is a computer generated invoice.</p>
          <div className="w-52 border-t border-slate-900 pt-2 text-center font-semibold">
            Authorised Signatory
          </div>
        </div>
      </section>

      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`Invoice ${selectedInvoice?.invoice_id || ""}`}
        size="6xl"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" icon={FaPrint} onClick={handlePrint}>
              Print
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={FaEnvelope}
              loading={actionLoading}
              disabled={!selectedInvoice?.buyer?.email || selectedInvoice?.invoice_status === "CANCELLED"}
              onClick={() => handleSendInvoice(selectedInvoice)}
            >
              Send
            </Button>
            {canCancelInvoice ? (
              <Button
                type="button"
                variant="danger"
                icon={FaBan}
                disabled={selectedInvoice?.invoice_status === "CANCELLED"}
                onClick={() => openCancelInvoice(selectedInvoice)}
              >
                Cancel
              </Button>
            ) : null}
          </div>

          <div className="relative overflow-hidden rounded-xl border border-border bg-white p-4">
            <CancelledWatermark show={selectedInvoice?.invoice_status === "CANCELLED"} />
            <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tax Invoice</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedInvoice?.company?.company_name || selectedInvoice?.company?.brand_name || "Company"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{selectedInvoice?.company?.address || "-"}</p>
              </div>
              <div className="text-sm md:text-right">
                <p><strong>{selectedInvoice?.invoice_id || "-"}</strong></p>
                <p>{formatDateIST(selectedInvoice?.invoice_date || selectedInvoice?.created_at)}</p>
                <p className={selectedInvoice?.invoice_status === "CANCELLED" ? "font-semibold text-rose-600" : "font-semibold text-emerald-600"}>
                  {invoiceStatusLabel(selectedInvoice?.invoice_status)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 border-b border-border py-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Bill To</p>
                <p className="mt-1 font-semibold">{selectedInvoice?.buyer?.name || "-"}</p>
                <p className="text-sm text-slate-600">{selectedInvoice?.buyer?.email || "-"}</p>
                <p className="text-sm text-slate-600">{selectedInvoice?.buyer?.phone || "-"}</p>
              </div>
              <div className="text-sm text-slate-700 md:text-right">
                <p>Payment: {selectedInvoice?.payment_method || "-"}</p>
                <p>Status: {selectedInvoice?.payment_status || "-"}</p>
                {selectedInvoice?.cancel_reason ? <p className="text-rose-600">Reason: {selectedInvoice.cancel_reason}</p> : null}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["Item", "Qty", "Our Price", "GST", "Amount"].map((label) => (
                      <th key={label} className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-500">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(selectedInvoice?.items || []).map((item, index) => (
                    <tr key={`${item.sku}-${index}`}>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-900">{item.name || "-"}</div>
                        <div className="text-xs text-slate-500">{item.sku}</div>
                      </td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{formatMoney(item.unit_price)}</td>
                      <td className="px-3 py-2">{item.tax_percentage || 0}%</td>
                      <td className="px-3 py-2 font-semibold">{formatMoney(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <div className="w-full max-w-xs rounded-lg border border-border p-3 text-sm">
                <div className="flex justify-between py-1"><span>Subtotal</span><strong>{formatMoney(selectedInvoice?.subtotal)}</strong></div>
                <div className="flex justify-between py-1"><span>Discount</span><strong>{formatMoney(selectedInvoice?.total_discount)}</strong></div>
                <div className="flex justify-between py-1"><span>GST</span><strong>{formatMoney(selectedInvoice?.total_tax)}</strong></div>
                <div className="mt-2 flex justify-between border-t border-border pt-2 text-base"><span className="font-bold">Total</span><strong>{formatMoney(selectedInvoice?.final_total_amount)}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel Invoice"
        size="lg"
      >
        <form onSubmit={handleCancelInvoice} className="space-y-4">
          <p className="text-sm text-slate-600">
            Please add a reason for cancelling invoice <strong>{selectedInvoice?.invoice_id}</strong>.
          </p>
          <Textarea
            label="Cancellation Reason"
            value={cancelReason}
            onChange={setCancelReason}
            rows={4}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCancelOpen(false)} disabled={actionLoading}>
              Close
            </Button>
            <Button type="submit" variant="danger" icon={FaBan} loading={actionLoading}>
              Cancel Invoice
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}

function invoiceStatusLabel(status) {
  return status === "CANCELLED" ? "Cancelled" : "Generated";
}

function CancelledWatermark({ show }) {
  if (!show) return null;

  return (
    <div className="invoice-cancelled-watermark pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
      <span className="select-none text-6xl font-black uppercase tracking-[0.24em] text-rose-600/15 sm:text-8xl">
        CANCELLED
      </span>
    </div>
  );
}

export default InvoiceGenerator;
