import { useState, useEffect } from "react";
import { FaCheckCircle } from "react-icons/fa";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Select from "../common/Select";
import Button from "../common/Button";
import { useToast } from "../../context/ToastContext";

export function PurchaseFormModal({
  isOpen,
  onClose,
  onSuccess,
  purchase = null,
  suppliers = [],
  products = [],
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    supplier_id: "",
    quantity: "",
    unit_price: "",
    total_amount: "",
    date: new Date().toISOString().split("T")[0],
    status: "Completed",
    invoice_number: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (purchase) {
      setFormData(purchase);
    } else {
      setFormData({
        product_id: "",
        supplier_id: "",
        quantity: "",
        unit_price: "",
        total_amount: "",
        date: new Date().toISOString().split("T")[0],
        status: "Completed",
        invoice_number: "",
        notes: "",
      });
    }
  }, [purchase, isOpen]);

  // Auto-calculate total when quantity or price changes
  useEffect(() => {
    if (formData.quantity && formData.unit_price) {
      const total = (formData.quantity * formData.unit_price).toFixed(2);
      setFormData((prev) => ({ ...prev, total_amount: total }));
    }
  }, [formData.quantity, formData.unit_price]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.product_id) newErrors.product_id = "Product is required";
    if (!formData.supplier_id) newErrors.supplier_id = "Supplier is required";
    if (!formData.quantity || formData.quantity <= 0)
      newErrors.quantity = "Valid quantity is required";
    if (!formData.unit_price || formData.unit_price <= 0)
      newErrors.unit_price = "Valid price is required";
    if (!formData.date) newErrors.date = "Date is required";

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
      // TODO: Call API to create/update purchase
      // const response = purchase ? await updatePurchase(purchase.id, formData) : await createPurchase(formData);

      addToast(
        purchase
          ? "Purchase updated successfully"
          : "Purchase recorded successfully",
        "success",
      );

      if (onSuccess) {
        onSuccess(formData);
      }

      onClose();
    } catch (error) {
      addToast("Failed to save purchase. Please try again.", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const productOptions = products.map((p) => ({
    label: `${p.name} (${p.sku})`,
    value: p.id,
  }));

  const supplierOptions = suppliers.map((s) => ({
    label: s.name,
    value: s.id,
  }));

  const statusOptions = [
    { label: "Completed", value: "Completed" },
    { label: "Pending", value: "Pending" },
    { label: "Cancelled", value: "Cancelled" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={purchase ? "Edit Purchase" : "Record New Purchase"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Product & Supplier */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Product"
            value={formData.product_id}
            onChange={(value) =>
              setFormData({ ...formData, product_id: value })
            }
            options={productOptions}
            placeholder="Select product"
            error={errors.product_id}
            required
          />
          <Select
            label="Supplier"
            value={formData.supplier_id}
            onChange={(value) =>
              setFormData({ ...formData, supplier_id: value })
            }
            options={supplierOptions}
            placeholder="Select supplier"
            error={errors.supplier_id}
            required
          />
        </div>

        {/* Quantity & Unit Price */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Quantity"
            type="number"
            placeholder="0"
            value={formData.quantity}
            onChange={(value) => setFormData({ ...formData, quantity: value })}
            error={errors.quantity}
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

        {/* Total Amount (Read-only) */}
        <Input
          label="Total Amount (Rs)"
          type="number"
          placeholder="0.00"
          value={formData.total_amount}
          disabled
        />

        {/* Date & Invoice */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={(value) => setFormData({ ...formData, date: value })}
            error={errors.date}
            required
          />
          <Input
            label="Invoice Number"
            placeholder="Invoice #"
            value={formData.invoice_number}
            onChange={(value) =>
              setFormData({ ...formData, invoice_number: value })
            }
          />
        </div>

        {/* Status */}
        <Select
          label="Status"
          value={formData.status}
          onChange={(value) => setFormData({ ...formData, status: value })}
          options={statusOptions}
          required
        />

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Notes
          </label>
          <textarea
            placeholder="Add any notes or remarks"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            rows="3"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg
              bg-white text-slate-900 placeholder-slate-400 font-sans resize-vertical
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              transition-all duration-200"
          />
        </div>

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
            {purchase ? "Update Purchase" : "Save Purchase"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default PurchaseFormModal;
