import { useState, useEffect } from "react";
import { FaCheckCircle } from "react-icons/fa";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Select from "../common/Select";
import Button from "../common/Button";
import { useToast } from "../../context/ToastContext";

export function SaleFormModal({
  isOpen,
  onClose,
  onSuccess,
  sale = null,
  products = [],
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    customer_name: "",
    quantity: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    status: "Completed",
    notes: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (sale) {
      setFormData(sale);
    } else {
      setFormData({
        product_id: "",
        customer_name: "",
        quantity: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        status: "Completed",
        notes: "",
      });
    }
  }, [sale, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.product_id) newErrors.product_id = "Product is required";
    if (!formData.customer_name?.trim())
      newErrors.customer_name = "Customer name is required";
    if (!formData.quantity || formData.quantity <= 0)
      newErrors.quantity = "Valid quantity is required";
    if (!formData.amount || formData.amount <= 0)
      newErrors.amount = "Valid amount is required";
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
      // TODO: Call API to create/update sale
      // const response = sale ? await updateSale(sale.id, formData) : await createSale(formData);

      addToast(
        sale ? "Sale updated successfully" : "Sale recorded successfully",
        "success",
      );

      if (onSuccess) {
        onSuccess(formData);
      }

      onClose();
    } catch (error) {
      addToast("Failed to save sale. Please try again.", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const productOptions = products.map((p) => ({
    label: `${p.name} (${p.sku})`,
    value: p.id,
  }));

  const statusOptions = [
    { label: "Completed", value: "Completed" },
    { label: "Pending", value: "Pending" },
    { label: "Refunded", value: "Refunded" },
    { label: "Cancelled", value: "Cancelled" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={sale ? "Edit Sale" : "Record New Sale"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Product Section */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Product
          </p>
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
        </div>

        {/* Customer Section */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Customer
          </p>
          <Input
            label="Customer / Company"
            placeholder="Customer name or company"
            value={formData.customer_name}
            onChange={(value) =>
              setFormData({ ...formData, customer_name: value })
            }
            error={errors.customer_name}
            required
          />
        </div>

        {/* Quantity & Amount */}
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
            label="Total Amount"
            type="number"
            placeholder="0.00"
            value={formData.amount}
            onChange={(value) => setFormData({ ...formData, amount: value })}
            error={errors.amount}
            required
          />
        </div>

        {/* Date & Status */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={(value) => setFormData({ ...formData, date: value })}
            error={errors.date}
            required
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(value) => setFormData({ ...formData, status: value })}
            options={statusOptions}
            required
          />
        </div>

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
            {sale ? "Update Sale" : "Save Sale"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default SaleFormModal;
