function Textarea({
  label,
  value,
  onChange,
  placeholder = "",
  error,
  className = "",
  required = false,
  disabled = false,
  rows = 4,
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
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`w-full rounded-lg border border-[var(--border)] bg-white px-4 py-2.5
          font-sans text-sm text-slate-900 placeholder-slate-400 shadow-sm resize-vertical
          focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/25
          disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
          transition-all duration-200
          ${error ? "border-rose-500 focus:ring-rose-500" : ""}
          ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-rose-600 font-medium">{error}</p>
      )}
    </div>
  );
}

export default Textarea;
