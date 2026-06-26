import { useEffect, useState } from "react";
import {
  FaBox,
  FaChartBar,
  FaShoppingCart,
  FaTruck,
  FaBoxes,
  FaUsers,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";
import { getMyDetails } from "../../api/userApi";

function Sidebar({ onNavigate }) {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const response = await getMyDetails();
      setUsername(response.data.data.username || "User");
      setRole(response.data.data.role || "User");
    } catch (error) {
      console.error("Failed to load user details:", error);
    }
  };

  const menuItems = [
    { icon: FaChartBar, label: "Dashboard", path: "/dashboard" },
    { icon: FaBoxes, label: "Inventory", path: "/inventory" },
    { icon: FaBox, label: "Stock", path: "/stocks" },
    { icon: FaTruck, label: "Purchases", path: "/purchases" },
    { icon: FaShoppingCart, label: "Sales", path: "/sales" },
    { icon: FaUsers, label: "Supplier", path: "/suppliers" },
  ];

  return (
    <aside className="flex h-full flex-col bg-[var(--sidebar)] text-white md:h-screen md:overflow-hidden">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)] text-base font-bold text-white shadow-lg shadow-indigo-950/30">
            H
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight">
              HappiHome Inventory
            </h1>
            <p className="text-xs text-slate-400">Inventory dashboard</p>
          </div>
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
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
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
        </ul>
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)] text-base font-semibold text-white">
            {username ? username.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {username || "User Name"}
            </p>
            <p className="text-xs text-slate-400">{role || "Admin"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
