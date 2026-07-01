import { getCurrency, getCurrencyLocale, getCurrencySymbol } from "./companySettings.js";

export function formatDateIST(value) {
  if (!value) return "-";

  const normalizedValue = /[zZ]|[+-]\d{2}:\d{2}$/.test(value)
    ? value
    : `${value}Z`;
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTimeIST(value) {
  if (!value) return "-";

  const normalizedValue = /[zZ]|[+-]\d{2}:\d{2}$/.test(value)
    ? value
    : `${value}Z`;
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatMoney(value = 0) {
  const currency = getCurrency();
  const amount = Number(value || 0);
  const fractionDigits = Number.isInteger(amount) ? 0 : 2;
  const formattedAmount = new Intl.NumberFormat(getCurrencyLocale(currency), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Math.abs(amount));

  return `${amount < 0 ? "-" : ""}${getCurrencySymbol(currency)} ${formattedAmount}`;
}

export function formatCompactMoney(value = 0) {
  const amount = Number(value || 0);
  const currency = getCurrency();

  if (Math.abs(amount) < 1000) return formatMoney(amount);

  return `${amount < 0 ? "-" : ""}${getCurrencySymbol(currency)} ${(Math.abs(amount) / 1000).toFixed(1)}K`;
}
