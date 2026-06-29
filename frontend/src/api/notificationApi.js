import API from "./apiClient";

const NOTIFICATION_CACHE_MS = 60000;
const notificationCache = new Map();
const pendingNotificationRequests = new Map();
let notificationCacheVersion = 0;

function notificationCacheKey(limit, unreadOnly) {
  return `${limit}:${unreadOnly ? "unread" : "all"}`;
}

function clearNotificationCache() {
  notificationCacheVersion += 1;
  notificationCache.clear();
  pendingNotificationRequests.clear();
}

export const getNotifications = async (limit = 10, unreadOnly = false, options = {}) => {
  const cacheKey = notificationCacheKey(limit, unreadOnly);
  const cached = notificationCache.get(cacheKey);
  const now = Date.now();

  if (!options.force && cached && now - cached.timestamp < NOTIFICATION_CACHE_MS) {
    return cached.response;
  }

  if (!options.force && pendingNotificationRequests.has(cacheKey)) {
    return pendingNotificationRequests.get(cacheKey);
  }

  const requestVersion = notificationCacheVersion;
  const request = API.get("/notifications/", {
    params: {
      limit,
      unread_only: unreadOnly,
    },
  })
    .then((response) => {
      if (requestVersion === notificationCacheVersion) {
        notificationCache.set(cacheKey, {
          response,
          timestamp: Date.now(),
        });
      }
      return response;
    })
    .finally(() => {
      pendingNotificationRequests.delete(cacheKey);
    });

  pendingNotificationRequests.set(cacheKey, request);
  return request;
};

export const getAllNotifications = async () => {
  return API.get("/notifications/all");
};

export const createNotification = async (payload) => {
  clearNotificationCache();
  return API.post("/notifications/create", payload);
};

export const resendNotification = async (notificationId) => {
  clearNotificationCache();
  return API.post(`/notifications/${notificationId}/resend`);
};

export const markNotificationRead = async (notificationId) => {
  clearNotificationCache();
  return API.patch(`/notifications/${notificationId}/read`);
};

export const markAllNotificationsRead = async () => {
  clearNotificationCache();
  return API.patch("/notifications/read-all");
};

export const deleteNotification = async (notificationId) => {
  clearNotificationCache();
  return API.delete(`/notifications/${notificationId}`);
};
