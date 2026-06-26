import { useState, useEffect } from "react";
import { FaCheckCircle } from "react-icons/fa";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Select from "../common/Select";
import Button from "../common/Button";
import { useToast } from "../../context/ToastContext";

export function ProductFormModal({
  isOpen,
  onClose,
  onSuccess,
  product = null,
  suppliers = [],
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    category: "",
    unit_price: "",
    quantity: "",
    low_stock_level: "",
    supplier_id: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({
        sku: "",
        name: "",
        description: "",
        category: "",
        unit_price: "",
        quantity: "",
        low_stock_level: "",
        supplier_id: "",
      });
    }
  }, [product, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.sku?.trim()) newErrors.sku = "SKU is required";
    if (!formData.name?.trim()) newErrors.name = "Product name is required";
    if (!formData.category?.trim()) newErrors.category = "Category is required";
    if (!formData.unit_price || formData.unit_price <= 0)
      newErrors.unit_price = "Valid price is required";
    if (!formData.quantity || formData.quantity < 0)
      newErrors.quantity = "Valid quantity is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      addToast("Please fill in all required fields", "error");
      return;
    }

    try {
      setLoading(true);
      // TODO: Call API to create/update product
      // const response = product ? await updateProduct(product.id, formData) : await createProduct(formData);

      addToast(
        product ? "Product updated successfully" : "Product added successfully",
        "success",
      );

      if (onSuccess) {
        onSuccess(formData);
      }

      onClose();
    } catch (error) {
      addToast("Failed to save product. Please try again.", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const supplierOptions = suppliers.map((s) => ({
    label: s.name,
    value: s.id,
  }));

  const categoryOptions = [
    { label: "Electronics", value: "Electronics" },
    { label: "Clothing", value: "Clothing" },
    { label: "Food", value: "Food" },
    { label: "Books", value: "Books" },
    { label: "Other", value: "Other" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? "Edit Product" : "Add New Product"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* SKU & Name */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="SKU"
            placeholder="Product SKU"
            value={formData.sku}
            onChange={(value) => setFormData({ ...formData, sku: value })}
            error={errors.sku}
            required
          />
          <Input
            label="Product Name"
            placeholder="Product name"
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value })}
            error={errors.name}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Description
          </label>
          <textarea
            placeholder="Product description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows="3"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg
              bg-white text-slate-900 placeholder-slate-400 font-sans resize-vertical
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              transition-all duration-200"
          />
        </div>

        {/* Category & Unit Price */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Category"
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value })}
            options={categoryOptions}
            placeholder="Select category"
            error={errors.category}
            required
          />
          <Input
            label="Unit Price (Rs)"
            type="number"
            placeholder="0.00"
            value={formData.unit_price}
            onChange={(value) =>
              setFormData({ ...formData, unit_price: value })
            }
            error={errors.unit_price}
            required
          />
        </div>

        {/* Quantity & Low Stock Level */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Current Quantity"
            type="number"
            placeholder="0"
            value={formData.quantity}
            onChange={(value) => setFormData({ ...formData, quantity: value })}
            error={errors.quantity}
            required
          />
          <Input
            label="Low Stock Alert Level"
            type="number"
            placeholder="Reorder point"
            value={formData.low_stock_level}
            onChange={(value) =>
              setFormData({ ...formData, low_stock_level: value })
            }
          />
        </div>

        {/* Supplier */}
        {supplierOptions.length > 0 && (
          <Select
            label="Supplier"
            value={formData.supplier_id}
            onChange={(value) =>
              setFormData({ ...formData, supplier_id: value })
            }
            options={supplierOptions}
            placeholder="Select supplier"
          />
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
            icon={FaCheckCircle}
          >
            {product ? "Update Product" : "Add Product"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ProductFormModal;
