import { useCallback, useEffect, useMemo, useState } from "react";
import { FaFilter, FaPause, FaPlay, FaSyncAlt } from "react-icons/fa";
import {
  getApiLogByTraceId,
  getApiLogs,
  getApiTracingStatus,
  setApiTracingStatus,
} from "../api/apiLogApi";
import { getMyDetails } from "../api/userApi";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import Select from "../components/common/Select";
import TablePagination from "../components/common/TablePagination";
import { useToast } from "../context/useToast";
import MainLayout from "../layouts/MainLayout";
import { formatDateTimeIST } from "../utils/formatters";

const emptyFilters = {
  method: "",
  path: "",
  status_code: "",
  user: "",
  role: "",
  trace_id: "",
  min_duration_ms: "",
  success: "",
  page: 1,
  limit: 10,
};

const methodOptions = [
  { label: "All methods", value: "" },
  { label: "GET", value: "GET" },
  { label: "POST", value: "POST" },
  { label: "PUT", value: "PUT" },
  { label: "PATCH", value: "PATCH" },
  { label: "DELETE", value: "DELETE" },
];

const roleOptions = [
  { label: "All roles", value: "" },
  { label: "Super Admin", value: "superadmin" },
  { label: "Admin", value: "admin" },
  { label: "User", value: "user" },
];

const resultOptions = [
  { label: "All results", value: "" },
  { label: "Success", value: "true" },
  { label: "Failure", value: "false" },
];

function formatJson(value) {
  if (!value) return "NA";
  return JSON.stringify(value, null, 2);
}

