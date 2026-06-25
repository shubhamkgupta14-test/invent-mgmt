import { useState } from "react";
import SupplierSelector from "./SupplierSelector";
import ProductSelectors from "./ProductSelector";
import PurchaseItemRow from "./PurchaseItemRow";
import PaymentDetails from "./PaymentDetails";
import PaymentDetailsRow from "./PaymentDetailsRow";
import SelectDropdown from "./SelectDropdown";

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

  const [attributes, setAttributes] = useState({});
  const categories = [
    ...new Set(products?.map((product) => product.category).filter(Boolean)),
  ];
  const units = ["pcs", "kg", "lt"];

  const handleSubmit = () => {
    onSubmit(form);
  };

  return (
    <div>
      <div className="flex gap-2 my-2">
        <input
          type="text"
          placeholder="SKU"
          value={form.sku || ""}
          onChange={(e) =>
            setForm({
              ...form,
              sku: e.target.value,
            })
          }
          className="border p-2 w-1/3"
        />

        <input
          type="text"
          placeholder="Product name"
          value={form.name || ""}
          onChange={(e) =>
            setForm({
              ...form,
              name: e.target.value,
            })
          }
          className="border p-2 w-1/3"
        />

        <SelectDropdown
          value={form.category}
          onChange={(value) =>
            setForm({
              ...form,
              category: value,
            })
          }
          placeholder="Select Category"
          options={categories.map((category) => ({
            value: category,
            label: category,
          }))}
        />
      </div>
      <div className="flex gap-2 my-2">
        <textarea
          placeholder="Product description"
          value={form.description || ""}
          onChange={(e) =>
            setForm({
              ...form,
              description: e.target.value,
            })
          }
          className="border p-2 w-full rounded resize-none"
        />
      </div>
      <div className="flex gap-2 my-2">
        <SelectDropdown
          value={form.unit_of_measure}
          onChange={(value) =>
            setForm({
              ...form,
              unit_of_measure: value,
            })
          }
          placeholder="Select Unit"
          options={units.map((unit) => ({
            value: unit,
            label: unit,
          }))}
        />

        <input
          type="text"
          placeholder="Tax rate %"
          value={form.tax_rate || ""}
          onChange={(e) =>
            setForm({
              ...form,
              tax_rate: e.target.value,
            })
          }
          className="border p-2 w-1/4"
        />

        <input
          type="number"
          placeholder="Reorder level"
          value={form.reorder_level || ""}
          onChange={(e) =>
            setForm({
              ...form,
              reorder_level: Number(e.target.value),
            })
          }
          className="border p-2 w-1/4"
        />

        <SelectDropdown
          value={form.supplier_id}
          onChange={(value) =>
            setForm({
              ...form,
              supplier_id: value,
            })
          }
          placeholder="Select Supplier"
          options={suppliers.map((supplier) => ({
            value: supplier.supplier_id,
            label: `${supplier.supplier_id}`,
          }))}
        />
      </div>

      <div className="flex gap-2 my-2">
        <input
          type="text"
          placeholder="Color"
          value={form.attributes?.color || ""}
          onChange={(e) =>
            setForm({
              ...form,
              attributes: {
                ...form.attributes,
                color: e.target.value,
              },
            })
          }
          className="border p-2 w-1/5"
        />

        <input
          type="text"
          placeholder="Material"
          value={form.attributes?.material || ""}
          onChange={(e) =>
            setForm({
              ...form,
              attributes: {
                ...form.attributes,
                material: e.target.value,
              },
            })
          }
          className="border p-2 w-1/5"
        />

        <input
          type="number"
          placeholder="Weight"
          value={form.attributes?.weight || ""}
          onChange={(e) =>
            setForm({
              ...form,
              attributes: {
                ...form.attributes,
                weight: Number(e.target.value),
              },
            })
          }
          className="border p-2 w-1/5"
        />

        <input
          type="text"
          placeholder="Size"
          value={form.attributes?.size || ""}
          onChange={(e) =>
            setForm({
              ...form,
              attributes: {
                ...form.attributes,
                size: e.target.value,
              },
            })
          }
          className="border p-2 w-1/5"
        />

        <input
          type="number"
          placeholder="Dimension LxBxH"
          value={form.attributes?.dimension || ""}
          onChange={(e) =>
            setForm({
              ...form,
              attributes: {
                ...form.attributes,
                dimension: e.target.value,
              },
            })
          }
          className="border p-2 w-1/5"
        />
      </div>

      <button
        onClick={handleSubmit}
        className="bg-green-600 text-white px-4 py-2 mt-4"
      >
        Save Product
      </button>
    </div>
  );
}

export default ProductForm;
