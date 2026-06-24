function DashboardCard({ title, value, bgColor }) {
  return (
    <div
      className={`
        ${bgColor}
        p-5
        rounded-xl
        shadow-sm
        border
      `}
    >
      <h3 className="text-sm font-medium">{title}</h3>

      <p className="text-3xl font-bold mt-4">{value}</p>
    </div>
  );
}

export default DashboardCard;
