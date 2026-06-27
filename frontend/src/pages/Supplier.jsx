import { useEffect, useState } from "react";
import ActionButtons from "../components/common/ActionButtons";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import DetailModal from "../components/common/DetailModal";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import SearchBar from "../components/common/SearchBar";
import Textarea from "../components/common/Textarea";
import { addSupplier, getSuppliers, updateSupplier } from "../api/supplierApi";
import { getMyDetails } from "../api/userApi";
import { useToast } from "../context/ToastContext";
import MainLayout from "../layouts/MainLayout";

const defaultSupplier = {
  name: "",
  email: "",
  phone: "",
  address: "",
  gst_number: "",
  contact_person: "",
};

function SupplierForm({ supplier, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(() => ({
    ...defaultSupplier,
    ...(supplier || {}),
  }));

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Name"
          value={form.name || ""}
          onChange={(value) => updateForm("name", value)}
          required
        />
        <Input
          label="Contact Person"
          value={form.contact_person || ""}
          onChange={(value) => updateForm("contact_person", value)}
          required
        />
        <Input
          label="Email"
          type="email"
          value={form.email || ""}
          onChange={(value) => updateForm("email", value)}
        />
        <Input
          label="Phone"
          value={form.phone || ""}
          onChange={(value) => updateForm("phone", value)}
          maxLength={10}
        />
        <Input
          label="GST Number"
          value={form.gst_number || ""}
          onChange={(value) => updateForm("gst_number", value)}
          maxLength={15}
        />
      </div>

      <Textarea
        label="Address"
        value={form.address || ""}
        onChange={(value) => updateForm("address", value)}
        rows={3}
      />

      <div className="flex justify-end gap-3 border-t border-border pt-5">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          {supplier ? "Update Supplier" : "Add Supplier"}
        </Button>
      </div>
    </form>
  );
}

function SupplierTable({ suppliers, canEdit, onView, onEdit }) {
  if (!suppliers.length) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5 text-center text-sm text-slate-500">
        No suppliers found.
      </div>
    );
  }

  const hasActions = canEdit;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/70">
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Supplier
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Contact
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Phone
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Email
              </th>
              {hasActions && (
                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr
                key={supplier.supplier_id}
                onClick={() => onView(supplier)}
                className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-900">{supplier.name}</p>
                  <p className="text-xs text-slate-500">{supplier.supplier_id}</p>
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {supplier.contact_person || "-"}
                </td>
                <td className="px-5 py-4 text-slate-700">{supplier.phone || "-"}</td>
                <td className="px-5 py-4 text-slate-700">{supplier.email || "-"}</td>
                {hasActions && (
                  <td
                    className="px-5 py-4"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <ActionButtons
                      onEdit={
                        supplier.is_active
                          ? () => onEdit(supplier)
                          : undefined
                      }
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Supplier() {
  const [suppliers, setSuppliers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const { addToast } = useToast();

  const canMutateSuppliers = ["admin", "superadmin"].includes(currentUser?.role);

  const loadSuppliers = async () => {
    const response = await getSuppliers();
    setSuppliers(response.data.data || []);
  };

  useEffect(() => {
    let isActive = true;

    Promise.all([getSuppliers(), getMyDetails()])
      .then(([suppliersResponse, userResponse]) => {
        if (!isActive) return;
        setSuppliers(suppliersResponse.data.data || []);
        setCurrentUser(userResponse.data.data);
      })
      .catch((error) => {
        addToast(error.response?.data?.message || "Failed to load suppliers", "error");
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [addToast]);

  const filteredSuppliers = suppliers.filter((supplier) => {
    const value = search.toLowerCase();
    return (
      supplier.name?.toLowerCase().includes(value) ||
      supplier.supplier_id?.toLowerCase().includes(value) ||
      supplier.contact_person?.toLowerCase().includes(value) ||
      supplier.phone?.includes(search) ||
      supplier.gst_number?.toLowerCase().includes(value)
    );
  });

  const openAdd = () => {
    setEditingSupplier(null);
    setFormOpen(true);
  };

  const openEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormOpen(true);
  };

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);
      const sanitized = { ...payload };
      delete sanitized.id;
      delete sanitized.supplier_id;
      delete sanitized.created_at;
      delete sanitized.updated_at;

      if (editingSupplier) {
        await updateSupplier(editingSupplier.supplier_id, sanitized);
        addToast("Supplier updated successfully", "success");
      } else {
        await addSupplier(sanitized);
        addToast("Supplier added successfully", "success");
      }

      setFormOpen(false);
      setEditingSupplier(null);
      await loadSuppliers();
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to save supplier", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading suppliers..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Suppliers</h1>
          <p className="mt-1 text-slate-600">
            Manage supplier contacts and business details.
          </p>
        </div>
        {canMutateSuppliers && (
          <Button variant="primary" size="md" onClick={openAdd}>
            + Add Supplier
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-5">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search supplier, contact, or phone"
          />
        </div>

        <SupplierTable
          suppliers={filteredSuppliers}
          canEdit={canMutateSuppliers}
          onView={setSelectedSupplier}
          onEdit={openEdit}
        />

        <div className="mt-6 rounded-2xl border border-border bg-slate-50 p-4 text-sm text-slate-700">
          Showing <span className="font-semibold">{filteredSuppliers.length}</span>{" "}
          suppliers.
        </div>
      </Card>

      <DetailModal
        isOpen={Boolean(selectedSupplier)}
        onClose={() => setSelectedSupplier(null)}
        title={selectedSupplier?.name || "Supplier Details"}
        sections={[
          {
            title: "Supplier",
            fields: [
              { label: "Supplier ID", value: selectedSupplier?.supplier_id },
              { label: "Name", value: selectedSupplier?.name },
              { label: "Contact Person", value: selectedSupplier?.contact_person },
              { label: "Email", value: selectedSupplier?.email },
              { label: "Phone", value: selectedSupplier?.phone },
              { label: "GST Number", value: selectedSupplier?.gst_number },
              {
                label: "Status",
                value: selectedSupplier?.is_active ? "Active" : "Inactive",
              },
            ],
          },
          {
            title: "Address",
            fields: [{ label: "Address", value: selectedSupplier?.address }],
          },
        ]}
      />

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingSupplier ? "Edit Supplier" : "Add Supplier"}
        size="2xl"
      >
        <SupplierForm
          key={editingSupplier?.supplier_id || "new"}
          supplier={editingSupplier}
          loading={saving}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </MainLayout>
  );
}

export default Supplier;
