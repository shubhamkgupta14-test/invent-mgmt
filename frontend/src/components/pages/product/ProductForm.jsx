import { useState } from "react";
import Button from "../../common/Button";
import Input from "../../common/Input";
import SelectDropdown from "../../common/SelectDropdown";
import Textarea from "../../common/Textarea";

function ProductForm({ products, suppliers, onSubmit }) {
  const [form, setForm] = useState({
    sku: "",
    name: "",
    description: "",
    category: "",
    unit_of_measure: "",
    tax_rate: 0,
    reorder_level: 0,
    attributes: {
      color: "",
      material: "",
      weight: "",
      size: "",
      dimension: "",
    },
    supplier_id: 0,
  });

  const categories = [
    ...new Set(products?.map((product) => product.category).filter(Boolean)),
  ];
  const units = ["pcs", "kg", "lt"];

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateAttribute = (key, value) => {
    setForm((current) => ({
      ...current,
      attributes: {
        ...current.attributes,
        [key]: value,
      },
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Product Details
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="SKU"
            placeholder="Enter SKU"
            value={form.sku || ""}
            onChange={(value) => updateForm("sku", value)}
            required
          />
          <Input
            label="Product Name"
            placeholder="Product name"
            value={form.name || ""}
            onChange={(value) => updateForm("name", value)}
            required
          />
          <SelectDropdown
            label="Category"
            value={form.category}
            onChange={(value) => updateForm("category", value)}
            placeholder="Select category"
            options={categories.map((category) => ({
              value: category,
              label: category,
            }))}
          />
        </div>
        <div className="mt-4">
          <Textarea
            label="Description"
            placeholder="Product description"
            value={form.description || ""}
            onChange={(value) => updateForm("description", value)}
            rows={3}
          />
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Inventory Setup
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <SelectDropdown
            label="Unit"
            value={form.unit_of_measure}
            onChange={(value) => updateForm("unit_of_measure", value)}
            placeholder="Select unit"
            options={units.map((unit) => ({
              value: unit,
              label: unit,
            }))}
          />
          <Input
            label="Tax Rate"
            type="number"
            placeholder="0"
            value={form.tax_rate || ""}
            onChange={(value) => updateForm("tax_rate", Number(value))}
          />
          <Input
            label="Reorder Level"
            type="number"
            placeholder="0"
            value={form.reorder_level || ""}
            onChange={(value) => updateForm("reorder_level", Number(value))}
          />
          <SelectDropdown
            label="Supplier"
            value={form.supplier_id}
            onChange={(value) => updateForm("supplier_id", value)}
            placeholder="Select supplier"
            options={suppliers.map((supplier) => ({
              value: supplier.supplier_id,
              label: supplier.name
                ? `${supplier.name} (${supplier.supplier_id})`
                : `${supplier.supplier_id}`,
            }))}
          />
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Attributes
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          <Input
            label="Color"
            placeholder="Color"
            value={form.attributes?.color || ""}
            onChange={(value) => updateAttribute("color", value)}
          />
          <Input
            label="Material"
            placeholder="Material"
            value={form.attributes?.material || ""}
            onChange={(value) => updateAttribute("material", value)}
          />
          <Input
            label="Weight"
            type="number"
            placeholder="0"
            value={form.attributes?.weight || ""}
            onChange={(value) => updateAttribute("weight", Number(value))}
          />
          <Input
            label="Size"
            placeholder="Size"
            value={form.attributes?.size || ""}
            onChange={(value) => updateAttribute("size", value)}
          />
          <Input
            label="Dimension"
            placeholder="L x B x H"
            value={form.attributes?.dimension || ""}
            onChange={(value) => updateAttribute("dimension", value)}
          />
        </div>
      </section>

      <div className="flex justify-end border-t border-[var(--border)] pt-5">
        <Button type="submit" variant="primary">
          Save Product
        </Button>
      </div>
    </form>
  );
}

export default ProductForm;
