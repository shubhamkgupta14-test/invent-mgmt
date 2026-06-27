import { useEffect, useState } from "react";
import {
  FaBox,
  FaChartBar,
  FaShoppingCart,
  FaTruck,
  FaUndo,
  FaExchangeAlt,
  FaBoxes,
  FaUsers,
  FaSignOutAlt,
  FaTimes,
  FaUserShield,
  FaClipboardList,
} from "react-icons/fa";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { getMyDetails } from "../../api/userApi";
import { clearToken } from "../../utils/authUtils";

function Sidebar({ onNavigate, onClose }) {
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");
  const [logoMissing, setLogoMissing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let isActive = true;

    getMyDetails()
      .then((response) => {
        if (!isActive) return;

        const user = response.data.data;
        const fullName = [user.firstname, user.lastname].filter(Boolean).join(" ");

        setDisplayName(fullName || user.username || "User");
        setRole(user.role || "User");
      })
      .catch((error) => {
        console.error("Failed to load user details:", error);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleLogout = () => {
    clearToken(`${location.pathname}${location.search}${location.hash}`);
    navigate("/");
  };

  const menuItems = [
    { icon: FaChartBar, label: "Dashboard", path: "/dashboard" },
    { icon: FaBoxes, label: "Inventory", path: "/inventory" },
    { icon: FaBox, label: "Stock", path: "/stocks" },
    { icon: FaTruck, label: "Purchases", path: "/purchases" },
    { icon: FaShoppingCart, label: "Sales", path: "/sales" },
    { icon: FaUndo, label: "Return", path: "/returns" },
    { icon: FaExchangeAlt, label: "Exchange", path: "/exchanges" },
    { icon: FaUsers, label: "Suppliers", path: "/suppliers" },
  ];

  const roleBadge = {
    superadmin: "bg-violet-500/20 text-violet-200 ring-violet-400/30",
    admin: "bg-indigo-500/20 text-indigo-200 ring-indigo-400/30",
    user: "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30",
  }[role] || "bg-slate-500/20 text-slate-200 ring-slate-400/30";

  const roleLabel = {
    superadmin: "SuperAdmin",
    admin: "Admin",
    user: "User",
  }[role] || role;

  return (
    <aside className="flex h-full flex-col bg-[var(--sidebar)] text-white md:h-screen md:overflow-hidden">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-[var(--primary)] text-base font-bold text-white shadow-lg shadow-indigo-950/30">
              {!logoMissing && (
                <img
                  src="/brand-logo.png"
                  alt="HappiHome"
                  className="h-full w-full object-cover"
                  onError={() => setLogoMissing(true)}
                />
              )}
              {logoMissing && <span className="absolute">H</span>}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight">
                HappiHome Inventory
              </h1>
              <p className="text-xs text-slate-400">Inventory dashboard</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Close sidebar"
          >
            <FaTimes size={16} />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[var(--primary)] text-white shadow-lg shadow-indigo-950/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <item.icon size={18} className="flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
          {role === "superadmin" && (
            <>
              <li>
                <NavLink
                  to="/audits"
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-[var(--primary)] text-white shadow-lg shadow-indigo-950/20"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  <FaClipboardList size={18} className="flex-shrink-0" />
                  <span>Audit Logs</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/superadmin"
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-[var(--primary)] text-white shadow-lg shadow-indigo-950/20"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  <FaUserShield size={18} className="flex-shrink-0" />
                  <span>SuperAdmin</span>
                </NavLink>
              </li>
            </>
          )}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white">
            {displayName ? displayName.charAt(0).toUpperCase() : ""}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {displayName || ""}
            </p>
            {role && (
              <span
                className={`mt-1 inline-flex rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ring-1 ${roleBadge}`}
              >
                {roleLabel}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400"
        >
          <FaSignOutAlt size={15} />
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
