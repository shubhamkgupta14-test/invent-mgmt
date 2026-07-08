function Card({ title, children, className = "", id }) {
  return (
    <section
      id={id}
      className={`app-surface min-w-0 rounded-2xl bg-[var(--card)] p-5 ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-xl font-semibold text-foreground">{title}</h2>
      )}
      {children}
    </section>
  );
}

export default Card;
