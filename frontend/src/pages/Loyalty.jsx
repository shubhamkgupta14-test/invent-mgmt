import { useCallback, useEffect, useMemo, useState } from "react";
import { FaBan, FaCheckCircle, FaPlus, FaSearch, FaSyncAlt, FaTicketAlt } from "react-icons/fa";
import {
  addLoyaltyOrder,
  cancelLoyalty,
  getLoyaltyConfig,
  getLoyaltyRecords,
  redeemLoyalty,
} from "../api/loyaltyApi";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import Select from "../components/common/Select";
import TablePagination from "../components/common/TablePagination";
import Textarea from "../components/common/Textarea";
import { useToast } from "../context/useToast";
import MainLayout from "../layouts/MainLayout";
import { formatDateTimeIST, formatMoney } from "../utils/formatters";

const emptyOrderForm = {
  email: "",
  ref_no: "",
  order_id: "",
  notes: "",
};

const emptyRedeemForm = {
  ref_no: "",
  email: "",
  order_id: "",
  notes: "",
};

const emptyCancelForm = {
  ref_no: "",
  email: "",
  reason: "",
};

const defaultFilters = { search: "", status: "", page: 1, limit: 10 };

const statusOptions = [
  { label: "Pending", value: "PENDING" },
  { label: "Eligible", value: "ELIGIBLE" },
  { label: "Redeemed", value: "REDEEMED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const statusClasses = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  ELIGIBLE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REDEEMED: "bg-sky-50 text-sky-700 ring-sky-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
};

const orderStatusClasses = {
  QUALIFIED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DISQUALIFIED: "bg-rose-50 text-rose-700 ring-rose-200",
  REDEEM_ORDER: "bg-indigo-50 text-indigo-700 ring-indigo-200",
};

function StatusBadge({ status, order = false }) {
  const classes = order ? orderStatusClasses : statusClasses;
  return (
    <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase leading-4 ring-1 ${classes[status] || "bg-slate-100 text-slate-700 ring-slate-200"}`}>
      {String(status || "-").replaceAll("_", " ")}
    </span>
  );
}

function latestNote(record) {
  const notes = record?.notes || [];
  return notes[notes.length - 1]?.message || "No loyalty activity yet.";
}

function stopAndRun(event, callback) {
  event.stopPropagation();
  callback();
}

function formatOptionalMoney(value) {
  return value === null || value === undefined || value === "" ? "-" : formatMoney(value);
}

function Loyalty() {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [config, setConfig] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);
  const [redeemForm, setRedeemForm] = useState(emptyRedeemForm);
  const [cancelForm, setCancelForm] = useState(emptyCancelForm);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const { addToast } = useToast();

  const loadRecords = useCallback(async (nextFilters = filters, showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const response = await getLoyaltyRecords(nextFilters);
      setRecords(response.data.data || []);
      setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load loyalty records", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, filters]);

  useEffect(() => {
    let isActive = true;

    Promise.all([
      getLoyaltyConfig(),
      getLoyaltyRecords(defaultFilters),
    ])
      .then(([configResponse, recordsResponse]) => {
        if (!isActive) return;
        setConfig(configResponse.data.data);
        setRecords(recordsResponse.data.data || []);
        setPagination(recordsResponse.data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
      })
      .catch((error) => {
        addToast(error.response?.data?.message || "Failed to load loyalty data", "error");
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [addToast]);

  const stats = useMemo(() => ({
    pending: records.filter((record) => record.status === "PENDING").length,
    eligible: records.filter((record) => record.status === "ELIGIBLE").length,
    redeemed: records.filter((record) => record.status === "REDEEMED").length,
  }), [records]);

  const updateFilters = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    loadRecords(filters, true);
  };

  const handlePageChange = (page) => {
    const nextFilters = { ...filters, page };
    setFilters(nextFilters);
    loadRecords(nextFilters, true);
  };

  const handleLimitChange = (limit) => {
    const nextFilters = { ...filters, limit, page: 1 };
    setFilters(nextFilters);
    loadRecords(nextFilters, true);
  };

  const handleAddOrder = async (event) => {
    event.preventDefault();
    try {
      setSavingOrder(true);
      await addLoyaltyOrder({
        email: orderForm.email || undefined,
        ref_no: orderForm.ref_no || undefined,
        order_id: orderForm.order_id,
        notes: orderForm.notes || undefined,
      });
      setOrderForm(emptyOrderForm);
      setAddOpen(false);
      addToast("Loyalty purchase added successfully", "success");
      await loadRecords({ ...filters, page: 1 }, true);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to add loyalty purchase", "error");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleRedeem = async (event) => {
    event.preventDefault();
    try {
      setRedeeming(true);
      const response = await redeemLoyalty({
        ref_no: redeemForm.ref_no || undefined,
        email: redeemForm.email || undefined,
        order_id: redeemForm.order_id,
        notes: redeemForm.notes || undefined,
      });
      const redeemedAmount = response.data.data?.redeemed_amount;
      setRedeemForm(emptyRedeemForm);
      setRedeemOpen(false);
      addToast(
        redeemedAmount === null || redeemedAmount === undefined
          ? "Loyalty offer redeemed successfully"
          : `${formatMoney(redeemedAmount)} amount redeemed`,
        "success",
      );
      await loadRecords(filters, true);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to redeem loyalty offer", "error");
    } finally {
      setRedeeming(false);
    }
  };

  const openRedeem = (record) => {
    setRedeemForm({
      ref_no: record.ref_no || "",
      email: record.email || "",
      order_id: "",
      notes: "",
    });
    setRedeemOpen(true);
  };

  const openCancel = (record) => {
    setCancelForm({
      ref_no: record.ref_no || "",
      email: record.email || "",
      reason: "",
    });
    setCancelOpen(true);
  };

  const handleCancel = async (event) => {
    event.preventDefault();
    try {
      setCancelling(true);
      await cancelLoyalty(cancelForm);
      setCancelOpen(false);
      setCancelForm(emptyCancelForm);
      addToast("Loyalty offer cancelled successfully", "success");
      await loadRecords(filters, true);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to cancel loyalty offer", "error");
    } finally {
      setCancelling(false);
    }
  };

  if (loading && !records.length) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading loyalty records..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Loyalty Program</h1>
            <p className="mt-1 text-slate-600">
              Link customer purchases, track eligibility, and redeem loyalty discounts.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" icon={FaSyncAlt} onClick={() => loadRecords(filters, true)}>
              Refresh
            </Button>
            <Button type="button" icon={FaPlus} onClick={() => setAddOpen(true)}>
              Add Loyalty
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <p className="text-xs font-semibold uppercase text-slate-500">Required Orders</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{config?.required_order_count || 5}</p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase text-slate-500">Pending</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.pending}</p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase text-slate-500">Eligible</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.eligible}</p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase text-slate-500">Discount</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {config?.discount_value || 0}{config?.discount_type === "PERCENTAGE" ? "%" : " flat"}
            </p>
          </Card>
        </div>

        <Card>
          <form onSubmit={applyFilters} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
            <Input
              label="Search"
              value={filters.search}
              onChange={(value) => updateFilters("search", value)}
              placeholder="Email, ref no, order id"
              icon={FaSearch}
            />
            <Select
              label="Status"
              value={filters.status}
              onChange={(value) => updateFilters("status", value)}
              options={statusOptions}
              placeholder="All statuses"
            />
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                Apply
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">Ref no</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">Email</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">Status</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">Qualified</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">Disqualified</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">Redeemed Order</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">Updated</th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {records.map((record) => (
                  <tr
                    key={record.loyalty_id}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => setSelectedRecord(record)}
                  >
                    <td className="px-5 py-4 text-sm font-bold text-slate-900">{record.ref_no}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{record.email}</td>
                    <td className="px-5 py-4"><StatusBadge status={record.status} /></td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                      {record.qualified_order_count}/{record.required_order_count}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                      {record.disqualified_order_count}/{record.max_disqualified_orders}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">{record.redeemed_order_id || "-"}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{formatDateTimeIST(record.updated_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-[var(--link)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--link-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                          title="Redeem"
                          aria-label="Redeem loyalty offer"
                          onClick={(event) => stopAndRun(event, () => openRedeem(record))}
                          disabled={record.status !== "ELIGIBLE"}
                        >
                          <FaTicketAlt size={16} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-[var(--destructive)] transition-colors hover:bg-rose-50 hover:text-[var(--destructive-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                          title="Cancel"
                          aria-label="Cancel loyalty offer"
                          onClick={(event) => stopAndRun(event, () => openCancel(record))}
                          disabled={["REDEEMED", "CANCELLED"].includes(record.status)}
                        >
                          <FaBan size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!records.length && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-500">
                      No loyalty records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border pt-4">
            <TablePagination
              pagination={pagination}
              label="loyalty records"
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              disabled={loading}
            />
          </div>
        </Card>
      </div>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Loyalty Purchase" size="2xl">
        <form onSubmit={handleAddOrder} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Customer email"
              type="email"
              value={orderForm.email}
              onChange={(value) => setOrderForm((current) => ({ ...current, email: value }))}
              placeholder="Required for new loyalty"
            />
            <Input
              label="Ref no"
              value={orderForm.ref_no}
              onChange={(value) => setOrderForm((current) => ({ ...current, ref_no: value }))}
              placeholder="Existing loyalty ref"
            />
          </div>
          <Input
            label="Order ID"
            value={orderForm.order_id}
            onChange={(value) => setOrderForm((current) => ({ ...current, order_id: value }))}
            required
          />
          <Textarea
            label="Notes"
            value={orderForm.notes}
            onChange={(value) => setOrderForm((current) => ({ ...current, notes: value }))}
            rows={2}
          />
          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)} disabled={savingOrder}>
              Close
            </Button>
            <Button type="submit" icon={FaPlus} loading={savingOrder}>
              Add Purchase
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={redeemOpen} onClose={() => setRedeemOpen(false)} title="Redeem Loyalty Offer" size="2xl">
        <form onSubmit={handleRedeem} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Ref no"
              value={redeemForm.ref_no}
              onChange={(value) => setRedeemForm((current) => ({ ...current, ref_no: value }))}
            />
            <Input
              label="Email"
              type="email"
              value={redeemForm.email}
              onChange={(value) => setRedeemForm((current) => ({ ...current, email: value }))}
            />
          </div>
          <Input
            label="Redeem order ID"
            value={redeemForm.order_id}
            onChange={(value) => setRedeemForm((current) => ({ ...current, order_id: value }))}
            required
          />
          <div className="rounded-lg border border-border bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase text-slate-500">Cashback amount</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {config?.discount_value || 0}% of the redeem sale, max {formatMoney(config?.max_redeem_amount || 150)}
            </p>
          </div>
          <Textarea
            label="Notes"
            value={redeemForm.notes}
            onChange={(value) => setRedeemForm((current) => ({ ...current, notes: value }))}
            rows={2}
          />
          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Button type="button" variant="ghost" onClick={() => setRedeemOpen(false)} disabled={redeeming}>
              Close
            </Button>
            <Button type="submit" icon={FaTicketAlt} loading={redeeming}>
              Redeem
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title={selectedRecord?.ref_no || "Loyalty Details"}
        size="6xl"
      >
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Email</p>
              <p className="mt-1 break-all text-sm font-semibold text-slate-900">{selectedRecord?.email || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Status</p>
              <p className="mt-1"><StatusBadge status={selectedRecord?.status} /></p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Latest note</p>
              <p className="mt-1 text-sm text-slate-700">{latestNote(selectedRecord)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Cashback amount</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatOptionalMoney(selectedRecord?.redeemed_amount)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full divide-y divide-border text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Order ID</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Platform</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Sale</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Sale Amount</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Cashback</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Added</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {(selectedRecord?.orders || []).map((order) => (
                  <tr key={`${order.order_id}-${order.loyalty_status}`}>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{order.order_id}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.loyalty_status} order /></td>
                    <td className="px-4 py-3 text-sm text-slate-700">{order.platform || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{order.sale_status || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatOptionalMoney(order.sale_amount)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      {formatOptionalMoney(order.redeemed_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDateTimeIST(order.added_at)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{order.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full divide-y divide-border text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Note</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">By</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {(selectedRecord?.notes || []).slice().reverse().map((note, index) => (
                  <tr key={`${note.created_at}-${index}`}>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">{note.message}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{note.created_by || "system"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDateTimeIST(note.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <Modal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel Loyalty Offer">
        <form onSubmit={handleCancel} className="space-y-4">
          <Input
            label="Ref no"
            value={cancelForm.ref_no}
            onChange={(value) => setCancelForm((current) => ({ ...current, ref_no: value }))}
            required
          />
          <Textarea
            label="Reason"
            value={cancelForm.reason}
            onChange={(value) => setCancelForm((current) => ({ ...current, reason: value }))}
            required
          />
          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Button type="button" variant="ghost" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              Close
            </Button>
            <Button type="submit" variant="danger" icon={FaCheckCircle} loading={cancelling}>
              Confirm Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}

export default Loyalty;
