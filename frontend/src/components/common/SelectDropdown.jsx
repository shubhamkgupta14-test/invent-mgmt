import { FaChevronDown } from "react-icons/fa";

function SelectDropdown({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select Option",
  valueKey = "value",
  labelKey = "label",
  className = "",
  disabled = false,
  required = false,
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-rose-600">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          className={`w-full appearance-none rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/25 ${className}`}
        >
          <option value="">{placeholder}</option>

          {options.map((option, index) => (
            <option key={index} value={option[valueKey]}>
              {option[labelKey]}
            </option>
          ))}
        </select>
        <FaChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={14}
        />
      </div>
    </div>
  );
}

export default SelectDropdown;
