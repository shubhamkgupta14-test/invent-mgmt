import Sidebar from "../components/Sidebar";

import Navbar from "../components/Navbar";

function MainLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* FIXED SIDEBAR */}

      <div className="w-64 flex-shrink-0">
        <Sidebar />
      </div>

      {/* MAIN CONTENT */}

      <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
        {/* FIXED NAVBAR */}

        <Navbar />

        {/* SCROLLABLE CONTENT */}

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default MainLayout;
