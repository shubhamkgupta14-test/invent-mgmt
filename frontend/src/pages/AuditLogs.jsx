import { useCallback, useEffect, useMemo, useState } from "react";
import { FaFilter, FaSyncAlt } from "react-icons/fa";
import { getAuditLogs } from "../api/auditApi";
import { getMyDetails } from "../api/userApi";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import RoleBadge from "../components/common/RoleBadge";
import Select from "../components/common/Select";
import SortableHeader from "../components/common/SortableHeader";
import TablePagination from "../components/common/TablePagination";
import { useToast } from "../context/useToast";
import MainLayout from "../layouts/MainLayout";
import { toggleSort } from "../utils/sortUtils";
import { defaultPagination, parseListResponse } from "../utils/tableQuery";

const moduleOptions = [
  { label: "All modules", value: "" },
  { label: "Stock", value: "STOCK" },
  { label: "Purchase", value: "PURCHASE" },
  { label: "Sales", value: "SALES" },
  { label: "Manufacturing", value: "MANUFACTURING" },
  { label: "Loyalty", value: "LOYALTY" },
];

const eventOptions = [
  { label: "All events", value: "" },
  { label: "Created", value: "CREATED" },
  { label: "Updated", value: "UPDATED" },
  { label: "Deleted", value: "DELETED" },
  { label: "Stock Increased", value: "STOCK_INCREASED" },
  { label: "Stock Decreased", value: "STOCK_DECREASED" },
  { label: "Stock Adjusted", value: "STOCK_ADJUSTED" },
];

const emptyFilters = {
  module_name: "",
  event_type: "",
  reference_id: "",
  sku: "",
};

const moduleBadgeClasses = {
  STOCK: "bg-sky-100 text-sky-700 border border-sky-200",
  PURCHASE: "bg-amber-100 text-amber-700 border border-amber-200",
  SALES: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  MANUFACTURING: "bg-violet-100 text-violet-700 border border-violet-200",
  LOYALTY: "bg-pink-100 text-pink-700 border border-pink-200",
};

const eventBadgeClasses = {
  CREATED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  UPDATED: "bg-sky-50 text-sky-700 border border-sky-200",
  DELETED: "bg-rose-50 text-rose-700 border border-rose-200",
  STOCK_INCREASED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  STOCK_DECREASED: "bg-amber-50 text-amber-700 border border-amber-200",
  STOCK_ADJUSTED: "bg-violet-50 text-violet-700 border border-violet-200",
};

function formatText(value) {
  return String(value || "NA").replaceAll("_", " ");
}

function formatJson(value) {
  if (!value || value === "NA") return "NA";
  return JSON.stringify(value, null, 2);
}

