function Card({ title, children, className = "" }) {
  return (
    <section
      className={`rounded-lg border border-border bg-card p-5 shadow-sm ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-xl font-semibold text-foreground">{title}</h2>
      )}
      {children}
    </section>
  );
}

export default Card;
