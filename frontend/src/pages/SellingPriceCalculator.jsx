import { useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import Card from "../components/common/Card";
import Select from "../components/common/Select";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import { calculateSellingPrice, getStocks } from "../api/stockApi";
import { getMyDetails } from "../api/userApi";
import { useToast } from "../context/useToast";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { formatMoney } from "../utils/formatters";

const chargeFields = [
  ["marketplace_commission", "Marketplace referral fee"],
  ["shipping_charges", "Courier shipping fee"],
  ["platform_fees", "Platform payment fee"],
  ["packaging_charges", "Packing material cost"],
  ["return_rto", "Return and RTO provision"],
  ["margin", "Target profit margin"],
  ["misc", "Operational overhead buffer"],
  ["advertisement", "Advertising allocation"],
  ["promotion", "Promotion discount buffer"],
];

const money = (value = 0) => formatMoney(value);
const roundPrice = (value) => Math.round(Number(value || 0) * 100) / 100;

const packagingCharges = {
  Cardbox: { S: 8, M: 12, L: 15 },
  Pollybag: { S: 5, M: 7, L: 10 },
};
const maxPackagingCharge = 15;
const packagingLabels = {
  Cardbox: "Corrugated box",
  Pollybag: "Poly mailer",
};

function shippingCharge(weight) {
  if (weight <= 500) return 35;
  if (weight <= 1000) return 70;
  return 100;
}

function percentageAmount(basePrice, percent, { min = null, max = null } = {}) {
  const amount = roundPrice(basePrice * (percent / 100));
  const withMinimum = min === null ? amount : Math.max(amount, min);
  return max === null ? withMinimum : Math.min(withMinimum, max);
}

function SellingPriceCalculator() {
  const { addToast } = useToast();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [role, setRole] = useState("");
  const [form, setForm] = useState({
    sku: "",
    dead_weight: "",
    volumetric_weight: "",
    packing_types: [],
    packing_size: "S",
    overrides: {},
  });

  const canUseCalculator = role === "admin" || role === "superadmin";

  useEffect(() => {
    let isActive = true;

    Promise.all([getStocks(), getMyDetails()])
      .then(([stocksResponse, userResponse]) => {
        if (!isActive) return;

        setStocks(stocksResponse.data.data || []);
        setRole(String(userResponse.data.data?.role || "").toLowerCase());
      })
      .catch(() => addToast("Failed to load stock products", "error"))
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [addToast]);

  const selectedStock = useMemo(
    () => stocks.find((stock) => stock.sku === form.sku),
    [stocks, form.sku],
  );

  const defaultCharges = useMemo(() => {
    const basePrice = Number(selectedStock?.avg_price || 0);
    const taxRate = Number(selectedStock?.tax_rate || 0);
    const chargeableWeight = Math.max(
      Number(form.dead_weight || 0),
      Number(form.volumetric_weight || 0),
    );
    const packaging = form.packing_types.reduce(
      (total, type) =>
        total + Number(packagingCharges[type]?.[form.packing_size] || 0),
      0,
    );

    return {
      marketplace_commission: 0,
      shipping_charges: shippingCharge(chargeableWeight),
      platform_fees: percentageAmount(basePrice, 5, { min: 10, max: 25 }),
      packaging_charges: Math.min(packaging, maxPackagingCharge),
      return_rto: percentageAmount(basePrice, 10),
      margin: percentageAmount(basePrice, 30),
      misc: percentageAmount(basePrice, 5),
      advertisement: percentageAmount(basePrice, 2),
      promotion: percentageAmount(basePrice, 5),
      gst: percentageAmount(basePrice, taxRate),
    };
  }, [
    selectedStock?.avg_price,
    selectedStock?.tax_rate,
    form.dead_weight,
    form.volumetric_weight,
    form.packing_types,
    form.packing_size,
  ]);

  const defaultChargeInfo = [
    `Marketplace referral fee: ${money(0)} by default`,
    `Courier shipping fee: ${money(35)} up to 500g, ${money(70)} from 501g to 1000g, ${money(100)} above 1000g`,
    `Platform payment fee: ${money(10)} minimum, then 5% of unit cost capped at ${money(25)}`,
    `Corrugated box: S ${money(8)}, M ${money(12)}, L ${money(15)}`,
    `Poly mailer: S ${money(5)}, M ${money(7)}, L ${money(10)}`,
    `Packing material total is capped at ${money(15)}`,
    "GST: product tax rate applied to unit cost",
    "Return and RTO provision: 10%",
    "Target profit margin: 30%",
    "Operational overhead buffer: 5%",
    "Advertising allocation: 2%",
    "Promotion discount buffer: 5%",
  ];

  const getDefaultCharge = (key) =>
    result?.charges?.[key]?.default ?? defaultCharges[key] ?? 0;

  const liveDefaultSellingPrice = useMemo(() => {
    const basePrice = Number(selectedStock?.avg_price || 0);
    return roundPrice(
      basePrice +
        Object.values(defaultCharges).reduce(
          (total, value) => total + Number(value || 0),
          0,
        ),
    );
  }, [selectedStock?.avg_price, defaultCharges]);

  const liveCustomSellingPrice = useMemo(() => {
    const basePrice = Number(selectedStock?.avg_price || 0);
    return roundPrice(
      basePrice +
        chargeFields.reduce((total, [key]) => {
          const customValue = form.overrides[key];
          const charge =
            customValue === "" || customValue === undefined
              ? defaultCharges[key]
              : customValue;
          return total + Number(charge || 0);
        }, 0) +
        Number(defaultCharges.gst || 0),
    );
  }, [selectedStock?.avg_price, defaultCharges, form.overrides]);

  const stockOptions = stocks
    .filter((stock) => Number(stock.quantity || 0) > 0)
    .map((stock) => ({
      value: stock.sku,
      label: `${stock.name} (${stock.sku})`,
    }));

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateOverride = (key, value) => {
    setForm((prev) => ({
      ...prev,
      overrides: {
        ...prev.overrides,
        [key]: value === "" ? "" : Number(value),
      },
    }));
  };

  const togglePackingType = (type) => {
    setForm((prev) => {
      const exists = prev.packing_types.includes(type);
      return {
        ...prev,
        packing_types: exists
          ? prev.packing_types.filter((item) => item !== type)
          : [...prev.packing_types, type],
      };
    });
  };

  const buildPayload = (saveDefault = false) => ({
    sku: form.sku,
    dead_weight: Number(form.dead_weight || 0),
    volumetric_weight: Number(form.volumetric_weight || 0),
    packing_types: form.packing_types,
    packing_size: form.packing_size,
    overrides: Object.fromEntries(
      Object.entries(form.overrides).filter(([, value]) => value !== ""),
    ),
    save_default: saveDefault,
  });

  const handleCalculate = async (saveDefault = false) => {
    if (!form.sku) {
      addToast("Please select a product", "error");
      return;
    }

    try {
      setSubmitting(true);
      const response = await calculateSellingPrice(buildPayload(saveDefault));
      const data = response.data.data;
      setResult(data);
      if (saveDefault) {
        setStocks((prev) =>
          prev.map((stock) =>
            stock.sku === data.sku
              ? { ...stock, min_selling_price: data.default_selling_price }
              : stock,
          ),
        );
      }
      addToast(
        saveDefault
          ? "Default min selling price saved"
          : "Selling price calculated",
        "success",
      );
    } catch (error) {
      addToast(
        error.response?.data?.message || "Failed to calculate selling price",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Loader message="Loading calculator..." />
      </MainLayout>
    );
  }

  if (!canUseCalculator) {
    return (
      <MainLayout>
        <Card>
          <p className="text-sm font-semibold text-rose-700">
            Only admin and superadmin users can access this calculator.
          </p>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">
          Selling Price Calculator
        </h1>
        <p className="mt-1 text-slate-600">
          Calculate default and custom selling cost, then save only the default
          minimum selling price to stock.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Card>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-full min-w-[260px] max-w-[420px] flex-1">
              <Select
                label="Stock Product"
                value={form.sku}
                onChange={(value) => {
                  updateForm("sku", value);
                  setResult(null);
                }}
                options={stockOptions}
                placeholder="Select stock product"
                required
              />
            </div>
            <div className="w-32">
              <Input
                label="Unit Cost"
                value={selectedStock?.avg_price ?? ""}
                disabled
                className="text-right"
              />
            </div>
            <div className="w-24">
              <Input
                label="Tax %"
                value={selectedStock ? `${selectedStock.tax_rate ?? 0}%` : ""}
                disabled
                className="text-right"
              />
            </div>
            <div className="w-40">
              <Input
                label="Min Sell"
                value={
                  selectedStock?.min_selling_price
                    ? money(selectedStock.min_selling_price)
                    : "-"
                }
                disabled
                className="text-right"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-4">
            <div className="w-36">
              <Input
                label="Actual Wt"
                type="number"
                value={form.dead_weight}
                onChange={(value) => updateForm("dead_weight", value)}
                placeholder="grams"
                className="text-right"
              />
            </div>
            <div className="w-36">
              <Input
                label="Volumetric Wt"
                type="number"
                value={form.volumetric_weight}
                onChange={(value) => updateForm("volumetric_weight", value)}
                placeholder="grams"
                className="text-right"
              />
            </div>
            <div className="min-w-[220px]">
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Packaging Material
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  ["Cardbox", "Corrugated box"],
                  ["Pollybag", "Poly mailer"],
                ].map(([type, label]) => (
                  <label
                    key={type}
                    className="inline-flex h-9 items-center gap-2 text-sm font-medium text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={form.packing_types.includes(type)}
                      onChange={() => togglePackingType(type)}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="w-24">
              <Select
                label="Pack Size"
                value={form.packing_size}
                onChange={(value) => updateForm("packing_size", value)}
                options={["S", "M", "L"].map((size) => ({
                  label: size,
                  value: size,
                }))}
                className="text-center"
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60">
            <button
              type="button"
              onClick={() => setDefaultsOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="text-sm font-bold text-slate-900">
                Default charge details
              </span>
              {defaultsOpen ? (
                <FaChevronUp className="text-slate-500" size={14} />
              ) : (
                <FaChevronDown className="text-slate-500" size={14} />
              )}
            </button>
            {defaultsOpen && (
              <div className="grid gap-2 border-t border-indigo-100 px-4 py-4 text-sm text-slate-700 md:grid-cols-2">
                {defaultChargeInfo.map((item) => (
                  <div key={item} className="rounded-xl bg-white px-3 py-2">
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-border">
            <div className="border-b border-border bg-slate-50 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">
                Charges Calculator
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] table-fixed text-sm">
                <colgroup>
                  <col className="w-[44%]" />
                  <col className="w-[28%]" />
                  <col className="w-[28%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-slate-50/80 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Default Calculated</th>
                    <th className="px-4 py-3">Custom Editable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {chargeFields.map(([key, label]) => (
                    <tr key={key}>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {label}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={money(getDefaultCharge(key))}
                          disabled
                          className="w-32 rounded-lg border border-border bg-slate-100 px-3 py-2 text-right text-sm text-slate-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={form.overrides[key] ?? ""}
                          onChange={(event) =>
                            updateOverride(key, event.target.value)
                          }
                          placeholder="Custom amount"
                          className="w-32 rounded-lg border border-border bg-white px-3 py-2 text-right text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                        />
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      GST
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={money(getDefaultCharge("gst"))}
                        disabled
                        className="w-32 rounded-lg border border-border bg-slate-100 px-3 py-2 text-right text-sm text-slate-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value="No override"
                        disabled
                        className="w-32 rounded-lg border border-border bg-slate-100 px-3 py-2 text-sm text-slate-500"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase text-slate-500">
                Total Default Selling Price
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {money(result?.default_selling_price ?? liveDefaultSellingPrice)}
              </p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
              <p className="text-xs font-bold uppercase text-indigo-700">
                Total Custom Selling Price
              </p>
              <p className="mt-1 text-2xl font-bold text-indigo-800">
                {money(result?.custom_selling_price ?? liveCustomSellingPrice)}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => handleCalculate(false)}
              loading={submitting}
            >
              Calculate
            </Button>
            <Button onClick={() => handleCalculate(true)} loading={submitting}>
              Save Default to Stock
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-slate-900">Result</h2>
          {result ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Product
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {result.name} ({result.sku})
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Default Price
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {money(result.default_selling_price)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Custom Price
                  </p>
                  <p className="mt-2 text-2xl font-bold text-indigo-700">
                    {money(result.custom_selling_price)}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-border p-4 text-sm text-slate-700">
                <div className="flex justify-between">
                  <span>Base price</span>
                  <span>{money(result.base_price)}</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span>Chargeable weight</span>
                  <span>{result.chargeable_weight} g</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span>Packaging</span>
                  <span>
                    {result.packing_types.length
                      ? result.packing_types
                          .map((type) => packagingLabels[type] || type)
                          .join(" + ")
                      : "-"}{" "}
                    / {result.packing_size}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Select a product and calculate to preview default and custom
              selling prices.
            </p>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}

export default SellingPriceCalculator;
