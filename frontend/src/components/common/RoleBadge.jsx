const roleLabels = {
  superadmin: "Super Admin",
  admin: "Admin",
  user: "User",
  system: "System",
};

const roleStyles = {
  light: {
    superadmin: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
    admin: "bg-sky-50 text-sky-700 ring-sky-200",
    user: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    system: "bg-rose-50 text-rose-700 ring-rose-200",
    fallback: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  dark: {
    superadmin: "bg-fuchsia-500/20 text-fuchsia-200 ring-fuchsia-400/30",
    admin: "bg-sky-500/20 text-sky-200 ring-sky-400/30",
    user: "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30",
    system: "bg-rose-500/20 text-rose-200 ring-rose-400/30",
    fallback: "bg-slate-500/20 text-slate-200 ring-slate-400/30",
  },
};

const sizes = {
  xs: "px-1.5 py-px text-[10px]",
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
};

function getRoleKey(role) {
  return String(role || "").toLowerCase();
}

function getRoleLabel(role) {
  const roleKey = getRoleKey(role);
  return roleLabels[roleKey] || role || "User";
}

function RoleBadge({ role, tone = "light", size = "sm", className = "", children }) {
  const roleKey = getRoleKey(role);
  const palette = roleStyles[tone] || roleStyles.light;
  const colorClass = palette[roleKey] || palette.fallback;

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ring-1 ${colorClass} ${
        sizes[size] || sizes.sm
      } ${className}`}
    >
      {children || getRoleLabel(role)}
    </span>
  );
}

export default RoleBadge;
