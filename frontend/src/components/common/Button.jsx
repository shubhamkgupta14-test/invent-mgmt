import { FaSpinner } from "react-icons/fa";

function Button({
  type = "button",
  onClick,
  children,
  className = "",
  variant = "primary",
  size = "md",
  icon: Icon,
  loading = false,
  disabled = false,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 font-sans disabled:opacity-60 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-[var(--primary)] text-white hover:bg-indigo-700 active:scale-95 shadow-sm hover:shadow-md",
    secondary:
      "border border-border bg-white text-slate-900 hover:bg-slate-50 active:scale-95 shadow-sm",
    danger:
      "bg-destructive text-destructive-foreground hover:bg-rose-700 active:scale-95 shadow-sm hover:shadow-md",
    success:
      "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-sm hover:shadow-md",
    ghost: "text-slate-700 hover:bg-slate-100 active:scale-95",
  };

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-base",
    xl: "px-6 py-3.5 text-base",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <FaSpinner className="animate-spin" />}
      {Icon && !loading && <Icon size={18} />}
      {children}
    </button>
  );
}

export default Button;
