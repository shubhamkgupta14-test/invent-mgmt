import { useEffect, useState } from "react";
import Sidebar from "../components/common/Sidebar";
import Navbar from "../components/common/Navbar";
import useCompanySettings from "../hooks/useCompanySettings";

function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { brand } = useCompanySettings();

  useEffect(() => {
    if (!sidebarOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="md:flex">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-60 transform bg-[var(--sidebar)] text-white shadow-xl transition duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar
            onClose={() => setSidebarOpen(false)}
            onNavigate={() => setSidebarOpen(false)}
          />
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />

          <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto flex min-h-full w-full max-w-[1400px] flex-col">
              <div className="flex-1">{children}</div>
              <footer className="mt-8 border-t border-border py-4 text-xs text-slate-500">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>{brand.title}</span>
                  <span>Products, stock, purchases, sales, returns, and exchanges.</span>
                </div>
              </footer>
            </div>
          </main>
        </div>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default MainLayout;
