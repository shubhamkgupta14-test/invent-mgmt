import { useCallback, useEffect, useState } from "react";
import { FaPaperPlane, FaTrash } from "react-icons/fa";
import Card from "../components/common/Card";
import Loader from "../components/common/Loader";
import MainLayout from "../layouts/MainLayout";
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  resendNotification,
} from "../api/notificationApi";
import { getMyDetails } from "../api/userApi";
import { useToast } from "../context/useToast";
import { formatDateTimeIST } from "../utils/formatters";

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

function Notifications() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [expandedNotificationId, setExpandedNotificationId] = useState(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [resendingNotificationId, setResendingNotificationId] = useState(null);
  const { addToast } = useToast();

  const loadNotifications = useCallback(async (options = {}) => {
    const response = await getNotifications(100, false, options);
    const data = response.data.data || {};
    setNotifications(data.notifications || []);
    setUnreadCount(data.unread_count || 0);
  }, []);

  useEffect(() => {
    const loadId = window.setTimeout(() => {
      Promise.all([
        loadNotifications(),
        getMyDetails().then((response) => setCurrentUser(response.data.data)),
      ])
        .catch(() => {
          setCurrentUser(null);
        })
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(loadId);
  }, [loadNotifications]);

  const handleRead = async (notification) => {
    if (!notification.read) {
      await markNotificationRead(notification.notification_id);
      await loadNotifications({ force: true });
      window.dispatchEvent(new Event("notifications:changed"));
    }
  };

  const toggleNotificationCard = async (notification) => {
    setExpandedNotificationId((current) =>
      current === notification.notification_id ? null : notification.notification_id,
    );
    await handleRead(notification);
  };

  const handleDeleteNotification = async (event, notificationId) => {
    event.stopPropagation();

    try {
      await deleteNotification(notificationId);
      setExpandedNotificationId((current) =>
        current === notificationId ? null : current,
      );
      await loadNotifications({ force: true });
      window.dispatchEvent(new Event("notifications:changed"));
      addToast("Notification deleted successfully", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to delete notification", "error");
    }
  };

  const handleResendNotification = async (event, notificationId) => {
    event.stopPropagation();

    try {
      setResendingNotificationId(notificationId);
      await resendNotification(notificationId);
      await loadNotifications({ force: true });
      window.dispatchEvent(new Event("notifications:changed"));
      addToast("Notification resent successfully", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to resend notification", "error");
    } finally {
      setResendingNotificationId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAllRead(true);
      await markAllNotificationsRead();
      await loadNotifications({ force: true });
      window.dispatchEvent(new Event("notifications:changed"));
      addToast("All notifications marked as read", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to mark notifications as read", "error");
    } finally {
      setMarkingAllRead(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading notifications..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
            <p className="mt-1 text-slate-600">Review current and previous notifications.</p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={!unreadCount || markingAllRead}
              className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {markingAllRead ? "Marking..." : "Mark All As Read"}
            </button>
          </div>
        </div>
      </div>

      <Card>
        <div className="space-y-4">
          {notifications.map((notification) => {
            const isExpanded =
              expandedNotificationId === notification.notification_id;

            return (
              <div
                key={notification.notification_id}
                role="button"
                tabIndex={0}
                onClick={() => toggleNotificationCard(notification)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleNotificationCard(notification);
                  }
                }}
                className={`cursor-pointer rounded-xl border border-l-4 border-border p-4 text-left shadow-sm transition hover:bg-slate-50 ${
                  notification.read ? "bg-white" : "bg-indigo-50/40"
                } ${typeBorderClasses[notification.notification_type] || typeBorderClasses.INFO}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">
                      {toSentenceCase(notification.title)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {formatDateTimeIST(notification.created_at)}
                    </p>
                  </div>
                  {currentUser?.role === "superadmin" && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={(event) =>
                          handleResendNotification(event, notification.notification_id)
                        }
                        disabled={resendingNotificationId === notification.notification_id}
                        title="Resend notification"
                      >
                        <FaPaperPlane size={13} />
                      </button>
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                        onClick={(event) =>
                          handleDeleteNotification(event, notification.notification_id)
                        }
                        title="Delete notification"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {notification.message}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          {!notifications.length && (
            <p className="rounded-xl border border-border bg-slate-50 p-6 text-center text-sm text-slate-500">
              No notifications found.
            </p>
          )}
        </div>
      </Card>
    </MainLayout>
  );
}

export default Notifications;
