function Input({
  type = "text",
  label,
  placeholder,
  value,
  onChange,
  error,
  className = "",
  icon: Icon,
  required = false,
  disabled = false,
  ...props
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
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon size={18} />
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`app-control w-full px-4 py-2.5 ${Icon ? "pl-10" : ""} rounded-xl
            text-sm placeholder-slate-400 font-sans
            disabled:cursor-not-allowed
            transition-all duration-200
            ${error ? "border-[var(--destructive)] focus:ring-[var(--destructive)]/25" : ""}
            ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-rose-600 font-medium">{error}</p>
      )}
    </div>
  );
}

export default Input;