function statusClass(statusCode) {
  if (statusCode >= 500) return "bg-rose-50 text-rose-700 ring-rose-200";
  if (statusCode >= 400) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

function statusRowClass(statusCode) {
  if (statusCode >= 500) return "border-l-rose-400 bg-rose-50/45 hover:bg-rose-50/70";
  if (statusCode >= 400) return "border-l-amber-400 bg-amber-50/45 hover:bg-amber-50/70";
  return "border-l-emerald-400 bg-emerald-50/35 hover:bg-emerald-50/60";
}

function methodClass(method) {
  const classes = {
    GET: "bg-sky-50 text-sky-700 ring-sky-200",
    POST: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    PUT: "bg-amber-50 text-amber-700 ring-amber-200",
    PATCH: "bg-violet-50 text-violet-700 ring-violet-200",
    DELETE: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return classes[method] || "bg-slate-100 text-slate-700 ring-slate-200";
}

function ApiLogs() {
  const [currentUser, setCurrentUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tracingEnabled, setTracingEnabled] = useState(true);
  const [updatingTracing, setUpdatingTracing] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { addToast } = useToast();

  const buildParams = useCallback((nextFilters) => {
    const params = { ...nextFilters };
    if (params.status_code) params.status_code = Number(params.status_code);
    if (params.min_duration_ms) params.min_duration_ms = Number(params.min_duration_ms);
    if (params.success !== "") params.success = params.success === "true";
    return params;
  }, []);

  const loadLogs = useCallback(async (nextFilters = emptyFilters, showInlineLoading = false) => {
    try {
      if (showInlineLoading) setFiltering(true);
      const response = await getApiLogs(buildParams(nextFilters));
      const data = response.data.data || {};
      setLogs(data.items || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load API logs", "error");
    } finally {
      setFiltering(false);
      setLoading(false);
    }
  }, [addToast, buildParams]);

  useEffect(() => {
    let isActive = true;

    getMyDetails()
      .then(async (response) => {
        if (!isActive) return;
        const user = response.data.data;
        setCurrentUser(user);
        if (user?.role === "superadmin") {
          const [statusResponse] = await Promise.all([
            getApiTracingStatus(),
            loadLogs(emptyFilters),
          ]);
          setTracingEnabled(Boolean(statusResponse.data.data?.enabled));
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
    const failures = logs.filter((log) => Number(log.status_code) >= 400).length;
    const avgDuration = logs.length
      ? logs.reduce((sum, log) => sum + Number(log.duration_ms || 0), 0) / logs.length
      : 0;
    return {
      shown: logs.length,
      failures,
      avgDuration: Math.round(avgDuration),
    };
  }, [logs]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    loadLogs(filters, true);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    loadLogs(emptyFilters, true);
  };

  const goToPage = (page) => {
    const nextFilters = { ...filters, page };
    setFilters(nextFilters);
    loadLogs(nextFilters, true);
  };

  const changeLimit = (limit) => {
    const nextFilters = { ...filters, limit, page: 1 };
    setFilters(nextFilters);
    loadLogs(nextFilters, true);
  };

  const openLog = async (log) => {
    try {
      setDetailLoading(true);
      const response = await getApiLogByTraceId(log.trace_id);
      setSelectedLog(response.data.data);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load API log details", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleTracing = async () => {
    try {
      setUpdatingTracing(true);
      const response = await setApiTracingStatus(!tracingEnabled);
      const enabled = Boolean(response.data.data?.enabled);
      setTracingEnabled(enabled);
      addToast(enabled ? "API tracing resumed" : "API tracing stopped", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to update API tracing", "error");
    } finally {
      setUpdatingTracing(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading API logs..." />
        </div>
      </MainLayout>
    );
  }

  if (currentUser?.role !== "superadmin") {
    return (
      <MainLayout>
        <Card>
          <p className="text-sm font-medium text-slate-700">
            Only Super Admin users can access API logs.
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
              API Request Logs
            </h1>
            <p className="mt-1 text-slate-600">
              Monitor request timing, status codes, callers, and payload details.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              icon={tracingEnabled ? FaPause : FaPlay}
              loading={updatingTracing}
              onClick={toggleTracing}
            >
              {tracingEnabled ? "Stop Tracing" : "Resume Tracing"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={FaSyncAlt}
              loading={filtering}
              onClick={() => loadLogs(filters, true)}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-xs font-semibold uppercase text-slate-500">Showing</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.shown}</p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase text-slate-500">Failures</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.failures}</p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase text-slate-500">Average Duration</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.avgDuration} ms</p>
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
              label="Method"
              value={filters.method}
              onChange={(value) => updateFilter("method", value)}
              options={methodOptions}
            />
            <Input
              label="Path"
              value={filters.path}
              onChange={(value) => updateFilter("path", value)}
              placeholder="/sales"
            />
            <Input
              label="Status"
              type="number"
              value={filters.status_code}
              onChange={(value) => updateFilter("status_code", value)}
              placeholder="500"
            />
            <Input
              label="User"
              value={filters.user}
              onChange={(value) => updateFilter("user", value)}
              placeholder="username"
            />
            <Select
              label="Role"
              value={filters.role}
              onChange={(value) => updateFilter("role", value)}
              options={roleOptions}
            />
            <Select
              label="Result"
              value={filters.success}
              onChange={(value) => updateFilter("success", value)}
              options={resultOptions}
            />
            <Input
              label="Trace ID"
              value={filters.trace_id}
              onChange={(value) => updateFilter("trace_id", value)}
              placeholder="uuid"
            />
            <Input
              label="Min Duration"
              type="number"
              value={filters.min_duration_ms}
              onChange={(value) => updateFilter("min_duration_ms", value)}
              placeholder="1000"
            />
            <div className="flex items-end gap-3 lg:col-span-4">
              <Button type="submit" variant="primary" loading={filtering}>
                Apply
              </Button>
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
          <div className="overflow-hidden rounded-2xl border border-border bg-white font-mono shadow-sm">
            <div className="border-b border-border bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Live Request Stream
            </div>
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <button
                  key={log.trace_id}
                  type="button"
                  onClick={() => openLog(log)}
                  className={`block w-full border-l-4 px-4 py-3 text-left transition-colors ${statusRowClass(log.status_code)}`}
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs sm:flex-nowrap sm:gap-3 sm:whitespace-nowrap">
                    <span className="shrink-0 text-slate-500">
                      {formatDateTimeIST(log.created_at)}
                    </span>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-bold ring-1 ${methodClass(log.method)}`}>
                      {log.method}
                    </span>
                    <span className="min-w-0 flex-[1_1_100%] truncate text-sm font-semibold text-slate-900 sm:flex-1" title={log.path}>
                      {log.path}
                    </span>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-bold ring-1 ${statusClass(log.status_code)}`}>
                      {log.status_code || "-"}
                    </span>
                    <span className="shrink-0 font-semibold text-slate-700">
                      {log.duration_ms} ms
                    </span>
                    <span className="shrink-0 truncate text-slate-400 sm:max-w-[220px]" title={log.trace_id}>
                      {log.trace_id}
                    </span>
                  </div>
                </button>
              ))}
              {!logs.length && (
                <div className="px-5 py-8 text-center text-sm text-slate-500">
                  No API logs found.
                </div>
              )}
            </div>
          </div>

          <TablePagination
            pagination={pagination}
            label="API logs"
            onPageChange={goToPage}
            onLimitChange={changeLimit}
            disabled={filtering}
          />
        </Card>
      </div>

      <Modal
        isOpen={Boolean(selectedLog) || detailLoading}
        onClose={() => setSelectedLog(null)}
        title={selectedLog?.trace_id || "API Log Details"}
        size="6xl"
      >
        {detailLoading ? (
          <Loader fullScreen={false} message="Loading API log details..." />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 text-sm md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Request</p>
                <p className="font-semibold text-slate-900">
                  {selectedLog?.method} {selectedLog?.path}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
                <p className="font-semibold text-slate-900">{selectedLog?.status_code}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Duration</p>
                <p className="font-semibold text-slate-900">{selectedLog?.duration_ms} ms</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">User</p>
                <p className="font-semibold text-slate-900">{selectedLog?.user || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Role</p>
                <p className="font-semibold text-slate-900">{selectedLog?.role || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">IP</p>
                <p className="font-semibold text-slate-900">{selectedLog?.ip_address || "-"}</p>
              </div>
            </div>

            {selectedLog?.error_message && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
                {selectedLog.error_message}
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Request Headers</p>
                <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                  {formatJson(selectedLog?.request_headers)}
                </pre>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Query Params</p>
                <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                  {formatJson(selectedLog?.query_params)}
                </pre>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Request Body</p>
                <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                  {formatJson(selectedLog?.request_body)}
                </pre>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Response Body</p>
                <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                  {formatJson(selectedLog?.response_body)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}

export default ApiLogs;
