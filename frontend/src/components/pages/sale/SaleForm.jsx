import { useMemo, useState } from "react";
import { FaBarcode } from "react-icons/fa";
import Button from "../../common/Button";
import Input from "../../common/Input";
import Select from "../../common/Select";
import Textarea from "../../common/Textarea";
import PaymentDetailsRow from "../purchase/PaymentDetailsRow";
import SaleItemRow from "./SaleItemRow";
import { getStockByBarcode } from "../../../api/stockApi";
import { useToast } from "../../../context/useToast";
import { formatMoney } from "../../../utils/formatters";

const platformOptions = [
  { label: "Flipkart", value: "Flipkart" },
  { label: "Amazon", value: "Amazon" },
  { label: "Meesho", value: "Meesho" },
  { label: "Self Store", value: "Self Store" },
  { label: "Other", value: "Other" },
];

function SaleForm({ products, onSubmit }) {
  const { addToast } = useToast();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const [scannedProducts, setScannedProducts] = useState([]);
  const [form, setForm] = useState({
    invoice_id: "",
    platform: "Self Store",
    user_info: {
      name: "",
      phone: "",
      email: "",
    },
    items: [{}],
    payment_details: [
      {
        payment_method: "",
        amount_paid: 0,
        payment_status: "PAID",
      },
    ],
    sale_status: "SOLD",
    notes: "",
  });
  const availableProducts = useMemo(() => {
    const existingSkus = new Set(products.map((product) => product.sku));
    return [
      ...products,
      ...scannedProducts.filter((product) => !existingSkus.has(product.sku)),
    ];
  }, [products, scannedProducts]);

  const addItemRow = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, {}],
    }));
  };

  const addPaymentRow = () => {
    setForm((current) => ({
      ...current,
      payment_details: [
        ...current.payment_details,
        { payment_method: "", amount_paid: 0, payment_status: "PAID" },
      ],
    }));
  };

  const addScannedStock = (stock) => {
    setForm((current) => {
      const items = [...current.items];
      const existingIndex = items.findIndex((item) => item.sku === stock.sku);
      const nextItem = {
        sku: stock.sku,
        quantity: 1,
        unit_price: Number(stock.min_selling_price || 0),
        discount_percentage: 0,
      };

      if (existingIndex >= 0) {
        items[existingIndex] = {
          ...items[existingIndex],
          quantity: Number(items[existingIndex].quantity || 0) + 1,
          unit_price:
            items[existingIndex].unit_price || nextItem.unit_price,
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
      setScannedProducts((current) => {
        if (current.some((product) => product.sku === stock.sku)) return current;
        return [...current, stock];
      });
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

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateUserInfo = (key, value) => {
    setForm((current) => ({
      ...current,
      user_info: {
        ...current.user_info,
        [key]: value,
      },
    }));
  };

  const updateItem = (index, key, value) => {
    const updated = [...form.items];
    updated[index][key] = value;
    setForm({ ...form, items: updated });
  };

  const updatePayment = (index, key, value) => {
    const updated = [...form.payment_details];
    updated[index][key] = value;
    setForm({ ...form, payment_details: updated });
  };

  const getProductTaxRate = (sku) =>
    Number(availableProducts.find((product) => product.sku === sku)?.tax_rate || 0);

  const calculateTotal = () =>
    form.items.reduce((sum, item) => {
      const price = (item.quantity || 0) * (item.unit_price || 0);
      const discount = price * ((item.discount_percentage || 0) / 100);
      const taxableAmount = price - discount;
      const tax = taxableAmount * (getProductTaxRate(item.sku) / 100);
      return sum + taxableAmount + tax;
    }, 0);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      ...form,
      user_info: Object.values(form.user_info).some(Boolean)
        ? form.user_info
        : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section>
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Invoice Number"
            placeholder="Enter invoice number"
            value={form.invoice_id || ""}
            onChange={(value) => updateForm("invoice_id", value)}
            required
          />
          <Select
            label="Sales Channel"
            value={form.platform}
            onChange={(value) => updateForm("platform", value)}
            options={platformOptions}
            placeholder="Select sales channel"
            required
          />
          <Input
            label="Sale Status"
            value={form.sale_status}
            onChange={() => {}}
            disabled
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-slate-50 p-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Customer Info
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Name"
            placeholder="Customer name"
            value={form.user_info.name || ""}
            onChange={(value) => updateUserInfo("name", value)}
          />
          <Input
            label="Phone"
            placeholder="Customer phone"
            value={form.user_info.phone || ""}
            onChange={(value) => updateUserInfo("phone", value)}
          />
          <Input
            label="Email"
            placeholder="Customer email"
            value={form.user_info.email || ""}
            onChange={(value) => updateUserInfo("email", value)}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-slate-50 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Sale Items
          </h2>
          <Button type="button" variant="secondary" size="sm" onClick={addItemRow}>
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
          {form.items.map((item, index) => (
            <SaleItemRow
              key={index}
              item={item}
              index={index}
              products={availableProducts}
              updateItem={updateItem}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-slate-50 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Payment Details
          </h2>
          <Button type="button" variant="secondary" size="sm" onClick={addPaymentRow}>
            Add Payment
          </Button>
        </div>

        <div className="space-y-3">
          {form.payment_details.map((payment, index) => (
            <PaymentDetailsRow
              key={index}
              item={payment}
              index={index}
              updatePM={updatePayment}
            />
          ))}
        </div>
      </section>

      <Textarea
        label="Notes"
        placeholder="Add internal notes"
        value={form.notes || ""}
        onChange={(value) => updateForm("notes", value)}
        rows={3}
      />

      <div className="flex flex-col items-end gap-4 border-t border-[var(--border)] pt-5 md:flex-row md:items-center md:justify-between">
        <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          <span className="font-semibold">Estimated total:</span>{" "}
          <span className="font-mono">{formatMoney(calculateTotal())}</span>
        </div>
        <Button type="submit" variant="primary">
          Save Sale
        </Button>
      </div>
    </form>
  );
}

export default SaleForm;
