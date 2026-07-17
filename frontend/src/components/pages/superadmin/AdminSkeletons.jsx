const Pulse = ({ className = "" }) => (
  <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />
);

export function UserRowsSkeleton({ rows = 6 }) {
  return Array.from({ length: rows }, (_, row) => (
    <tr key={row} className="border-b border-border last:border-0" aria-hidden="true">
      {Array.from({ length: 6 }, (_, column) => (
        <td key={column} className="px-3 py-3">
          <Pulse className={`h-3.5 ${column === 5 ? "w-16" : column === 0 ? "w-24" : "w-full max-w-32"}`} />
        </td>
      ))}
    </tr>
  ));
}

export function NotificationHistorySkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading notification history">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="animate-pulse rounded-xl border border-l-4 border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3"><Pulse className="h-4 w-2/5" /><Pulse className="h-3 w-28" /><Pulse className="h-3 w-4/5" /></div>
            <div className="flex gap-2"><Pulse className="h-9 w-9 rounded-full" /><Pulse className="h-9 w-9 rounded-full" /></div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading notification history</span>
    </div>
  );
}

export function CleanupSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-white p-5 shadow-sm" role="status" aria-label="Loading data maintenance">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3"><Pulse className="h-5 w-44" /><Pulse className="h-3 w-full max-w-lg" /><Pulse className="h-3 w-32" /></div>
        <div className="flex gap-3"><Pulse className="h-10 w-36" /><Pulse className="h-10 w-28" /></div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 12 }, (_, index) => <Pulse key={index} className="h-16 w-full rounded-xl" />)}
      </div>
      <div className="mt-6 flex justify-end border-t border-slate-100 pt-5"><Pulse className="h-10 w-40" /></div>
      <span className="sr-only">Loading data maintenance</span>
    </div>
  );
}
