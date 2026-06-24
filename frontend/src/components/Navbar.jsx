import { FaUserCircle, FaSignOutAlt } from "react-icons/fa";

import { useNavigate } from "react-router-dom";

import { useEffect, useState } from "react";
import { getMyDetails } from "../api/userApi";

function Navbar() {
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
    <div className="bg-white shadow px-6 py-4 flex justify-between items-center">
      <h2 className="text-xl font-semibold">Dashboard</h2>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FaUserCircle />

          <span>{username}</span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg"
        >
          <FaSignOutAlt />
          Logout
        </button>
      </div>
    </div>
  );
}

export default Navbar;
