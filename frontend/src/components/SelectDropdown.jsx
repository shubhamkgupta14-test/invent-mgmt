function SelectDropdown({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select Option",
  valueKey = "value",
  labelKey = "label",
  className = "",
}) {
  return (
    <div className="flex gap-2 mb-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`border p-2 ${className}`}
      >
        <option value="">{placeholder}</option>

        {options.map((option, index) => (
          <option key={index} value={option[valueKey]}>
            {option[labelKey]}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SelectDropdown;
