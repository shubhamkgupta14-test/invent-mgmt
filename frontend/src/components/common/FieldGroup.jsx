function FieldGroup({ title, children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-slate-50 p-5 ${className}`}
    >
      {title && (
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.1em] text-slate-600">
          {title}
        </h3>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export default FieldGroup;
