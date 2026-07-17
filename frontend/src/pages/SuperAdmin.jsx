import { useCallback, useEffect, useMemo, useState } from "react";
import { FaPaperPlane, FaTrash } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import Select from "../components/common/Select";
import Textarea from "../components/common/Textarea";
import UserManagement from "../components/pages/superadmin/UserManagement";
import {
  CleanupSkeleton,
  NotificationHistorySkeleton,
} from "../components/pages/superadmin/AdminSkeletons";
import {
  createNotification,
  deleteNotification,
  getAllNotifications,
  resendNotification,
} from "../api/notificationApi";
import ApiLogs from "./ApiLogs";
import AuditLogs from "./AuditLogs";
import { cleanDatabase, getMyDetails } from "../api/userApi";
import { useToast } from "../context/useToast";
import AdminLayout from "../layouts/AdminLayout";
import Mailer from "./Mailer";
import { formatDateTimeIST } from "../utils/formatters";
import {
  CLEAN_OPTIONS,
  DEFAULT_CLEAN_COLLECTIONS,
} from "../config/cleanupConfig";
import {
  getMaintenanceConfig,
  updateMaintenanceConfig,
} from "../api/maintenanceApi";

const roleOptions = [
  { label: "User", value: "user" },
  { label: "Admin", value: "admin" },
  { label: "Super Admin", value: "superadmin" },
];

const cleanOptions = CLEAN_OPTIONS;

const emptyNotificationForm = {
  title: "",
  message: "",
  notification_type: "INFO",
  audience: "ALL",
  roles: [],
  usernames: "",
};

const notificationTypeOptions = [
  { label: "Info", value: "INFO" },
  { label: "Warning", value: "WARNING" },
  { label: "Maintenance", value: "MAINTENANCE" },
  { label: "Action Required", value: "ACTION_REQUIRED" },
];

const audienceOptions = [
  { label: "All Users", value: "ALL" },
  { label: "By Role", value: "ROLE" },
  { label: "Specific Users", value: "USERS" },
];

const adminTabs = ["overview", "users", "notifications", "mailer", "audits", "api-logs", "maintenance", "cleanup"];
const cleanDbCollectionValues = DEFAULT_CLEAN_COLLECTIONS;

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

function toLocalDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const emptyMaintenanceForm = {
  enabled: false,
  message: "We are performing scheduled maintenance. Please try again shortly.",
  starts_at: "",
  ends_at: "",
};

