import { FaBars, FaBell } from "react-icons/fa";

function Navbar({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg border border-border bg-card p-2 text-foreground md:hidden"
          aria-label="Open sidebar"
        >
          <FaBars size={18} />
        </button>

        <div className="hidden min-w-0 md:block">
          <p className="text-sm font-semibold text-slate-500">
            HappiHome Inventory
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            className="relative rounded-lg border border-border bg-card p-2 text-slate-600 transition-colors hover:bg-slate-50"
            title="Notifications"
          >
            <FaBell size={18} />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
