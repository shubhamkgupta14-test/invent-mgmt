import { useEffect, useMemo, useState } from "react";
import {
  getAppTitle,
  getBrandInitial,
  getBrandName,
  getStoredCompanySettings,
} from "../utils/companySettings";

function useCompanySettings() {
  const [settings, setSettings] = useState(() => getStoredCompanySettings());

  useEffect(() => {
    const updateSettings = () => setSettings(getStoredCompanySettings());

    window.addEventListener("company-settings:changed", updateSettings);
    window.addEventListener("storage", updateSettings);

    return () => {
      window.removeEventListener("company-settings:changed", updateSettings);
      window.removeEventListener("storage", updateSettings);
    };
  }, []);

  const brand = useMemo(
    () => ({
      name: getBrandName(settings),
      title: getAppTitle(settings),
      initial: getBrandInitial(settings),
      logoUrl: settings.logo_url || "/brand-logo.png",
    }),
    [settings],
  );

  useEffect(() => {
    document.title = brand.title;
  }, [brand.title]);

  return { settings, brand };
}

export default useCompanySettings;