function SuperAdmin() {
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [confirmCleanOpen, setConfirmCleanOpen] = useState(false);
  const activeTab = adminTabs.includes(searchParams.get("tab"))
    ? searchParams.get("tab")
    : "overview";
  const [notificationForm, setNotificationForm] = useState(emptyNotificationForm);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [sentNotifications, setSentNotifications] = useState([]);
  const [expandedNotificationId, setExpandedNotificationId] = useState(null);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [loadingCleanup, setLoadingCleanup] = useState(true);
  const [resendingNotificationId, setResendingNotificationId] = useState(null);
  const [maintenanceForm, setMaintenanceForm] = useState(emptyMaintenanceForm);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const { addToast } = useToast();

  const loadSentNotifications = useCallback(async () => {
    try {
      setLoadingNotifications(true);
      const response = await getAllNotifications();
      setSentNotifications(response.data.data || []);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load notifications", "error");
    } finally {
      setLoadingNotifications(false);
    }
  }, [addToast]);

  useEffect(() => {
    let isActive = true;

    getMyDetails()
      .then((response) => {
        if (isActive) setCurrentUser(response.data.data);
      })
      .catch((error) => {
        addToast(error.response?.data?.message || "Failed to load user details", "error");
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [addToast]);

  useEffect(() => {
    if (activeTab !== "notifications") return undefined;

    const loadId = window.setTimeout(loadSentNotifications, 0);
    return () => window.clearTimeout(loadId);
  }, [activeTab, loadSentNotifications]);

  useEffect(() => {
    if (activeTab !== "maintenance") return undefined;
    let active = true;
    setLoadingMaintenance(true);
    getMaintenanceConfig()
      .then((response) => {
        if (!active) return;
        const config = response.data.data;
        setMaintenanceForm({
          enabled: Boolean(config.enabled),
          message: config.message,
          starts_at: toLocalDateTimeInput(config.starts_at),
          ends_at: toLocalDateTimeInput(config.ends_at),
        });
      })
      .catch((error) => {
        addToast(error.response?.data?.message || "Failed to load maintenance configuration", "error");
      })
      .finally(() => {
        if (active) setLoadingMaintenance(false);
      });
    return () => { active = false; };
  }, [activeTab, addToast]);

  useEffect(() => {
    if (loading || activeTab !== "cleanup") return undefined;
    const showTimer = window.setTimeout(() => setLoadingCleanup(true), 0);
    const hideTimer = window.setTimeout(() => setLoadingCleanup(false), 350);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [activeTab, loading]);

  const selectedCollectionLabels = useMemo(
    () =>
      cleanOptions
        .filter((option) => selectedCollections.includes(option.value))
        .map((option) => option.label)
        .join(", "),
    [selectedCollections],
  );

  const allCollectionsSelected = selectedCollections.length === cleanOptions.length;

  const toggleCollection = (collection) => {
    setSelectedCollections((current) =>
      current.includes(collection)
        ? current.filter((item) => item !== collection)
        : [...current, collection],
    );
  };

  const toggleAllCollections = () => {
    setSelectedCollections((current) =>
      current.length === cleanOptions.length
        ? []
        : cleanOptions.map((option) => option.value),
    );
  };

  const selectCleanDbCollections = () => {
    setSelectedCollections(cleanDbCollectionValues);
  };

  const handleCleanDatabase = async () => {
    try {
      setCleaning(true);
      await cleanDatabase(selectedCollections);
      addToast("Selected data cleaned successfully", "success");
      setSelectedCollections([]);
      setConfirmCleanOpen(false);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to clean database", "error");
    } finally {
      setCleaning(false);
    }
  };

  const updateNotificationForm = (key, value) => {
    setNotificationForm((current) => ({ ...current, [key]: value }));
  };

  const toggleNotificationRole = (role) => {
    setNotificationForm((current) => ({
      ...current,
      roles: current.roles.includes(role)
        ? current.roles.filter((item) => item !== role)
        : [...current.roles, role],
    }));
  };

  const handleSendNotification = async (event) => {
    event.preventDefault();

    try {
      setSendingNotification(true);
      await createNotification({
        ...notificationForm,
        usernames: notificationForm.usernames
          .split(",")
          .map((username) => username.trim())
          .filter(Boolean),
      });
      addToast("Notification sent successfully", "success");
      setNotificationForm(emptyNotificationForm);
      await loadSentNotifications();
      window.dispatchEvent(new Event("notifications:changed"));
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to send notification", "error");
    } finally {
      setSendingNotification(false);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      addToast("Notification deleted successfully", "success");
      setExpandedNotificationId((current) =>
        current === notificationId ? null : current,
      );
      await loadSentNotifications();
      window.dispatchEvent(new Event("notifications:changed"));
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to delete notification", "error");
    }
  };

  const handleResendNotification = async (notificationId) => {
    try {
      setResendingNotificationId(notificationId);
      await resendNotification(notificationId);
      addToast("Notification resent successfully", "success");
      await loadSentNotifications();
      window.dispatchEvent(new Event("notifications:changed"));
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to resend notification", "error");
    } finally {
      setResendingNotificationId(null);
    }
  };

  const toggleNotificationCard = (notificationId) => {
    setExpandedNotificationId((current) =>
      current === notificationId ? null : notificationId,
    );
  };

  const handleSaveMaintenance = async (event) => {
    event.preventDefault();
    try {
      setSavingMaintenance(true);
      const response = await updateMaintenanceConfig({
        ...maintenanceForm,
        starts_at: maintenanceForm.starts_at
          ? new Date(maintenanceForm.starts_at).toISOString()
          : null,
        ends_at: maintenanceForm.ends_at
          ? new Date(maintenanceForm.ends_at).toISOString()
          : null,
      });
      const config = response.data.data;
      setMaintenanceForm({
        enabled: Boolean(config.enabled),
        message: config.message,
        starts_at: toLocalDateTimeInput(config.starts_at),
        ends_at: toLocalDateTimeInput(config.ends_at),
      });
      window.dispatchEvent(
        new CustomEvent("maintenance:changed", { detail: config }),
      );
      addToast(
        config.active ? "Maintenance mode is now active" : "Maintenance configuration saved",
        "success",
      );
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to save maintenance configuration", "error");
    } finally {
      setSavingMaintenance(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading admin tools..." />
        </div>
      </AdminLayout>
    );
  }

  if (currentUser?.role !== "superadmin") {
    return (
      <AdminLayout>
        <Card>
          <p className="text-sm font-medium text-slate-700">
            Only Super Admin users can access this page.
          </p>
        </Card>
      </AdminLayout>
    );
  }

  if (activeTab === "audits") {
    return <AuditLogs />;
  }

  if (activeTab === "api-logs") {
    return <ApiLogs />;
  }

  if (activeTab === "mailer") {
    return <Mailer adminPortal />;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Administration Console
          </h1>
          <p className="mt-1 text-slate-600">
            Manage access, operational messaging, and controlled data maintenance.
          </p>
        </div>

        {activeTab === "overview" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["User Management", "Create accounts, manage roles, and control access."],
              ["Notifications", "Send operational messages and review notification history."],
              ["Audit Trail", "Review important activity across the application."],
              ["API Logs", "Inspect request outcomes, timing, and failures."],
              ["Maintenance Mode", "Schedule downtime and control user access."],
              ["Data Maintenance", "Run controlled cleanup operations with confirmation."],
            ].map(([title, description]) => (
              <Card key={title} title={title}>
                <p className="text-sm leading-6 text-slate-600">{description}</p>
              </Card>
            ))}
          </div>
        ) : activeTab === "users" ? (
          <UserManagement currentUsername={currentUser.username} />
        ) : activeTab === "notifications" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card title="Send Notification">
              <form onSubmit={handleSendNotification} className="space-y-5">
                <Input
                  label="Title"
                  value={notificationForm.title}
                  onChange={(value) => updateNotificationForm("title", value)}
                  required
                />
                <Textarea
                  label="Message"
                  value={notificationForm.message}
                  onChange={(value) => updateNotificationForm("message", value)}
                  rows={4}
                  required
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Select
                    label="Type"
                    value={notificationForm.notification_type}
                    onChange={(value) => updateNotificationForm("notification_type", value)}
                    options={notificationTypeOptions}
                    required
                  />
                  <Select
                    label="Target"
                    value={notificationForm.audience}
                    onChange={(value) => updateNotificationForm("audience", value)}
                    options={audienceOptions}
                    required
                  />
                </div>

                {notificationForm.audience === "ROLE" && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">Roles</p>
                    <div className="flex flex-wrap gap-3">
                      {roleOptions.map((role) => (
                        <label
                          key={role.value}
                          className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={notificationForm.roles.includes(role.value)}
                            onChange={() => toggleNotificationRole(role.value)}
                            className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                          />
                          {role.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {notificationForm.audience === "USERS" && (
                  <Input
                    label="Usernames"
                    placeholder="Comma separated usernames"
                    value={notificationForm.usernames}
                    onChange={(value) => updateNotificationForm("usernames", value)}
                    required
                  />
                )}

                <div className="flex justify-end">
                  <Button type="submit" variant="primary" loading={sendingNotification}>
                    Send Notification
                  </Button>
                </div>
              </form>
            </Card>

            <Card title="Notification History">
              <div className="space-y-4">
                {loadingNotifications ? (
                  <NotificationHistorySkeleton />
                ) : (
                  sentNotifications.slice(0, 4).map((notification) => {
                    const isExpanded =
                      expandedNotificationId === notification.notification_id;

                    return (
                      <div
                        key={notification.notification_id}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleNotificationCard(notification.notification_id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleNotificationCard(notification.notification_id);
                          }
                        }}
                        className={`cursor-pointer rounded-xl border border-l-4 border-border bg-white p-4 text-left shadow-sm transition hover:bg-slate-50 ${
                          typeBorderClasses[notification.notification_type] || typeBorderClasses.INFO
                        }`}
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
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleResendNotification(notification.notification_id);
                              }}
                              disabled={resendingNotificationId === notification.notification_id}
                              title="Resend notification"
                            >
                              <FaPaperPlane size={13} />
                            </button>
                            <button
                              type="button"
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteNotification(notification.notification_id);
                              }}
                              title="Delete notification"
                            >
                              <FaTrash size={14} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 border-t border-border pt-4">
                            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                              {notification.message}
                            </p>
                            <p className="mt-3 text-xs font-medium text-slate-500">
                              Audience: {notification.audience?.replaceAll("_", " ") || "ALL"}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                {!loadingNotifications && !sentNotifications.length && (
                  <p className="rounded-xl border border-border bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No notifications sent yet.
                  </p>
                )}
              </div>
            </Card>
          </div>
        ) : activeTab === "maintenance" ? (
          <Card title="Maintenance Mode">
            {loadingMaintenance ? (
              <Loader message="Loading maintenance configuration..." />
            ) : (
              <form onSubmit={handleSaveMaintenance} className="space-y-6">
                <div className={`rounded-2xl border p-5 ${
                  maintenanceForm.enabled
                    ? "border-amber-300 bg-amber-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}>
                  <label className="flex cursor-pointer items-center justify-between gap-5">
                    <div>
                      <p className="font-bold text-slate-900">
                        {maintenanceForm.enabled ? "Maintenance is enabled" : "Application is available"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Super Admin accounts keep full access while other users receive a maintenance screen.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={maintenanceForm.enabled}
                      onChange={(event) =>
                        setMaintenanceForm((current) => ({
                          ...current,
                          enabled: event.target.checked,
                        }))
                      }
                      className="h-5 w-5 shrink-0 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                  </label>
                </div>

                <Textarea
                  label="User-facing message"
                  value={maintenanceForm.message}
                  onChange={(value) =>
                    setMaintenanceForm((current) => ({ ...current, message: value }))
                  }
                  rows={4}
                  required
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    type="datetime-local"
                    label="Starts at (optional)"
                    value={maintenanceForm.starts_at}
                    onChange={(value) =>
                      setMaintenanceForm((current) => ({ ...current, starts_at: value }))
                    }
                  />
                  <Input
                    type="datetime-local"
                    label="Ends at (optional)"
                    value={maintenanceForm.ends_at}
                    onChange={(value) =>
                      setMaintenanceForm((current) => ({ ...current, ends_at: value }))
                    }
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-medium text-slate-500">
                    Leave both times empty to apply the switch immediately and indefinitely.
                  </p>
                  <Button type="submit" variant="primary" loading={savingMaintenance}>
                    Save Maintenance Settings
                  </Button>
                </div>
              </form>
            )}
          </Card>
        ) : loadingCleanup ? (
          <CleanupSkeleton />
        ) : (
          <div className="w-full">
            <Card title="Data Maintenance">
              <div className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div>
                    <p className="text-sm text-slate-600">
                      Select records to permanently clean from operational storage.
                      Use this only for planned maintenance or test data resets.
                    </p>
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      {selectedCollections.length} of {cleanOptions.length} data sets selected
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={selectCleanDbCollections}
                    >
                      Select Clean Preset
                    </Button>
                    <label className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-800">
                      <input
                        type="checkbox"
                        checked={allCollectionsSelected}
                        onChange={toggleAllCollections}
                        className="h-4 w-4 rounded border-indigo-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                      Select All
                    </label>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {cleanOptions.map((option) => {
                    const isSelected = selectedCollections.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                          isSelected
                            ? "border-indigo-300 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100"
                            : "border-border bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCollection(option.value)}
                          className="h-4 w-4 shrink-0 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="flex flex-col items-end gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-medium text-slate-500">
                    Cleaning users keeps the current Super Admin account. Cleaning suppliers keeps the own company supplier.
                  </p>
                  <Button
                    type="button"
                    variant="danger"
                    className="bg-rose-600 text-white hover:bg-rose-700"
                    disabled={!selectedCollections.length}
                    onClick={() => setConfirmCleanOpen(true)}
                  >
                    Clean Selected Data
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <Modal
        isOpen={confirmCleanOpen}
        onClose={() => setConfirmCleanOpen(false)}
        title="Confirm Data Cleanup"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-700">
            This will permanently delete data from:{" "}
            <span className="font-semibold text-slate-900">
              {selectedCollectionLabels}
            </span>
            .
          </p>
          {selectedCollections.includes("users") && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Your current Super Admin account will be kept.
            </p>
          )}
          {selectedCollections.includes("suppliers") && (
            <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800">
              Your own company supplier will be kept.
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmCleanOpen(false)}
              disabled={cleaning}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              className="bg-rose-600 text-white hover:bg-rose-700"
              loading={cleaning}
              onClick={handleCleanDatabase}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}

export default SuperAdmin;
