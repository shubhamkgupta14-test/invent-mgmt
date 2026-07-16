import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { keepSessionAlive, logoutUser } from "../../api/authApi";
import { configValue } from "../../config/appConfig";
import { clearAuthState, getStoredUser } from "../../utils/authUtils";
import Button from "./Button";

const IDLE_SECONDS = configValue("sessionIdleTimeoutSeconds", 15 * 60);
const WARNING_SECONDS = configValue("sessionWarningSeconds", 60);

function SessionTimeoutManager() {
  const location = useLocation();
  const lastActivity = useRef(null);
  const loggingOut = useRef(false);
  const [remainingSeconds, setRemainingSeconds] = useState(IDLE_SECONDS);
  const [continuing, setContinuing] = useState(false);

  const isAuthenticatedPage = location.pathname !== "/" &&
    location.pathname !== "/forgot-password" && Boolean(getStoredUser());

  const recordActivity = useCallback(() => {
    lastActivity.current = Date.now();
    setRemainingSeconds(IDLE_SECONDS);
  }, []);

  const endSession = useCallback(async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    try {
      await logoutUser();
    } catch {
      // Cookie cleanup and navigation must still happen if the session expired.
    } finally {
      clearAuthState(`${location.pathname}${location.search}${location.hash}`);
      window.location.href = "/";
    }
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    if (!isAuthenticatedPage) return undefined;
    lastActivity.current = Date.now();
    window.addEventListener("session:activity", recordActivity);
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivity.current) / 1000);
      const remaining = Math.max(0, IDLE_SECONDS - elapsed);
      setRemainingSeconds(remaining);
      if (remaining === 0) endSession();
    }, 1000);
    return () => {
      window.removeEventListener("session:activity", recordActivity);
      window.clearInterval(timer);
    };
  }, [endSession, isAuthenticatedPage, recordActivity]);

  const continueSession = async () => {
    try {
      setContinuing(true);
      await keepSessionAlive();
      recordActivity();
    } catch {
      await endSession();
    } finally {
      setContinuing(false);
    }
  };

  if (!isAuthenticatedPage || remainingSeconds > WARNING_SECONDS) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="session-timeout-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="session-timeout-title" className="text-xl font-bold text-slate-900">Your session is about to expire</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          You have been inactive. For your security, you will be signed out in
          <span className="ml-1 font-bold text-rose-700">{remainingSeconds} second{remainingSeconds === 1 ? "" : "s"}</span>.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={endSession} disabled={continuing}>Log out</Button>
          <Button type="button" onClick={continueSession} loading={continuing}>Continue session</Button>
        </div>
      </div>
    </div>
  );
}

export default SessionTimeoutManager;
