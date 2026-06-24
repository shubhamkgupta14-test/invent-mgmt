function DashboardTable({ title, columns, data }) {
  if (!data?.length) {
    return (
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="text-xl font-bold mb-4">{title}</h2>

        <p>No {title.toLowerCase()} found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h2 className="text-xl font-bold mb-4">{title}</h2>

      <table className="w-full">
        <thead>
          <tr className="border-b">
            {columns.map((column) => (
              <th key={column} className="text-left py-2">
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, index) => (
            <tr key={index} className="border-b">
              {Object.values(row).map((value, i) => (
                <td key={i} className="py-3">
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DashboardTable;
