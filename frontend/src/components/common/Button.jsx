import { forwardRef } from "react";
import { FaSpinner } from "react-icons/fa";

const Button = forwardRef(function Button({
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
}, ref) {
  const baseStyles =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 font-sans disabled:cursor-not-allowed disabled:opacity-60";

  const variants = {
    primary:
      "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] active:scale-95 shadow-sm hover:shadow-md",
    secondary:
      "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] active:scale-95 shadow-sm",
    danger:
      "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[var(--destructive-hover)] active:bg-[var(--destructive-active)] active:scale-95 shadow-sm hover:shadow-md",
    success:
      "bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] active:scale-95 shadow-sm hover:shadow-md",
    ghost: "text-[var(--foreground-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] active:scale-95",
  };

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-base",
    xl: "px-6 py-3.5 text-base",
  };

  return (
    <button
      ref={ref}
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
});

export default Button;
