function Table({ columns = [], data = [], renderRow, title, className = "" }) {
  if (!data?.length) {
    return (
      <div
        className={`rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm ${className}`}
      >
        {title && (
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            {title}
          </h2>
        )}
        <p className="py-8 text-center text-slate-500">
          No records available.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-white shadow-sm ${className}`}
    >
      {title && (
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-slate-50/70">
              {columns.map((column) => (
                <th
                  key={column.key || column}
                  className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500"
                >
                  {column.label || column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {data.map((row, index) => (
              <tr
                key={index}
                className="hover:bg-slate-50/70 transition-colors duration-150"
              >
                {renderRow(row, index)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Table;
