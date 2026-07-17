import {
  FaArrowLeft,
  FaBell,
  FaClipboardList,
  FaDatabase,
  FaHome,
  FaEnvelope,
  FaServer,
  FaSignOutAlt,
  FaTools,
  FaUsers,
} from "react-icons/fa";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { logoutUser } from "../../api/authApi";
import { clearAuthState } from "../../utils/authUtils";

const items = [
  { tab: "overview", label: "Overview", icon: FaHome },
  { tab: "users", label: "User Management", icon: FaUsers },
  { tab: "notifications", label: "Notifications", icon: FaBell },
  { tab: "mailer", label: "Mailer", icon: FaEnvelope },
  { tab: "audits", label: "Audit Trail", icon: FaClipboardList },
  { tab: "api-logs", label: "API Logs", icon: FaServer },
  { tab: "maintenance", label: "Maintenance Mode", icon: FaTools },
  { tab: "cleanup", label: "Data Maintenance", icon: FaDatabase },
];

function AdminSidebar({ onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = new URLSearchParams(location.search).get("tab") || "overview";
  const portalPath = location.pathname;
  const classes = (active) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
      active ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
    }`;

  const handleLogout = async () => {
    try {
      await logoutUser();
    } finally {
      clearAuthState();
      navigate("/", { replace: true });
    }
  };

  return (
    <aside className="flex h-full flex-col bg-slate-950 px-3 py-5 text-white">
      <div className="px-3 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">Protected</p>
        <h1 className="mt-2 text-lg font-bold">Administration Portal</h1>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.tab}
            to={`${portalPath}?tab=${item.tab}`}
            onClick={onNavigate}
            className={() => classes(activeTab === item.tab)}
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <NavLink to="/dashboard" className={() => classes(false)}>
        <FaArrowLeft size={16} />
        Back to Inventory
      </NavLink>
      <button
        type="button"
        onClick={handleLogout}
        className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
      >
        <FaSignOutAlt size={16} />
        Logout
      </button>
    </aside>
  );
}

export default AdminSidebar;
