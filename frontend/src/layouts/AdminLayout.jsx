import { useState } from "react";
import { FaBars } from "react-icons/fa";
import AdminSidebar from "../components/admin/AdminSidebar";

function AdminLayout({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition md:sticky md:top-0 md:h-screen md:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}>
        <AdminSidebar onNavigate={() => setOpen(false)} />
      </div>
      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center border-b border-slate-200 bg-white px-4 md:px-8">
          <button className="mr-3 text-slate-600 md:hidden" onClick={() => setOpen(true)}>
            <FaBars />
          </button>
          <p className="font-semibold text-slate-800">Secure administration</p>
        </header>
        <main className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      {open && <button className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setOpen(false)} />}
    </div>
  );
}

export default AdminLayout;
