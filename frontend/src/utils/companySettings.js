const COMPANY_SETTINGS_KEY = "company_settings";
const FALLBACK_BRAND_NAME = "E-Store";

export const DEFAULT_COMPANY_SETTINGS = {
  company_name: "",
  brand_name: "",
  email: "",
  phone: "",
  address: "",
  gst_number: "",
  website: "",
  logo_url: "",
  currency: "INR",
  custom_fields: [],
};

export const currencyOptions = [
  { code: "INR", label: "INR - Indian Rupee", locale: "en-IN" },
  { code: "USD", label: "USD - US Dollar", locale: "en-US" },
  { code: "EUR", label: "EUR - Euro", locale: "en-IE" },
  { code: "GBP", label: "GBP - British Pound", locale: "en-GB" },
  { code: "AED", label: "AED - UAE Dirham", locale: "en-AE" },
];

export function getStoredCompanySettings() {
  if (typeof localStorage === "undefined") return DEFAULT_COMPANY_SETTINGS;

  const stored = localStorage.getItem(COMPANY_SETTINGS_KEY);
  if (!stored) return DEFAULT_COMPANY_SETTINGS;

  try {
    return { ...DEFAULT_COMPANY_SETTINGS, ...JSON.parse(stored) };
  } catch {
    localStorage.removeItem(COMPANY_SETTINGS_KEY);
    return DEFAULT_COMPANY_SETTINGS;
  }
}

export function setStoredCompanySettings(settings) {
  const nextSettings = { ...DEFAULT_COMPANY_SETTINGS, ...(settings || {}) };
  if (typeof localStorage === "undefined") return nextSettings;

  localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(nextSettings));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("company-settings:changed"));
  }
  return nextSettings;
}

export function getCurrency() {
  return (getStoredCompanySettings().currency || "INR").toUpperCase();
}

export function getCurrencyLocale(currency = getCurrency()) {
  return (
    currencyOptions.find((option) => option.code === currency)?.locale || "en-IN"
  );
}

export function getCurrencySymbol(currency = getCurrency()) {
  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(0)
    .replace(/[0-9.,\s]/g, "")
    .trim();
}

export function getBrandName(settings = getStoredCompanySettings()) {
  return (
    (settings.brand_name || settings.company_name || FALLBACK_BRAND_NAME)
      .trim()
      || FALLBACK_BRAND_NAME
  );
}

export function getAppTitle(settings = getStoredCompanySettings()) {
  return `${getBrandName(settings)} Inventory`;
}

export function getBrandInitial(settings = getStoredCompanySettings()) {
  return getBrandName(settings).charAt(0).toUpperCase() || "I";
}
