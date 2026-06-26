import { FaBars, FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMyDetails } from "../api/userApi";

function Navbar({ onMenuClick }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const response = await getMyDetails();
      setUsername(response.data.data.username);
    } catch (error) {
      console.log(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");

    navigate("/");
  };

  return (
    <header className="sticky top-0 z-10 bg-white/95 shadow-sm backdrop-blur-sm px-4 py-4 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700 md:hidden"
          >
            <FaBars />
          </button>
          

          <div className="flex items-center gap-3 text-slate-900">
            <FaUserCircle className="text-xl" />
            <div>
              <p className="text-sm text-slate-500">Welcome back</p>
              <p className="text-base font-semibold">{username || "User"}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500"
        >
          <FaSignOutAlt />
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
