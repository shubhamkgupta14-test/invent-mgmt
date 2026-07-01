import API from "./apiClient";
import { setStoredCompanySettings } from "../utils/companySettings";

let companySettingsPromise = null;
let companySettingsCache = null;
let companySettingsCacheTime = 0;
const COMPANY_SETTINGS_TTL_MS = 5 * 60 * 1000;

const cacheCompanySettings = (response) => {
  if (response.data?.data) {
    companySettingsCache = response;
    companySettingsCacheTime = Date.now();
    setStoredCompanySettings(response.data.data);
  }
  return response;
};

export const getCompanySettings = async ({ force = false } = {}) => {
  const cacheFresh = Date.now() - companySettingsCacheTime < COMPANY_SETTINGS_TTL_MS;

  if (!force && companySettingsCache && cacheFresh) {
    return companySettingsCache;
  }

  if (!force && companySettingsPromise) {
    return companySettingsPromise;
  }

  companySettingsPromise = API.get("/company/settings")
    .then(cacheCompanySettings)
    .finally(() => {
      companySettingsPromise = null;
    });

  return companySettingsPromise;
};

export const updateCompanySettings = async (payload) => {
  return API.put("/company/settings", payload).then(cacheCompanySettings);
};

export const uploadCompanyLogo = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  return API.post("/company/logo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  }).then(cacheCompanySettings);
};
