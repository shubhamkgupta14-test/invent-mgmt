import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaBox,
  FaChartBar,
  FaShoppingCart,
  FaTruck,
  FaUndo,
  FaExchangeAlt,
  FaBoxes,
  FaUsers,
  FaIndustry,
  FaSignOutAlt,
  FaTimes,
  FaClipboardList,
  FaServer,
  FaCalculator,
  FaBell,
  FaDatabase,
} from "react-icons/fa";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { getMyDetails } from "../../api/userApi";
import { clearToken } from "../../utils/authUtils";
import useCompanySettings from "../../hooks/useCompanySettings";
import { resolveMediaUrl } from "../../utils/media";
import RoleBadge from "./RoleBadge";

function Sidebar({ onNavigate, onClose }) {
  const [displayName, setDisplayName] = useState("");
  const [initials, setInitials] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [role, setRole] = useState("");
  const [failedLogoUrl, setFailedLogoUrl] = useState("");
  const navRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { brand } = useCompanySettings();

  const loadUser = useCallback((isActive = true) => {
    getMyDetails()
      .then((response) => {
        if (!isActive) return;

        const user = response.data.data;
        const fullName = [user.firstname, user.lastname]
          .filter(Boolean)
          .join(" ");
        const nextInitials = [user.firstname, user.lastname]
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part.charAt(0).toUpperCase())
          .join("") || (user.username || "U").charAt(0).toUpperCase();

        setDisplayName(fullName || user.username || "User");
        setInitials(nextInitials);
        setProfileImageUrl(resolveMediaUrl(user.profile_image_url));
        setRole(String(user.role || "user").toLowerCase());
      })
      .catch((error) => {
        console.error("Failed to load user details:", error);
      });
  }, []);

  useEffect(() => {
    let isActive = true;
    const handleUserChange = () => loadUser(isActive);

    loadUser(isActive);
    window.addEventListener("user:changed", handleUserChange);

    return () => {
      isActive = false;
      window.removeEventListener("user:changed", handleUserChange);
    };
  }, [loadUser]);

  useEffect(() => {
    navRef.current?.scrollTo({ top: 0 });
  }, [role]);

  const handleLogout = () => {
    clearToken(`${location.pathname}${location.search}${location.hash}`);
    navigate("/");
  };

  const menuItems = [
    { icon: FaChartBar, label: "Dashboard", path: "/dashboard" },
    { icon: FaBoxes, label: "Inventory", path: "/inventory" },
    { icon: FaBox, label: "Stock", path: "/stocks" },
    ...(role === "superadmin" || role === "admin"
      ? [
          {
            icon: FaCalculator,
            label: "Price Calculator",
            path: "/selling-price-calculator",
          },
        ]
      : []),
    { icon: FaTruck, label: "Purchases", path: "/purchases" },
    { icon: FaShoppingCart, label: "Sales", path: "/sales" },
    { icon: FaIndustry, label: "Manufacturing", path: "/manufacturing" },
    { icon: FaUndo, label: "Return", path: "/returns" },
    { icon: FaExchangeAlt, label: "Exchange", path: "/exchanges" },
    { icon: FaUsers, label: "Suppliers", path: "/suppliers" },
  ];

  const superAdminItems = [
    {
      icon: FaUsers,
      label: "User Management",
      path: "/superadmin?tab=users",
      isActive:
        location.pathname === "/superadmin" &&
        (new URLSearchParams(location.search).get("tab") === "users" ||
          !new URLSearchParams(location.search).get("tab")),
    },
    {
      icon: FaBell,
      label: "Notification Center",
      path: "/superadmin?tab=notifications",
      isActive:
        location.pathname === "/superadmin" &&
        new URLSearchParams(location.search).get("tab") === "notifications",
    },
    {
      icon: FaClipboardList,
      label: "Activity Audit Trail",
      path: "/audits",
      isActive: location.pathname === "/audits",
    },
    {
      icon: FaServer,
      label: "API Request Logs",
      path: "/api-logs",
      isActive: location.pathname === "/api-logs",
    },
    {
      icon: FaDatabase,
      label: "Data Maintenance",
      path: "/superadmin?tab=cleanup",
      isActive:
        location.pathname === "/superadmin" &&
        new URLSearchParams(location.search).get("tab") === "cleanup",
    },
  ];

  const navLinkClass = (isActive) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-[var(--primary)] text-white shadow-lg shadow-indigo-950/20"
        : "text-slate-400 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <aside className="flex h-full min-h-0 flex-col bg-[var(--sidebar)] text-white md:h-screen md:overflow-hidden">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-[var(--primary)] text-base font-bold text-white shadow-lg shadow-indigo-950/30">
              {failedLogoUrl !== brand.logoUrl && (
                <img
                  src={brand.logoUrl}
                  alt={brand.name}
                  className="h-full w-full object-cover"
                  onError={() => setFailedLogoUrl(brand.logoUrl)}
                />
              )}
              {failedLogoUrl === brand.logoUrl && <span className="absolute">{brand.initial}</span>}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight">
                {brand.name}
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

      <nav ref={navRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={onNavigate}
                className={({ isActive }) => navLinkClass(isActive)}
              >
                <item.icon size={18} className="flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
          {role === "superadmin" && (
            <li className="pt-3">
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Administration
              </div>
              <ul className="space-y-1">
                {superAdminItems.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={onNavigate}
                      className={() => navLinkClass(item.isActive)}
                    >
                      <item.icon size={18} className="flex-shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </li>
          )}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)] text-sm font-semibold text-white">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={displayName || "User"}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {displayName || ""}
            </p>
            {role && (
              <RoleBadge role={role} tone="dark" size="xs" className="mt-1 uppercase tracking-wide" />
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
