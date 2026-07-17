import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaBuilding, FaCamera, FaEye, FaEyeSlash, FaKey, FaPlus, FaTrash, FaUserCircle } from "react-icons/fa";
import {
  changePassword,
  getMyDetails,
  requestEmailVerification,
  resetMyProfileImage,
  updateMyProfile,
  uploadMyProfileImage,
  verifyEmail,
} from "../api/userApi";
import { getCompanySettings, resetCompanyLogo, updateCompanySettings, uploadCompanyLogo } from "../api/companyApi";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import DevOtpPanel from "../components/common/DevOtpPanel";
import Loader from "../components/common/Loader";
import RoleBadge from "../components/common/RoleBadge";
import { useToast } from "../context/useToast";
import MainLayout from "../layouts/MainLayout";
import { clearAuthState, setStoredUser } from "../utils/authUtils";
import { logoutUser } from "../api/authApi";
import {
  DEFAULT_COMPANY_SETTINGS,
  currencyOptions,
} from "../utils/companySettings";
import { resolveMediaUrl } from "../utils/media";

const emptyPasswordForm = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

const emptyProfileForm = {
  firstname: "",
  lastname: "",
  email: "",
};

const sanitizeOtp = (value) => value.replace(/\D/g, "").slice(0, 6);
const isFutureDate = (value) => {
  if (!value) return false;
  const normalizedValue = /[zZ]|[+-]\d{2}:\d{2}$/.test(value)
    ? value
    : `${value}Z`;
  const date = new Date(normalizedValue);
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
};

function FieldDisplay({ label, value }) {
  return (
    <div className="w-full">
      <p className="mb-2 block text-sm font-semibold text-slate-700">{label}</p>
      <div className="w-full rounded-xl border border-[var(--border)] bg-slate-50 px-4 py-2.5 font-sans text-sm font-semibold text-slate-900 shadow-sm">
        {value || "-"}
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value || "-"}</p>
    </div>
  );
}

function PasswordEyeButton({ visible, onToggle, label, disabled }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="rounded-md p-1 text-slate-500 transition hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={`${visible ? "Hide" : "Show"} ${label}`}
      title={visible ? "Hide password" : "Show password"}
    >
      {visible ? <FaEyeSlash size={17} /> : <FaEye size={17} />}
    </button>
  );
}

