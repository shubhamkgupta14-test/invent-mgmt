import { FaBox, FaChartBar, FaShoppingCart, FaTruck } from "react-icons/fa";
import { NavLink } from "react-router-dom";

function Sidebar({ onNavigate }) {
  return (
    <div className="h-full bg-white p-6 md:h-screen md:p-5">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-lg font-bold text-white">
          I
        </div>
        <div>
          <h1 className="text-2xl font-bold">InventMgmt</h1>
          <p className="text-sm text-slate-500">Inventory dashboard</p>
        </div>
      </div>

      <ul className="space-y-2">
        <li>
          <NavLink
            to="/dashboard"
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50"
              }`
            }
          >
            <FaChartBar />
            Dashboard
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/inventory"
            className={({ isActive }) =>
              `flex items-center gap-3 p-3 rounded-lg ${
                isActive ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
              }`
            }
          >
            <FaBox />
            Inventory
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/stocks"
            className={({ isActive }) =>
              `flex items-center gap-3 p-3 rounded-lg ${
                isActive ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
              }`
            }
          >
            <FaBox />
            Stocks
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/purchases"
            className={({ isActive }) =>
              `flex items-center gap-3 p-3 rounded-lg ${
                isActive ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
              }`
            }
          >
            <FaTruck />
            Purchases
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/sales"
            className={({ isActive }) =>
              `flex items-center gap-3 p-3 rounded-lg ${
                isActive ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
              }`
            }
          >
            <FaShoppingCart />
            Sales
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/sales"
            className={({ isActive }) =>
              `flex items-center gap-3 p-3 rounded-lg ${
                isActive ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
              }`
            }
          >
            <FaShoppingCart />
            Suppliers
          </NavLink>
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;
