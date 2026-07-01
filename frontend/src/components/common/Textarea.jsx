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
        className={`app-control w-full rounded-xl px-4 py-2.5
          font-sans text-sm placeholder-slate-400 resize-vertical
          disabled:cursor-not-allowed
          transition-all duration-200
          ${error ? "border-[var(--destructive)] focus:ring-[var(--destructive)]/25" : ""}
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
