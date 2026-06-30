import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa";

function SortableHeader({ label, field, sortConfig, onSort, className = "" }) {
  const active = sortConfig?.field === field;
  const Icon = active ? (sortConfig.order === "asc" ? FaSortUp : FaSortDown) : FaSort;

  return (
    <th
      className={`cursor-pointer select-none px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-2">
        {label}
        <Icon size={12} className={active ? "text-slate-500" : "text-slate-300"} />
      </span>
    </th>
  );
}

export default SortableHeader;
