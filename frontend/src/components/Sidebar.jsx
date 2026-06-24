import { FaBox, FaChartBar, FaShoppingCart, FaTruck } from "react-icons/fa";
import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <div className="w-64 bg-white h-screen shadow-md p-5">
      <h1 className="text-2xl font-bold mb-10">Inventory</h1>

      <ul className="space-y-3">
        <li>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 p-3 rounded-lg ${
                isActive ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
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
      </ul>
    </div>
  );
}

export default Sidebar;
