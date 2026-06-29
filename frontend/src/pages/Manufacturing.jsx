import { useEffect, useState } from "react";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import DetailModal from "../components/common/DetailModal";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import SearchBar from "../components/common/SearchBar";
import SelectDropdown from "../components/common/SelectDropdown";
import Textarea from "../components/common/Textarea";
import MainLayout from "../layouts/MainLayout";
import { createManufacturingRecord, getManufacturingRecords } from "../api/manufacturingApi";
import { getProductOptions } from "../api/productApi";
import { getMyDetails } from "../api/userApi";
import { useToast } from "../context/useToast";
import { formatDateIST, formatMoney } from "../utils/formatters";

const emptyForm = {
  batch_no: "",
  sku: "",
  quantity: "",
  unit_cost: "",
  other_charges: "",
  notes: "",
};

function Manufacturing() {
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const { addToast } = useToast();

  const loadRecords = async () => {
    const response = await getManufacturingRecords();
    setRecords(response.data.data || []);
  };

  const loadProducts = async () => {
    if (products.length) return;
    const response = await getProductOptions();
    setProducts((response.data.data || []).filter((product) => product.is_manufactured));
  };

  useEffect(() => {
    let isActive = true;

    Promise.all([getManufacturingRecords(), getMyDetails()])
      .then(([manufacturingResponse, userResponse]) => {
        if (!isActive) return;
        setRecords(manufacturingResponse.data.data || []);
        setCurrentUser(userResponse.data.data);
      })
      .catch((error) => {
        addToast(error.response?.data?.message || "Failed to load manufacturing", "error");
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [addToast]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const calculateTotal = () => {
    const quantity = Number(form.quantity || 0);
    const unitCost = Number(form.unit_cost || 0);
    const otherCharges = Number(form.other_charges || 0);
    return (quantity * unitCost) + otherCharges;
  };

  const openForm = async () => {
    try {
      await loadProducts();
      setForm(emptyForm);
      setFormOpen(true);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load products", "error");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      await createManufacturingRecord({
        ...form,
        quantity: Number(form.quantity),
        unit_cost: Number(form.unit_cost),
        other_charges: Number(form.other_charges || 0),
      });
      addToast("Manufacturing record created successfully", "success");
      setFormOpen(false);
      await loadRecords();
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to create manufacturing record", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredRecords = records.filter((record) => {
    const term = search.toLowerCase();
    return (
      record.batch_no?.toLowerCase().includes(term) ||
      record.sku?.toLowerCase().includes(term) ||
      record.name?.toLowerCase().includes(term) ||
      record.total_cost?.toString().includes(search)
    );
  });

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading manufacturing..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Manufacturing</h1>
          <p className="mt-1 text-slate-600">
            Record finished goods and add ready-to-sell stock.
          </p>
        </div>
        {currentUser?.role !== "user" && (
          <Button variant="primary" size="md" onClick={openForm}>
            + Add Manufacturing
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-5">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search batch, SKU, product, or total"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/70">
                  {["Date", "Batch No", "Product", "Qty", "Status", "Total Cost"].map((label) => (
                    <th
                      key={label}
                      className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    key={record.manufacturing_id}
                    onClick={() => setSelectedRecord(record)}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4 text-slate-700">
                      {formatDateIST(record.created_at)}
                    </td>
                    <td className="px-5 py-4 text-slate-700">{record.batch_no}</td>
                    <td className="px-5 py-4 font-medium text-slate-900">
                      <div className="max-w-[260px] truncate" title={`${record.sku} - ${record.name}`}>
                        {record.sku} - {record.name}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{record.quantity}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        Ready to sell
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {formatMoney(record.total_cost)}
                    </td>
                  </tr>
                ))}
                {!filteredRecords.length && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">
                      No manufacturing records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-slate-50 p-4 text-sm text-slate-700">
          Showing <span className="font-semibold">{filteredRecords.length}</span> manufacturing records.
        </div>
      </Card>

      <DetailModal
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title={selectedRecord?.batch_no || "Manufacturing Details"}
        size="2xl"
        sections={[
          {
            title: "Manufacturing",
            fields: [
              { label: "Batch No", value: selectedRecord?.batch_no },
              { label: "Product", value: `${selectedRecord?.sku || "-"} - ${selectedRecord?.name || "-"}` },
              { label: "Quantity", value: selectedRecord?.quantity },
              { label: "Status", value: "Ready to sell" },
              { label: "Date", value: formatDateIST(selectedRecord?.created_at) },
            ],
          },
          {
            title: "Costs",
            fields: [
              { label: "Per Item Cost", value: selectedRecord?.unit_cost, money: true },
              { label: "Other Charges", value: selectedRecord?.other_charges, money: true },
              { label: "Effective Unit Cost", value: selectedRecord?.effective_unit_cost, money: true },
              { label: "Total Cost", value: selectedRecord?.total_cost, money: true },
            ],
          },
          {
            title: "Notes",
            fields: [{ label: "Notes", value: selectedRecord?.notes || "-" }],
          },
        ]}
      />

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add Manufacturing"
        size="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Batch No"
              value={form.batch_no}
              onChange={(value) => updateForm("batch_no", value)}
              required
            />
            <SelectDropdown
              label="Item"
              value={form.sku}
              onChange={(value) => updateForm("sku", value)}
              placeholder="Select item"
              required
              options={products.map((product) => ({
                value: product.sku,
                label: `${product.sku} - ${product.name}`,
              }))}
            />
            {!products.length && (
              <p className="md:col-span-2 text-sm font-medium text-amber-700">
                No manufactured products found. Mark a product as manufactured in Inventory first.
              </p>
            )}
            <Input
              label="Quantity"
              type="number"
              value={form.quantity}
              onChange={(value) => updateForm("quantity", value)}
              required
            />
            <Input
              label="Per Item Cost"
              type="number"
              value={form.unit_cost}
              onChange={(value) => updateForm("unit_cost", value)}
              required
            />
            <Input
              label="Other Charges"
              type="number"
              value={form.other_charges}
              onChange={(value) => updateForm("other_charges", value)}
            />
          </div>

          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(value) => updateForm("notes", value)}
            rows={3}
          />

          <div className="flex flex-col gap-4 border-t border-border pt-5 md:flex-row md:items-center md:justify-between">
            <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
              <span className="font-semibold">Estimated total cost:</span>{" "}
              <span className="font-mono">{formatMoney(calculateTotal())}</span>
            </div>
            <Button type="submit" variant="primary" loading={saving}>
              Save Manufacturing
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}

export default Manufacturing;
