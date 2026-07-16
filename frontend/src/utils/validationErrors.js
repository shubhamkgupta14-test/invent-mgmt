const LOCATION_PREFIXES = new Set(["body", "query", "path", "header", "cookie"]);

function humanizePart(part) {
  const text = String(part).replaceAll("_", " ").trim();
  if (/^\d+$/.test(text)) return `item ${Number(text) + 1}`;
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatValidationField(field) {
  const parts = String(field || "")
    .split(".")
    .filter(Boolean)
    .filter((part, index) => !(index === 0 && LOCATION_PREFIXES.has(part)));
  return parts.map(humanizePart).join(" → ") || "Request";
}

export function createValidationToast(errors, fallbackTitle = "Validation failed") {
  const validationErrors = Array.isArray(errors) ? errors : [];
  const descriptions = validationErrors.slice(0, 5).map((error) => {
    const field = formatValidationField(error?.field);
    const message = String(error?.message || "Invalid value").replace(/^Value error,\s*/i, "");
    return `${field}: ${message}`;
  });

  if (validationErrors.length > descriptions.length) {
    descriptions.push(`And ${validationErrors.length - descriptions.length} more validation error(s).`);
  }

  return {
    title: fallbackTitle,
    description: descriptions.length ? descriptions : ["Please check the entered values."],
  };
}
