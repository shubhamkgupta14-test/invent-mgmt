import { useEffect, useState } from "react";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import DetailModal from "../components/common/DetailModal";
import ExportMenu from "../components/common/ExportMenu";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import SearchBar from "../components/common/SearchBar";
import SelectDropdown from "../components/common/SelectDropdown";
import SortableHeader from "../components/common/SortableHeader";
import TablePagination from "../components/common/TablePagination";
import Textarea from "../components/common/Textarea";
import MainLayout from "../layouts/MainLayout";
import { createManufacturingRecord, getManufacturingRecords } from "../api/manufacturingApi";
import { getProductOptions } from "../api/productApi";
import { getMyDetails } from "../api/userApi";
import { useToast } from "../context/useToast";
import { formatDateIST, formatMoney } from "../utils/formatters";
import { toggleSort } from "../utils/sortUtils";
import { defaultPagination, listParams, parseListResponse } from "../utils/tableQuery";

const emptyForm = {
  batch_no: "",
  sku: "",
  quantity: "",
  unit_cost: "",
  other_charges: "",
  notes: "",
};

const manufacturingExportColumns = [
  { header: "Batch No", key: "batch_no" },
  { header: "Date", value: (item) => formatDateIST(item.created_at) },
  { header: "SKU", key: "sku" },
  { header: "Product", key: "name" },
  { header: "Quantity", key: "quantity" },
  { header: "Unit Cost", key: "unit_cost" },
  { header: "Other Charges", key: "other_charges" },
  { header: "Effective Unit Cost", key: "effective_unit_cost" },
  { header: "Total Cost", key: "total_cost" },
  { header: "Status", key: "status" },
  { header: "Created By", key: "created_by" },
  { header: "Notes", key: "notes" },
];

function Manufacturing() {
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState(defaultPagination);
  const [sortConfig, setSortConfig] = useState({ field: "created_at", order: "desc" });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const { addToast } = useToast();
  const { page, limit } = pagination;

  const loadRecords = async () => {
    const response = await getManufacturingRecords(listParams({ search, sortConfig, pagination: { page, limit } }));
    const parsed = parseListResponse(response);
    setRecords(parsed.items);
    setPagination(parsed.pagination);
  };

  const loadProducts = async () => {
    if (products.length) return;
    const response = await getProductOptions();
    setProducts((response.data.data || []).filter((product) => product.is_manufactured));
  };

  useEffect(() => {
    let isActive = true;

    Promise.all([getManufacturingRecords(listParams({ search, sortConfig, pagination: { page, limit } })), getMyDetails()])
      .then(([manufacturingResponse, userResponse]) => {
        if (!isActive) return;
        const parsed = parseListResponse(manufacturingResponse);
        setRecords(parsed.items);
        setPagination(parsed.pagination);
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
  }, [addToast, limit, page, search, sortConfig]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPagination((current) => ({ ...current, page: 1 }));
  };
  const handleSort = (field) => {
    setSortConfig((current) => toggleSort(current, field));
    setPagination((current) => ({ ...current, page: 1 }));
  };
  const handlePageChange = (page) => setPagination((current) => ({ ...current, page }));
  const handleLimitChange = (limit) => setPagination((current) => ({ ...current, limit, page: 1 }));

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
        <div className="flex flex-wrap items-center justify-end gap-3">
          <ExportMenu
            rows={records}
            columns={manufacturingExportColumns}
            filename="manufacturing"
            title="Manufacturing"
          />
          {currentUser?.role !== "user" && (
            <Button variant="primary" size="md" onClick={openForm}>
              + Add Manufacturing Record
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="mb-5">
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder="Search batch, SKU, product, or total"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/70">
                  <SortableHeader label="Date" field="created_at" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Batch No" field="batch_no" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Product" field="name" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Quantity" field="quantity" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Status" field="status" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Total Cost" field="total_cost" sortConfig={sortConfig} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
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
                        Ready to Sell
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {formatMoney(record.total_cost)}
                    </td>
                  </tr>
                ))}
                {!records.length && (
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

        <TablePagination
          pagination={pagination}
          label="manufacturing records"
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          disabled={loading}
        />
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
              { label: "Status", value: "Ready to Sell" },
              { label: "Date", value: formatDateIST(selectedRecord?.created_at) },
            ],
          },
          {
            title: "Costs",
            fields: [
              { label: "Unit Cost", value: selectedRecord?.unit_cost, money: true },
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
        title="Add Manufacturing Record"
        size="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Batch Number"
              value={form.batch_no}
              onChange={(value) => updateForm("batch_no", value)}
              required
            />
            <SelectDropdown
              label="Product"
              value={form.sku}
              onChange={(value) => updateForm("sku", value)}
              placeholder="Select product"
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
              label="Unit Cost"
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

          <div className="flex flex-col items-end gap-4 border-t border-border pt-5 md:flex-row md:items-center md:justify-between">
            <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
              <span className="font-semibold">Estimated Total Cost:</span>{" "}
              <span className="font-mono">{formatMoney(calculateTotal())}</span>
            </div>
            <Button type="submit" variant="primary" loading={saving}>
              Save Manufacturing Record
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}

export default Manufacturing;
