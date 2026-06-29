import { useCallback, useEffect, useState } from "react";
import { FaBars, FaBell } from "react-icons/fa";
import { Link } from "react-router-dom";
import { getNotifications, markNotificationRead } from "../../api/notificationApi";
import { APP_TITLE } from "../../config/brand";
import { formatDateIST } from "../../utils/formatters";

const typeBorderClasses = {
  INFO: "border-l-sky-500",
  WARNING: "border-l-amber-500",
  MAINTENANCE: "border-l-violet-500",
  ACTION_REQUIRED: "border-l-rose-500",
  OUT_OF_STOCK: "border-l-rose-500",
};

function toSentenceCase(value) {
  const text = String(value || "").trim().toLowerCase();
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}

function Navbar({ onMenuClick }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async ({ force = false } = {}) => {
    try {
      const response = await getNotifications(5, true, { force });
      const data = response.data.data || {};
      const unreadNotifications = data.notifications || [];

      setNotifications(unreadNotifications);
      setUnreadCount(data.unread_count || unreadNotifications.length);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    const initialLoadId = window.setTimeout(loadNotifications, 0);
    const handleNotificationChange = () => loadNotifications({ force: true });

    window.addEventListener("notifications:changed", handleNotificationChange);

    return () => {
      window.clearTimeout(initialLoadId);
      window.removeEventListener("notifications:changed", handleNotificationChange);
    };
  }, [loadNotifications]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markNotificationRead(notification.notification_id);
      await loadNotifications({ force: true });
    }
  };

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
            {APP_TITLE}
          </p>
        </div>

        <div className="relative flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="relative rounded-lg border border-border bg-card p-2 text-slate-600 transition-colors hover:bg-slate-50"
            title="Notifications"
          >
            <FaBell size={18} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-600 ring-1 ring-white" />
            )}
          </button>
          {open && (
            <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-border bg-slate-50 px-4 py-3">
                <p className="text-sm font-bold text-slate-900">Notifications</p>
                <span className="text-xs font-semibold text-slate-500">
                  {unreadCount} unread
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length ? (
                  notifications.map((notification) => (
                    <button
                      type="button"
                      key={notification.notification_id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`block w-full border-b border-l-4 border-border px-4 py-3 text-left last:border-b-0 hover:bg-slate-50 ${
                        notification.read ? "bg-white" : "bg-indigo-50/40"
                      } ${typeBorderClasses[notification.notification_type] || typeBorderClasses.INFO}`}
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {toSentenceCase(notification.title)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{notification.message}</p>
                      <p className="mt-2 text-[10px] font-medium text-slate-400">
                        {formatDateIST(notification.created_at)}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">
                    No notifications.
                  </p>
                )}
              </div>
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="block border-t border-border bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                View More
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
