import Button from "./Button";
import Modal from "./Modal";

function BulkUploadResultModal({ isOpen, onClose, title, result, fallbackHeaders = [] }) {
  const headers = result?.headers || fallbackHeaders;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="6xl">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Total Rows</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900">{result?.summary?.total || 0}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Created</p>
            <p className="mt-0.5 text-lg font-bold text-emerald-800">{result?.summary?.created || 0}</p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-rose-700">Failed</p>
            <p className="mt-0.5 text-lg font-bold text-rose-800">{result?.summary?.failed || 0}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="min-w-[1100px] divide-y divide-[var(--border)] text-xs">
            <thead className="bg-[var(--surface-muted)] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2.5 py-2">Row</th>
                <th className="px-2.5 py-2">Status</th>
                <th className="px-2.5 py-2">Reason</th>
                {headers.map((header) => (
                  <th key={header} className="px-2.5 py-2">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-white">
              {(result?.rows || []).map((row) => {
                const isCreated = row.status === "created";
                return (
                  <tr key={row.row_number} className={isCreated ? "bg-emerald-50/50" : "bg-rose-50/50"}>
                    <td className="whitespace-nowrap px-2.5 py-2 font-semibold text-slate-700">{row.row_number}</td>
                    <td className="whitespace-nowrap px-2.5 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${isCreated ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200" : "bg-rose-100 text-rose-800 ring-1 ring-rose-200"}`}>
                        {isCreated ? "Created" : "Failed"}
                      </span>
                    </td>
                    <td className="min-w-48 px-2.5 py-2 font-medium text-slate-700">{row.reason || "-"}</td>
                    {headers.map((header) => (
                      <td key={`${row.row_number}-${header}`} className="min-w-28 px-2.5 py-2 text-slate-700">
                        {row.data?.[header] || "-"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t border-[var(--border)] pt-5">
          <Button type="button" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

export default BulkUploadResultModal;
