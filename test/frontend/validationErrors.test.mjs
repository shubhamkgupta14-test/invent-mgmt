import assert from "node:assert/strict";
import test from "node:test";

import {
  createValidationToast,
  formatValidationField,
} from "../../frontend/src/utils/validationErrors.js";

test("validation fields are converted to readable nested labels", () => {
  assert.equal(formatValidationField("body.items.0.sku"), "Items → item 1 → Sku");
  assert.equal(formatValidationField("query.page_size"), "Page Size");
});

test("validation toast preserves title and field descriptions", () => {
  assert.deepEqual(
    createValidationToast([
      { field: "body.email", message: "Field required" },
      { field: "body.password", message: "Value error, Password is too weak" },
    ]),
    {
      title: "Validation failed",
      description: [
        "Email: Field required",
        "Password: Password is too weak",
      ],
    },
  );
});
