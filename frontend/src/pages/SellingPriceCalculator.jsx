import { Fragment, useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import Card from "../components/common/Card";
import Select from "../components/common/Select";
import SelectDropdown from "../components/common/SelectDropdown";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import { calculateSellingPrice, getStocks } from "../api/stockApi";
import { getMyDetails } from "../api/userApi";
import { useToast } from "../context/useToast";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { formatMoney } from "../utils/formatters";

const money = (value = 0) => formatMoney(value);
const roundPrice = (value) => Math.round(Number(value || 0) * 100) / 100;
const roundFinalAmount = (value) => Math.ceil(Number(value || 0));
const defaultChargeSettings = {
  marketplace_commission: 0,
  shipping_charges: "",
  platform_fees_percent: 5,
  platform_fees_min: 10,
  platform_fees_max: 25,
  packaging_charges: "",
  margin_percent: 30,
  return_rto_percent: 10,
  misc_percent: 5,
  advertisement_percent: 2,
  promotion_percent: 5,
};
const primaryChargeKeys = [
  "marketplace_commission",
  "shipping_charges",
  "platform_fees",
  "packaging_charges",
  "margin",
];
const dependentChargeKeys = [
  "return_rto",
  "misc",
  "advertisement",
  "promotion",
];

const packagingCharges = {
  Cardbox: { S: 8, M: 12, L: 15 },
  Pollybag: { S: 5, M: 7, L: 10 },
};
const maxPackagingCharge = 15;
function settingNumber(settings, key, fallback = 0) {
  const value = settings[key];
  if (value === "" || value === null || value === undefined) return fallback;
  return Number(value || 0);
}

function optionalSetting(settings, key) {
  const value = settings[key];
  if (value === "" || value === null || value === undefined) return null;
  return Number(value || 0);
}

function buildChargeGroups(settings, taxRate) {
  return [
    {
      title: "Base Cost Add-ons",
      subtitle: "Added to the product cost",
      fields: [
        [
          "marketplace_commission",
          "Marketplace referral fee",
          `${money(settingNumber(settings, "marketplace_commission"))} flat`,
        ],
        [
          "shipping_charges",
          "Courier shipping fee",
          optionalSetting(settings, "shipping_charges") === null
            ? "By weight slab"
            : `${money(optionalSetting(settings, "shipping_charges"))} flat`,
        ],
        [
          "platform_fees",
          "Platform payment fee",
          `${settingNumber(settings, "platform_fees_percent", 5)}% of cost, min ${money(settingNumber(settings, "platform_fees_min", 10))} max ${money(settingNumber(settings, "platform_fees_max", 25))}`,
        ],
        [
          "packaging_charges",
          "Packing material cost",
          optionalSetting(settings, "packaging_charges") === null
            ? "By selected packing"
            : `${money(optionalSetting(settings, "packaging_charges"))} flat`,
        ],
        [
          "margin",
          "Target profit margin",
          `${settingNumber(settings, "margin_percent", 30)}% of cost`,
        ],
      ],
    },
    {
      title: "Primary Price Add-ons",
      subtitle: "Calculated from the primary price",
      autoCustom: true,
      fields: [
        ["return_rto", "Return and RTO provision", `${settingNumber(settings, "return_rto_percent", 10)}% of primary`],
        ["misc", "Operational overhead buffer", `${settingNumber(settings, "misc_percent", 5)}% of primary`],
        ["advertisement", "Advertising allocation", `${settingNumber(settings, "advertisement_percent", 2)}% of primary`],
        ["promotion", "Promotion discount buffer", `${settingNumber(settings, "promotion_percent", 5)}% of primary`],
      ],
    },
    {
      title: "Tax Reference",
      subtitle: "Shown separately, not included in min price",
      fields: [["gst", "GST", `${taxRate || 0}% on min price`]],
    },
  ];
}

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

function chargeValue(charges, key, useCustom = false) {
  const charge = charges[key];
  if (useCustom && charge.custom !== null && charge.custom !== undefined) {
    return Number(charge.custom || 0);
  }
  return Number(charge.default || 0);
}

function chargeRow(defaultValue, customValue) {
  return {
    default: roundPrice(defaultValue),
    custom:
      customValue !== null && customValue !== undefined
        ? roundPrice(customValue)
        : null,
  };
}

function buildPricing({
  basePrice,
  taxRate,
  chargeableWeight,
  packingTotal,
  overrides = {},
  settings = defaultChargeSettings,
}) {
  const shippingAmount =
    optionalSetting(settings, "shipping_charges") ?? shippingCharge(chargeableWeight);
  const packagingAmount =
    optionalSetting(settings, "packaging_charges") ?? Math.min(packingTotal, maxPackagingCharge);

  const charges = {
    marketplace_commission: chargeRow(
      settingNumber(settings, "marketplace_commission"),
      overrides.marketplace_commission,
    ),
    shipping_charges: chargeRow(shippingAmount, overrides.shipping_charges),
    platform_fees: chargeRow(
      percentageAmount(basePrice, settingNumber(settings, "platform_fees_percent", 5), {
        min: settingNumber(settings, "platform_fees_min", 10),
        max: settingNumber(settings, "platform_fees_max", 25),
      }),
      overrides.platform_fees,
    ),
    packaging_charges: chargeRow(packagingAmount, overrides.packaging_charges),
    margin: chargeRow(
      percentageAmount(basePrice, settingNumber(settings, "margin_percent", 30)),
      overrides.margin,
    ),
  };

  const defaultPrimaryTotal =
    basePrice +
    primaryChargeKeys.reduce((total, key) => total + chargeValue(charges, key), 0);
  const customPrimaryTotal =
    basePrice +
    primaryChargeKeys.reduce(
      (total, key) => total + chargeValue(charges, key, true),
      0,
    );

  charges.return_rto = chargeRow(
    percentageAmount(defaultPrimaryTotal, settingNumber(settings, "return_rto_percent", 10)),
    percentageAmount(customPrimaryTotal, settingNumber(settings, "return_rto_percent", 10)),
  );
  charges.misc = chargeRow(
    percentageAmount(defaultPrimaryTotal, settingNumber(settings, "misc_percent", 5)),
    percentageAmount(customPrimaryTotal, settingNumber(settings, "misc_percent", 5)),
  );
  charges.advertisement = chargeRow(
    percentageAmount(defaultPrimaryTotal, settingNumber(settings, "advertisement_percent", 2)),
    percentageAmount(customPrimaryTotal, settingNumber(settings, "advertisement_percent", 2)),
  );
  charges.promotion = chargeRow(
    percentageAmount(defaultPrimaryTotal, settingNumber(settings, "promotion_percent", 5)),
    percentageAmount(customPrimaryTotal, settingNumber(settings, "promotion_percent", 5)),
  );

  const defaultPreGstTotal =
    defaultPrimaryTotal +
    dependentChargeKeys.reduce((total, key) => total + chargeValue(charges, key), 0);
  const customPreGstTotal =
    customPrimaryTotal +
    dependentChargeKeys.reduce(
      (total, key) => total + chargeValue(charges, key, true),
      0,
    );

  charges.gst = chargeRow(
    percentageAmount(defaultPreGstTotal, taxRate),
    percentageAmount(customPreGstTotal, taxRate),
  );

  return {
    charges,
    defaultSellingPrice: roundFinalAmount(defaultPreGstTotal),
    customSellingPrice: roundFinalAmount(customPreGstTotal),
  };
}

function SellingPriceCalculator() {
  const { addToast } = useToast();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [chargeSettingsOpen, setChargeSettingsOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [role, setRole] = useState("");
  const [chargeSettings, setChargeSettings] = useState(defaultChargeSettings);
  const [form, setForm] = useState({
    sku: "",
    actual_price: "",
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

  const livePricing = useMemo(() => {
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

    return buildPricing({
      basePrice,
      taxRate,
      chargeableWeight,
      packingTotal: packaging,
      overrides: form.overrides,
      settings: chargeSettings,
    });
  }, [
    selectedStock?.avg_price,
    selectedStock?.tax_rate,
    form.dead_weight,
    form.volumetric_weight,
    form.packing_types,
    form.packing_size,
    form.overrides,
    chargeSettings,
  ]);
  const defaultCharges = livePricing.charges;
  const chargeGroups = useMemo(
    () => buildChargeGroups(chargeSettings, selectedStock?.tax_rate || 0),
    [chargeSettings, selectedStock?.tax_rate],
  );

  const getDefaultCharge = (key) =>
    result?.charges?.[key]?.default ?? defaultCharges[key]?.default ?? 0;

  const getCustomCharge = (key) =>
    result?.charges?.[key]?.custom ?? defaultCharges[key]?.custom ?? null;

  const liveDefaultSellingPrice = useMemo(() => {
    return livePricing.defaultSellingPrice;
  }, [livePricing.defaultSellingPrice]);

  const liveCustomSellingPrice = useMemo(() => {
    return livePricing.customSellingPrice;
  }, [livePricing.customSellingPrice]);

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

  const updateChargeSetting = (key, value) => {
    setChargeSettings((prev) => ({
      ...prev,
      [key]: value === "" ? "" : Number(value),
    }));
    setResult(null);
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
    settings: {
      ...chargeSettings,
      shipping_charges: optionalSetting(chargeSettings, "shipping_charges"),
      packaging_charges: optionalSetting(chargeSettings, "packaging_charges"),
    },
    actual_price: form.actual_price === "" ? null : Number(form.actual_price || 0),
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
              ? {
                  ...stock,
                  min_selling_price: data.default_selling_price,
                  actual_price:
                    form.actual_price === ""
                      ? stock.actual_price
                      : Number(form.actual_price || 0),
                }
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
            Only admin and Super Admin users can access this calculator.
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
          Calculate GST-excluded minimum selling price, then save the default
          minimum price to stock.
        </p>
      </div>

      <div className="w-full min-w-0 max-w-full space-y-6 overflow-hidden">
        <Card className="min-w-0 overflow-hidden">
          <button
            type="button"
            onClick={() => setChargeSettingsOpen((current) => !current)}
            className="flex w-full items-start justify-between gap-3 text-left"
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Charge Settings
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Adjust default formulas used in the calculated columns.
              </p>
            </div>
            <span className="mt-1 rounded-lg border border-border bg-white p-2 text-slate-500">
              {chargeSettingsOpen ? (
                <FaChevronUp size={14} />
              ) : (
                <FaChevronDown size={14} />
              )}
            </span>
          </button>

          {chargeSettingsOpen ? (
            <div className="mt-5 space-y-5 border-t border-border pt-5">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setChargeSettings(defaultChargeSettings);
                    setResult(null);
                  }}
                >
                  Reset
                </Button>
              </div>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Flat Overrides
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Input
                    label="Marketplace"
                    type="number"
                    min="0"
                    value={chargeSettings.marketplace_commission}
                    onChange={(value) =>
                      updateChargeSetting("marketplace_commission", value)
                    }
                  />
                  <Input
                    label="Shipping"
                    type="number"
                    min="0"
                    placeholder="Auto"
                    value={chargeSettings.shipping_charges}
                    onChange={(value) =>
                      updateChargeSetting("shipping_charges", value)
                    }
                  />
                  <Input
                    label="Packaging"
                    type="number"
                    min="0"
                    placeholder="Auto"
                    value={chargeSettings.packaging_charges}
                    onChange={(value) =>
                      updateChargeSetting("packaging_charges", value)
                    }
                  />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Primary Percentages
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Input
                    label="Platform %"
                    type="number"
                    min="0"
                    value={chargeSettings.platform_fees_percent}
                    onChange={(value) =>
                      updateChargeSetting("platform_fees_percent", value)
                    }
                  />
                  <Input
                    label="Platform Min"
                    type="number"
                    min="0"
                    value={chargeSettings.platform_fees_min}
                    onChange={(value) =>
                      updateChargeSetting("platform_fees_min", value)
                    }
                  />
                  <Input
                    label="Platform Max"
                    type="number"
                    min="0"
                    value={chargeSettings.platform_fees_max}
                    onChange={(value) =>
                      updateChargeSetting("platform_fees_max", value)
                    }
                  />
                  <Input
                    label="Margin %"
                    type="number"
                    min="0"
                    value={chargeSettings.margin_percent}
                    onChange={(value) =>
                      updateChargeSetting("margin_percent", value)
                    }
                  />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Primary-Based Percentages
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Input
                    label="Return/RTO %"
                    type="number"
                    min="0"
                    value={chargeSettings.return_rto_percent}
                    onChange={(value) =>
                      updateChargeSetting("return_rto_percent", value)
                    }
                  />
                  <Input
                    label="Overhead %"
                    type="number"
                    min="0"
                    value={chargeSettings.misc_percent}
                    onChange={(value) =>
                      updateChargeSetting("misc_percent", value)
                    }
                  />
                  <Input
                    label="Ads %"
                    type="number"
                    min="0"
                    value={chargeSettings.advertisement_percent}
                    onChange={(value) =>
                      updateChargeSetting("advertisement_percent", value)
                    }
                  />
                  <Input
                    label="Promotion %"
                    type="number"
                    min="0"
                    value={chargeSettings.promotion_percent}
                    onChange={(value) =>
                      updateChargeSetting("promotion_percent", value)
                    }
                  />
                </div>
              </section>
            </div>
          ) : null}
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(260px,1fr)_140px_110px_170px_170px] lg:items-end">
            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
              <SelectDropdown
                label="Stock Item"
                value={form.sku}
                onChange={(value) => {
                  const stock = stocks.find((item) => item.sku === value);
                  setForm((prev) => ({
                    ...prev,
                    sku: value,
                    actual_price: stock?.actual_price || "",
                  }));
                  setResult(null);
                }}
                options={stockOptions}
                placeholder="Select stock item"
                allowCustom
                required
              />
            </div>
            <div>
              <Input
                label="Unit Cost"
                value={selectedStock?.avg_price ?? ""}
                disabled
                className="text-right"
              />
            </div>
            <div>
              <Input
                label="Tax %"
                value={selectedStock ? `${selectedStock.tax_rate ?? 0}%` : ""}
                disabled
                className="text-right"
              />
            </div>
            <div>
              <Input
                label="Min. Selling Price"
                value={
                  selectedStock?.min_selling_price
                    ? money(selectedStock.min_selling_price)
                    : "-"
                }
                disabled
                className="text-right"
              />
            </div>
            <div>
              <Input
                label="Actual Price / MRP"
                type="number"
                min="0"
                value={form.actual_price}
                onChange={(value) => updateForm("actual_price", value)}
                placeholder="MRP"
                className="text-right"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[150px_170px_120px_minmax(220px,1fr)] lg:items-end">
            <div>
              <Input
                label="Actual Weight"
                type="number"
                value={form.dead_weight}
                onChange={(value) => updateForm("dead_weight", value)}
                placeholder="grams"
                className="text-right"
              />
            </div>
            <div>
              <Input
                label="Volumetric Weight"
                type="number"
                value={form.volumetric_weight}
                onChange={(value) => updateForm("volumetric_weight", value)}
                placeholder="grams"
                className="text-right"
              />
            </div>
            <div>
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
            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
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
          </div>

          <div className="mt-6 max-w-full overflow-hidden rounded-2xl border border-border">
            <div className="border-b border-border bg-slate-50 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">
                Pricing Breakdown
              </h2>
            </div>
            <div className="max-w-full overflow-x-auto">
              <table className="w-full min-w-[620px] table-fixed text-sm">
                <colgroup>
                  <col className="w-[44%]" />
                  <col className="w-[28%]" />
                  <col className="w-[28%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-slate-50/80 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Default Amount</th>
                    <th className="px-4 py-3">Custom Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {chargeGroups.map((group) => (
                    <Fragment key={group.title}>
                      <tr className="bg-slate-50/80">
                        <td colSpan={3} className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                              {group.title}
                            </span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-border">
                              {group.subtitle}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {group.fields.map(([key, label, hint]) => {
                        const isGst = key === "gst";
                        const isAutoCustom = group.autoCustom || isGst;

                        return (
                          <tr key={key}>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-slate-700">
                                  {label}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                  {hint}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                value={money(getDefaultCharge(key))}
                                disabled
                                className="w-32 rounded-lg border border-border bg-slate-100 px-3 py-2 text-right text-sm text-slate-600"
                              />
                            </td>
                            <td className="px-4 py-3">
                              {isAutoCustom ? (
                                <input
                                  value={
                                    getCustomCharge(key) === null
                                      ? "Auto calculated"
                                      : money(getCustomCharge(key))
                                  }
                                  disabled
                                  className="w-32 rounded-lg border border-border bg-slate-100 px-3 py-2 text-right text-sm text-slate-500"
                                />
                              ) : (
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
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase text-slate-500">
                Default Min Selling Price
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {money(result?.default_selling_price ?? liveDefaultSellingPrice)}
              </p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
              <p className="text-xs font-bold uppercase text-indigo-700">
                Custom Min Selling Price
              </p>
              <p className="mt-1 text-2xl font-bold text-indigo-800">
                {money(result?.custom_selling_price ?? liveCustomSellingPrice)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => handleCalculate(false)}
              loading={submitting}
              className="w-full sm:w-auto"
            >
              Calculate
            </Button>
            <Button
              onClick={() => handleCalculate(true)}
              loading={submitting}
              className="w-full sm:w-auto"
            >
              Save Default to Stock
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}

export default SellingPriceCalculator;