function formatDateTimeIST(value) {
  if (!value) return "-";

  const normalizedValue = /[zZ]|[+-]\d{2}:\d{2}$/.test(value)
    ? value
    : `${value}Z`;
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

function moduleBadgeClass(moduleName) {
  return moduleBadgeClasses[moduleName] || "bg-slate-100 text-slate-700 border border-slate-200";
}

function eventBadgeClass(eventType) {
  return eventBadgeClasses[eventType] || "bg-slate-100 text-slate-700 border border-slate-200";
}

function ActorCell({ actor, role }) {
  if (!actor) return <span className="text-slate-500">-</span>;

  const actorRole = String(actor).toLowerCase() === "system" ? "system" : role;

  return actorRole ? (
    <RoleBadge role={actorRole} size="sm">{actor}</RoleBadge>
  ) : (
    <span className="font-semibold text-slate-900">{actor}</span>
  );
}

function AuditLogs() {
  const [currentUser, setCurrentUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(defaultPagination);
  const [sortConfig, setSortConfig] = useState({ field: "created_at", order: "desc" });
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const { addToast } = useToast();

  const loadLogs = useCallback(async (
    nextFilters = emptyFilters,
    showInlineLoading = false,
    nextPagination = defaultPagination,
    nextSort = { field: "created_at", order: "desc" },
  ) => {
    try {
      if (showInlineLoading) setFiltering(true);
      const response = await getAuditLogs({
        ...nextFilters,
        sort_by: nextSort.field,
        order: nextSort.order,
        page: nextPagination.page,
        limit: nextPagination.limit,
      });
      const parsed = parseListResponse(response);
      setLogs(parsed.items);
      setPagination(parsed.pagination);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load audit logs", "error");
    } finally {
      setFiltering(false);
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    let isActive = true;

    getMyDetails()
      .then(async (response) => {
        if (!isActive) return;
        const user = response.data.data;
        setCurrentUser(user);

        if (user?.role === "superadmin") {
          await loadLogs(
            emptyFilters,
            false,
            defaultPagination,
            { field: "created_at", order: "desc" },
          );
        } else {
          setLoading(false);
        }
      })
      .catch((error) => {
        addToast(error.response?.data?.message || "Failed to load user details", "error");
        setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [addToast, loadLogs]);

  const stats = useMemo(() => {
    const modules = new Set(logs.map((log) => log.module_name).filter(Boolean));
    const users = new Set(logs.map((log) => log.performed_by).filter(Boolean));

    return {
      total: logs.length,
      modules: modules.size,
      users: users.size,
    };
  }, [logs]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    loadLogs(filters, true, { ...pagination, page: 1 }, sortConfig);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    loadLogs(emptyFilters, true, { ...pagination, page: 1 }, sortConfig);
  };

  const handleSort = (field) => {
    const nextSort = toggleSort(sortConfig, field);
    const nextPagination = { ...pagination, page: 1 };
    setSortConfig(nextSort);
    setPagination(nextPagination);
    loadLogs(filters, true, nextPagination, nextSort);
  };
  const handlePageChange = (page) => {
    const nextPagination = { ...pagination, page };
    setPagination(nextPagination);
    loadLogs(filters, true, nextPagination, sortConfig);
  };
  const handleLimitChange = (limit) => {
    const nextPagination = { ...pagination, limit, page: 1 };
    setPagination(nextPagination);
    loadLogs(filters, true, nextPagination, sortConfig);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading audit logs..." />
        </div>
      </MainLayout>
    );
  }

  if (currentUser?.role !== "superadmin") {
    return (
      <MainLayout>
        <Card>
          <p className="text-sm font-medium text-slate-700">
            Only Super Admin users can access audit logs.
          </p>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Activity Audit Trail
            </h1>
            <p className="mt-1 text-slate-600">
              Review system activity across stock, purchases, and sales.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            icon={FaSyncAlt}
            loading={filtering}
            onClick={() => loadLogs(filters, true, pagination, sortConfig)}
            className="self-end"
          >
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-xs font-semibold uppercase text-slate-500">Logs</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase text-slate-500">Modules</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.modules}</p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase text-slate-500">Actors</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.users}</p>
          </Card>
        </div>

        <Card>
          <div className="mb-4 flex justify-end md:hidden">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={FaFilter}
              onClick={() => setFiltersOpen((current) => !current)}
            >
              {filtersOpen ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
          <form
            onSubmit={applyFilters}
            className={`${filtersOpen ? "grid" : "hidden"} gap-4 md:grid lg:grid-cols-6`}
          >
            <Select
              label="Module"
              value={filters.module_name}
              onChange={(value) => updateFilter("module_name", value)}
              options={moduleOptions}
            />
            <Select
              label="Event"
              value={filters.event_type}
              onChange={(value) => updateFilter("event_type", value)}
              options={eventOptions}
            />
            <Input
              label="Reference"
              value={filters.reference_id}
              onChange={(value) => updateFilter("reference_id", value)}
              placeholder="Invoice/ref id"
            />
            <Input
              label="SKU"
              value={filters.sku}
              onChange={(value) => updateFilter("sku", value)}
              placeholder="SKU"
            />
            <div className="flex items-end">
              <Button type="submit" variant="primary" loading={filtering}>
                Apply
              </Button>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="secondary"
                className="border-slate-300 bg-slate-200 text-slate-800 hover:bg-slate-300"
                onClick={clearFilters}
              >
                Clear
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <div className="overflow-hidden rounded-2xl border border-border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/70">
                    <SortableHeader label="Time" field="created_at" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Module" field="module_name" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Event" field="event_type" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Reference" field="reference_id" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="SKU" field="sku" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Actor" field="performed_by" sortConfig={sortConfig} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.audit_id}
                      onClick={() => setSelectedLog(log)}
                      className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                        {formatDateTimeIST(log.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${moduleBadgeClass(log.module_name)}`}
                        >
                          {formatText(log.module_name)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${eventBadgeClass(log.event_type)}`}>
                          {formatText(log.event_type)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {log.reference_id || "-"}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {log.sku || "-"}
                      </td>
                      <td className="px-5 py-4">
                        <ActorCell actor={log.performed_by} role={log.actor_role} />
                      </td>
                    </tr>
                  ))}
                  {!logs.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-8 text-center text-sm text-slate-500"
                      >
                        No audit logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <TablePagination
            pagination={pagination}
            label="audit logs"
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            disabled={filtering}
          />
        </Card>
      </div>

      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Audit Details"
        size="2xl"
      >
        <div className="space-y-5">
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Module</p>
              <p
                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${moduleBadgeClass(selectedLog?.module_name)}`}
              >
                {formatText(selectedLog?.module_name)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Event</p>
              <p className="font-semibold text-slate-900">
                {formatText(selectedLog?.event_type)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Reference
              </p>
              <p className="font-semibold text-slate-900">
                {selectedLog?.reference_id || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Actor</p>
              <div className="mt-1">
                <ActorCell actor={selectedLog?.performed_by} role={selectedLog?.actor_role} />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Time</p>
              <p className="font-semibold text-slate-900">
                {formatDateTimeIST(selectedLog?.created_at)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-rose-700">
                Old Data
              </p>
              <pre className="max-h-80 overflow-auto rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs leading-5 text-rose-950">
                {formatJson(selectedLog?.old_data)}
              </pre>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-emerald-700">
                New Data
              </p>
              <pre className="max-h-80 overflow-auto rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-950">
                {formatJson(selectedLog?.new_data)}
              </pre>
            </div>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}

export default AuditLogs;
