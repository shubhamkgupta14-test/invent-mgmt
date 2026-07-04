import Button from "./Button";
import { pageSummary } from "../../utils/tableQuery";

const pageSizes = import.meta.env.DEV ? [2, 5, 10] : [10, 25, 50, 100];

function TablePagination({ pagination, label, onPageChange, onLimitChange, disabled = false }) {
  const page = Number(pagination?.page || 1);
  const pages = Number(pagination?.pages || 1);
  const limit = Number(pagination?.limit || 10);
  const hasPrev = page > 1;
  const hasNext = page < pages && Number(pagination?.total || 0) > 0;

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-slate-50 p-3 text-sm text-slate-700 sm:p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center justify-between gap-3 md:flex-1">
        <div className="min-w-0 font-medium text-slate-700">{pageSummary(pagination, label)}</div>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Rows
          <select
            value={limit}
            onChange={(event) => onLimitChange?.(Number(event.target.value))}
            disabled={disabled}
            className="rounded-lg border border-border bg-white px-2 py-1.5 text-sm font-medium normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!hasPrev || disabled}
          onClick={() => onPageChange?.(page - 1)}
        >
          Previous
        </Button>
        <span className="min-w-20 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
          Page {page} of {pages}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!hasNext || disabled}
          onClick={() => onPageChange?.(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default TablePagination;