function UserSettings() {
  const [user, setUser] = useState(null);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [resettingProfileImage, setResettingProfileImage] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpError, setEmailOtpError] = useState("");
  const [emailDevOtp, setEmailDevOtp] = useState("");
  const [emailOtpRequested, setEmailOtpRequested] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordVisibility, setPasswordVisibility] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordError, setPasswordError] = useState("");
  const [companySettings, setCompanySettings] = useState(DEFAULT_COMPANY_SETTINGS);
  const [savingCompany, setSavingCompany] = useState(false);
  const [uploadingCompanyLogo, setUploadingCompanyLogo] = useState(false);
  const [resettingCompanyLogo, setResettingCompanyLogo] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    let isActive = true;

    const loadProfile = getMyDetails({ force: true })
      .then((profileResponse) => {
        if (!isActive) return;

        const nextUser = profileResponse.data.data;
        const otpStillPending =
          !nextUser?.email_verified &&
          isFutureDate(nextUser?.email_verification_pending_until);

        setUser(nextUser);
        setProfileForm({
          firstname: nextUser?.firstname || "",
          lastname: nextUser?.lastname || "",
          email: nextUser?.email || "",
        });
        setEmailOtpRequested(otpStillPending);
      })
      .catch((error) => {
        addToast(error.response?.data?.message || "Failed to load user details", "error");
      });

    const loadCompanySettings = getCompanySettings()
      .then((companyResponse) => {
        if (!isActive) return;

        const nextCompanySettings = {
          ...DEFAULT_COMPANY_SETTINGS,
          ...companyResponse.data.data,
        };

        setCompanySettings(nextCompanySettings);
      })
      .catch((error) => {
        addToast(error.response?.data?.message || "Failed to load company settings", "error");
      });

    Promise.allSettled([loadProfile, loadCompanySettings]).finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [addToast]);

  useEffect(() => {
    if (
      !emailOtpRequested ||
      !user?.email_verification_pending_until ||
      !isFutureDate(user.email_verification_pending_until)
    ) {
      return undefined;
    }

    const normalizedValue = /[zZ]|[+-]\d{2}:\d{2}$/.test(user.email_verification_pending_until)
      ? user.email_verification_pending_until
      : `${user.email_verification_pending_until}Z`;
    const timeoutMs = Math.max(new Date(normalizedValue).getTime() - Date.now(), 0);
    const timeoutId = window.setTimeout(() => {
      setEmailOtpRequested(false);
      setEmailOtp("");
      setEmailOtpError("");
    }, timeoutMs);

    return () => window.clearTimeout(timeoutId);
  }, [emailOtpRequested, user?.email_verification_pending_until]);

  const canEditCompany = user?.role === "superadmin";

  const displayName = useMemo(() => {
    return [user?.firstname, user?.lastname].filter(Boolean).join(" ") || user?.username || "User";
  }, [user]);
  const profileImageUrl = resolveMediaUrl(user?.profile_image_url);
  const companyLogoUrl = resolveMediaUrl(companySettings.logo_url);

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const companyDetailFields = [
    ["Company name", companySettings.company_name],
    ["Brand name", companySettings.brand_name],
    ["Currency", companySettings.currency],
    ["Company email", companySettings.email],
    ["Phone", companySettings.phone],
    ["GST / Tax number", companySettings.gst_number],
    ["Website", companySettings.website],
    ["Address", companySettings.address],
    ...(companySettings.custom_fields || [])
      .filter((field) => (field.label || "").trim() || (field.value || "").trim())
      .map((field) => [field.label, field.value]),
  ];

  const updatePasswordField = (key, value) => {
    setPasswordError("");
    setPasswordForm((current) => ({ ...current, [key]: value }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    try {
      setSavingPassword(true);
      await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm(emptyPasswordForm);
      addToast("Password updated. Please sign in again.", "success");
      await logoutUser().catch(() => {});
      clearAuthState("/settings");
      window.location.href = "/";
    } catch (error) {
      setPasswordError(error.response?.data?.message || "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const updateProfileField = (key, value) => {
    setProfileForm((current) => ({ ...current, [key]: value }));
    if (key === "email") {
      setEmailOtp("");
      setEmailOtpError("");
      setEmailOtpRequested(false);
    }
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    try {
      setSavingProfile(true);
      const response = await updateMyProfile(profileForm);
      const updatedUser = {
        ...user,
        ...profileForm,
        ...(response.data?.data || {}),
      };
      setUser(updatedUser);
      setStoredUser(updatedUser);
      setProfileForm({
        firstname: updatedUser.firstname || "",
        lastname: updatedUser.lastname || "",
        email: updatedUser.email || "",
      });
      addToast("Profile updated successfully", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to update profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRequestEmailOtp = async () => {
    try {
      setSendingEmailOtp(true);
      setEmailOtpError("");
      const response = await requestEmailVerification();
      setEmailDevOtp(response.data.data?.dev_otp || "");
      const expiresAt = response.data.data?.expires_at;
      setEmailOtpRequested(true);
      if (expiresAt) {
        setUser((current) => ({
          ...current,
          email_verification_pending_until: expiresAt,
        }));
      }
      addToast("Verification code sent to your email", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to send verification code", "error");
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleVerifyEmail = async (event) => {
    event?.preventDefault();
    const otp = emailOtp.trim();

    if (!otp) {
      setEmailOtpError("OTP is required");
      return;
    }

    try {
      setEmailOtpError("");
      setVerifyingEmail(true);
      const response = await verifyEmail(otp);
      const updatedUser = response.data.data;
      setUser(updatedUser);
      setStoredUser(updatedUser);
      setEmailOtp("");
      setEmailOtpError("");
      setEmailOtpRequested(false);
      setEmailDevOtp("");
      addToast("Email verified successfully", "success");
    } catch (error) {
      const message = error.response?.data?.message || "Invalid or expired verification code";
      addToast(message, "error");
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleProfileImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setUploadingProfileImage(true);
      const response = await uploadMyProfileImage(file);
      const updatedUser = response.data.data;
      setUser(updatedUser);
      setStoredUser(updatedUser);
      addToast("Profile image updated successfully", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to upload profile image", "error");
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const handleProfileImageReset = async () => {
    try {
      setResettingProfileImage(true);
      const response = await resetMyProfileImage();
      const updatedUser = response.data.data;
      setUser(updatedUser);
      setStoredUser(updatedUser);
      addToast("Profile image removed successfully", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to remove profile image", "error");
    } finally {
      setResettingProfileImage(false);
    }
  };

  const updateCompanyField = (key, value) => {
    setCompanySettings((current) => ({ ...current, [key]: value }));
  };

  const updateCustomField = (index, key, value) => {
    setCompanySettings((current) => {
      const customFields = [...(current.custom_fields || [])];
      customFields[index] = { ...customFields[index], [key]: value };
      return { ...current, custom_fields: customFields };
    });
  };

  const addCustomField = () => {
    setCompanySettings((current) => ({
      ...current,
      custom_fields: [...(current.custom_fields || []), { label: "", value: "" }],
    }));
  };

  const removeCustomField = (index) => {
    setCompanySettings((current) => ({
      ...current,
      custom_fields: (current.custom_fields || []).filter((_, fieldIndex) => fieldIndex !== index),
    }));
  };

  const handleCompanySubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...companySettings,
      custom_fields: (companySettings.custom_fields || []).filter(
        (field) => (field.label || "").trim() && (field.value || "").trim(),
      ),
    };

    try {
      setSavingCompany(true);
      const response = await updateCompanySettings(payload);
      const updatedSettings = {
        ...DEFAULT_COMPANY_SETTINGS,
        ...response.data.data,
      };
      setCompanySettings(updatedSettings);
      addToast("Company settings updated successfully", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to update company settings", "error");
    } finally {
      setSavingCompany(false);
    }
  };

  const handleCompanyLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setUploadingCompanyLogo(true);
      const response = await uploadCompanyLogo(file);
      const updatedSettings = {
        ...DEFAULT_COMPANY_SETTINGS,
        ...response.data.data,
      };
      setCompanySettings(updatedSettings);
      addToast("Company logo updated successfully", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to upload company logo", "error");
    } finally {
      setUploadingCompanyLogo(false);
    }
  };

  const handleCompanyLogoReset = async () => {
    try {
      setResettingCompanyLogo(true);
      const response = await resetCompanyLogo();
      const updatedSettings = {
        ...DEFAULT_COMPANY_SETTINGS,
        ...response.data.data,
      };
      setCompanySettings(updatedSettings);
      addToast("Company logo removed successfully", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to remove company logo", "error");
    } finally {
      setResettingCompanyLogo(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading profile..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Profile & Settings</h1>
          <p className="mt-1 text-slate-600">
            Manage your account details, password, and company preferences.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-4 sm:flex-1">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)] text-xl font-bold text-white shadow-sm">
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials || <FaUserCircle size={28} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-xl font-bold text-slate-900">{displayName}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="break-all text-sm font-medium text-slate-500">@{user?.username}</p>
                  <RoleBadge role={user?.role} size="xs" />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:w-auto">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-hover)]">
                <FaCamera size={14} />
                {uploadingProfileImage ? "Uploading..." : "Upload Photo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleProfileImageUpload}
                  disabled={uploadingProfileImage}
                />
              </label>
              {user?.profile_image_url && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={FaTrash}
                  loading={resettingProfileImage}
                  onClick={handleProfileImageReset}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="First name"
                value={profileForm.firstname}
                onChange={(value) => updateProfileField("firstname", value)}
                disabled={savingProfile}
                required
              />
              <Input
                label="Last name"
                value={profileForm.lastname}
                onChange={(value) => updateProfileField("lastname", value)}
                disabled={savingProfile}
              />
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-700">Email<span className="text-rose-600">*</span></label>
                  {user?.email_verified ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                      Verified
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                      Not verified
                    </span>
                  )}
                </div>
                <Input
                  value={profileForm.email}
                  onChange={(value) => updateProfileField("email", value)}
                  disabled={savingProfile}
                  required
                />
              </div>
              <FieldDisplay label="Username" value={user?.username} />
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              {!user?.email_verified && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleRequestEmailOtp}
                    loading={sendingEmailOtp}
                  >
                    Send Verification Code
                  </Button>
                  {emailOtpRequested && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <DevOtpPanel otp={emailDevOtp} />
                      <div className="sm:w-36">
                        <Input
                          label="OTP"
                          value={emailOtp}
                          onChange={(value) => {
                            setEmailOtp(sanitizeOtp(value));
                            if (emailOtpError) setEmailOtpError("");
                          }}
                          error={emailOtpError}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          disabled={verifyingEmail}
                          required
                        />
                      </div>
                      <Button
                        type="button"
                        loading={verifyingEmail}
                        onClick={handleVerifyEmail}
                        disabled={verifyingEmail}
                      >
                        Verify Email
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <Button type="submit" loading={savingProfile} className="lg:ml-auto">
                Save Profile
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-700">
              <FaKey size={18} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Password</h2>
              <p className="text-sm text-slate-600">
                Update your password using your current password.
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="grid gap-4 lg:grid-cols-3">
            <Input
              label="Current password"
              type={passwordVisibility.current ? "text" : "password"}
              value={passwordForm.current_password}
              onChange={(value) => updatePasswordField("current_password", value)}
              disabled={savingPassword}
              endAdornment={
                <PasswordEyeButton
                  visible={passwordVisibility.current}
                  onToggle={() => setPasswordVisibility((current) => ({ ...current, current: !current.current }))}
                  label="current password"
                  disabled={savingPassword}
                />
              }
              required
            />
            <p className="text-xs text-slate-500 lg:col-span-3">New passwords require at least 8 characters, one letter, one number, and one special character.</p>
            <Input
              label="New password"
              type={passwordVisibility.new ? "text" : "password"}
              value={passwordForm.new_password}
              onChange={(value) => updatePasswordField("new_password", value)}
              disabled={savingPassword}
              endAdornment={
                <PasswordEyeButton
                  visible={passwordVisibility.new}
                  onToggle={() => setPasswordVisibility((current) => ({ ...current, new: !current.new }))}
                  label="new password"
                  disabled={savingPassword}
                />
              }
              required
            />
            <Input
              label="Confirm new password"
              type={passwordVisibility.confirm ? "text" : "password"}
              value={passwordForm.confirm_password}
              onChange={(value) => updatePasswordField("confirm_password", value)}
              disabled={savingPassword}
              endAdornment={
                <PasswordEyeButton
                  visible={passwordVisibility.confirm}
                  onToggle={() => setPasswordVisibility((current) => ({ ...current, confirm: !current.confirm }))}
                  label="confirmed password"
                  disabled={savingPassword}
                />
              }
              required
            />

            {passwordError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700 lg:col-span-3">
                {passwordError}
              </div>
            )}

            <div className="flex flex-col gap-3 lg:col-span-3 sm:flex-row sm:items-center sm:justify-between">
              <Link to="/forgot-password" className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                Forgot current password?
              </Link>
              <Button type="submit" loading={savingPassword}>
                Update Password
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3 sm:flex-1">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-700">
                {companyLogoUrl ? (
                  <img
                    src={companyLogoUrl}
                    alt={companySettings.brand_name || companySettings.company_name || "Company logo"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FaBuilding size={18} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-xl font-semibold text-slate-900">Company Details</h2>
                <p className="text-sm text-slate-600">
                  Company profile, billing identity, and operational defaults will live here.
                </p>
              </div>
            </div>
            {canEditCompany && (
              <div className="flex flex-wrap items-center justify-end gap-2 sm:w-auto">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-hover)]">
                  <FaCamera size={14} />
                  {uploadingCompanyLogo ? "Uploading..." : "Upload Logo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleCompanyLogoUpload}
                    disabled={uploadingCompanyLogo}
                  />
                </label>
                {companySettings.logo_url && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={FaTrash}
                    loading={resettingCompanyLogo}
                    onClick={handleCompanyLogoReset}
                  >
                    Reset
                  </Button>
                )}
              </div>
            )}
          </div>
          {!canEditCompany ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {companyDetailFields.map(([label, value], index) => (
                <DetailItem
                  key={`${label || "company-detail"}-${index}`}
                  label={label || "Detail"}
                  value={value}
                />
              ))}
            </div>
          ) : (
            <form onSubmit={handleCompanySubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Company name"
                  value={companySettings.company_name}
                  onChange={(value) => updateCompanyField("company_name", value)}
                  disabled={savingCompany}
                />
                <Input
                  label="Brand name"
                  value={companySettings.brand_name}
                  onChange={(value) => updateCompanyField("brand_name", value)}
                  disabled={savingCompany}
                />
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Currency</label>
                  <select
                    value={companySettings.currency}
                    onChange={(event) => updateCompanyField("currency", event.target.value)}
                    disabled={savingCompany}
                    className="app-control w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
                  >
                    {currencyOptions.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Company email"
                  value={companySettings.email}
                  onChange={(value) => updateCompanyField("email", value)}
                  disabled={savingCompany}
                />
                <Input
                  label="Phone"
                  value={companySettings.phone}
                  onChange={(value) => updateCompanyField("phone", value)}
                  disabled={savingCompany}
                />
                <Input
                  label="GST / Tax number"
                  value={companySettings.gst_number}
                  onChange={(value) => updateCompanyField("gst_number", value)}
                  disabled={savingCompany}
                />
                <Input
                  label="Website"
                  value={companySettings.website}
                  onChange={(value) => updateCompanyField("website", value)}
                  disabled={savingCompany}
                />
                <Input
                  label="Address"
                  value={companySettings.address}
                  onChange={(value) => updateCompanyField("address", value)}
                  disabled={savingCompany}
                  className="md:col-span-2"
                />
              </div>

              <div className="space-y-3">
                {(companySettings.custom_fields || []).map((field, index) => (
                  <div key={`custom-field-${index}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <Input
                      placeholder="Label"
                      value={field.label}
                      onChange={(value) => updateCustomField(index, "label", value)}
                      disabled={savingCompany}
                    />
                    <Input
                      placeholder="Value"
                      value={field.value}
                      onChange={(value) => updateCustomField(index, "value", value)}
                      disabled={savingCompany}
                    />
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      icon={FaTrash}
                      onClick={() => removeCustomField(index)}
                      className="bg-rose-600 text-white hover:bg-rose-700 md:self-center"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="secondary" size="sm" icon={FaPlus} onClick={addCustomField}>
                  Add Field
                </Button>
                <Button type="submit" loading={savingCompany} className="sm:ml-auto">
                  Save Company Settings
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}

export default UserSettings;
