function DashboardTable({
  title,
  badge,
  columns = [],
  data = [],
  emptyMessage = "No records found",
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-slate-50/80 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {badge !== undefined && (
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
            {badge}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-slate-50/60">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length ? (
              data.map((row, rowIndex) => (
                <tr
                  key={row.id || row.sku || rowIndex}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50/70"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="whitespace-nowrap px-5 py-3.5 text-slate-700"
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-sm text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default DashboardTable;
