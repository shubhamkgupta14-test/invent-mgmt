import { FaChevronDown } from "react-icons/fa";

function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  error,
  className = "",
  required = false,
  disabled = false,
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
          className={`app-control w-full appearance-none rounded-xl px-4 py-2.5 pr-10 font-sans text-sm
            disabled:cursor-not-allowed
            transition-all duration-200
            ${error ? "border-[var(--destructive)] focus:ring-[var(--destructive)]/25" : ""}
            ${className}`}
        >
          <option value="">{placeholder}</option>
          {options.map((option, index) => (
            <option key={index} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <FaChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={16}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm font-medium text-rose-600">{error}</p>
      )}
    </div>
  );
}

export default Select;
