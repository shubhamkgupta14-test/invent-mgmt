import assert from "node:assert/strict";
import test from "node:test";

import {
  formatDateIST,
  formatDateTimeIST,
  formatMoney,
} from "../../frontend/src/utils/formatters.js";

test("formatDateIST returns date-only IST output", () => {
  assert.equal(formatDateIST("2026-01-01T00:00:00"), "01 Jan 2026");
});

test("formatDateTimeIST returns IST date and time output", () => {
  assert.match(formatDateTimeIST("2026-01-01T00:00:00"), /01 Jan 2026/);
  assert.match(formatDateTimeIST("2026-01-01T00:00:00"), /05:30:00 am/i);
});

test("formatMoney formats Indian currency text", () => {
  assert.equal(formatMoney(123456.7), "\u20b9 1,23,456.70");
  assert.equal(formatMoney(null), "\u20b9 0");
});

test("formatters handle empty values", () => {
  assert.equal(formatDateIST(""), "-");
  assert.equal(formatDateTimeIST(null), "-");
});
