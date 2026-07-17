import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaEnvelopeOpenText,
  FaInbox,
  FaPaperPlane,
  FaPen,
  FaReply,
  FaSearch,
  FaStar,
  FaTrash,
} from "react-icons/fa";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import MainLayout from "../layouts/MainLayout";
import AdminLayout from "../layouts/AdminLayout";
import {
  bulkDeleteMail,
  deleteMail,
  getMail,
  getMailSignature,
  markMailRead,
  sendMail,
  updateMailStar,
} from "../api/mailerApi";
import { useToast } from "../context/useToast";
import { formatDateTimeIST } from "../utils/formatters";

const emptyForm = {
  to: "",
  subject: "",
  body: "",
  suppress_signature: false,
};

const folders = [
  { key: "inbox", label: "Inbox", icon: FaInbox },
  { key: "sent", label: "Sent", icon: FaPaperPlane },
  { key: "starred", label: "Star", icon: FaStar },
];
const signatureStartMarker = "[[MAIL_SIGNATURE_START]]";
const signatureEndMarker = "[[MAIL_SIGNATURE_END]]";

function previewText(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > 92 ? `${text.slice(0, 92)}...` : text;
}

function recipientLabel(message) {
  const names = message?.to_names?.length
    ? message.to_names
    : [message?.to_name || message?.to_username].filter(Boolean);
  return names.join(", ") || "-";
}

function buildReplyThread(message, signatureText = "") {
  if (!message) return "";

  const from = message.from_name || message.from_username || "-";
  const to = recipientLabel(message);
  const date = formatDateTimeIST(message.created_at);
  const subject = message.subject || "-";
  const originalSignature = message.signature
    ? [
        signatureStartMarker,
        message.signature,
        signatureEndMarker,
      ].join("\n")
    : "";
  const originalBody = [message.body, originalSignature]
    .filter(Boolean)
    .join("\n\n");

  return [
    "",
    "",
    signatureText ? signatureStartMarker : null,
    signatureText,
    signatureText ? signatureEndMarker : null,
    signatureText ? "" : null,
    "---------- Original Message ----------",
    `From: ${from}`,
    `To: ${to}`,
    `Date: ${date}`,
    `Subject: ${subject}`,
    "",
    originalBody,
  ].filter((line) => line !== null).join("\n");
}

function SignatureBlock({ text, className = "" }) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return null;

  const [name, role, contact, brand] = lines;

  return (
    <div
      className={`border-l-4 border-indigo-400 pl-4 leading-6 ${className}`}
    >
      {name && (
        <p
          className="text-xl text-indigo-900"
          style={{
            fontFamily:
              "'Segoe Script', 'Brush Script MT', 'Lucida Handwriting', cursive",
          }}
        >
          {name}
        </p>
      )}
      {role && (
        <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {role}
        </p>
      )}
      {contact && (
        <p className="mt-0.5 text-xs font-medium text-sky-700">
          {contact}
        </p>
      )}
      {brand && (
        <p className="mt-0.5 text-xs font-bold text-indigo-700">
          {brand}
        </p>
      )}
    </div>
  );
}

function renderFormattedBody(body = "") {
  const segments = [];
  const plainSignatureBeforeOriginalRegex =
    /(^|\n\n)([^\n]+(?:\n[^\n]+){1,3})\n\n(?=---------- Original Message ----------)/g;
  const bodyWithMarkedLegacySignatures = body.replace(
    plainSignatureBeforeOriginalRegex,
    (match, prefix, signatureText) => {
      if (
        signatureText.includes(signatureStartMarker) ||
        signatureText.startsWith("From:") ||
        signatureText.startsWith("To:") ||
        signatureText.startsWith("Date:") ||
        signatureText.startsWith("Subject:")
      ) {
        return match;
      }
      return `${prefix}${signatureStartMarker}\n${signatureText}\n${signatureEndMarker}\n\n`;
    },
  );
  const markerRegex = /\[\[MAIL_SIGNATURE_START\]\]([\s\S]*?)\[\[MAIL_SIGNATURE_END\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = markerRegex.exec(bodyWithMarkedLegacySignatures)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: bodyWithMarkedLegacySignatures.slice(lastIndex, match.index),
      });
    }
    segments.push({ type: "signature", value: match[1].trim() });
    lastIndex = markerRegex.lastIndex;
  }

  if (lastIndex < bodyWithMarkedLegacySignatures.length) {
    segments.push({
      type: "text",
      value: bodyWithMarkedLegacySignatures.slice(lastIndex),
    });
  }

  return segments.map((segment, index) => {
    if (segment.type === "signature") {
      return <SignatureBlock key={`signature-${index}`} text={segment.value} className="my-5" />;
    }

    return (
      <p
        key={`text-${index}`}
        className="whitespace-pre-wrap text-sm leading-7 text-slate-700"
      >
        {segment.value}
      </p>
    );
  });
}

function MessagePreview({
  message,
  retentionDays,
  onReply,
  onStar,
  onDelete,
  onBack,
  mobile = false,
}) {
  if (!message) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center text-slate-500">
        <FaEnvelopeOpenText size={34} className="text-slate-300" />
        <p className="mt-3 text-sm font-semibold">Select a mail to preview.</p>
      </div>
    );
  }

  const isSent = message.folder === "sent";

  return (
    <div className="flex h-full min-h-[420px] flex-col bg-white">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            {mobile && (
              <button
                type="button"
                onClick={onBack}
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
                title="Back"
              >
                <FaArrowLeft size={14} />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="break-words text-xl font-bold text-slate-900">
                {message.subject}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isSent
                  ? `To: ${recipientLabel(message)}`
                  : `From: ${message.from_name || message.from_username}`}
              </p>
              <p className="text-xs text-slate-500">
                {formatDateTimeIST(message.created_at)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isSent && (
            <button
              type="button"
              onClick={onReply}
              disabled={message.from_username === "system"}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              title="Reply"
            >
              <FaReply size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onStar(message)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
              message.starred
                ? "text-amber-500 hover:bg-amber-50"
                : "text-slate-500 hover:bg-slate-100 hover:text-amber-500"
            }`}
            title={message.starred ? "Unstar" : "Star"}
          >
            <FaStar size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(message.message_id)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
            title="Delete"
          >
            <FaTrash size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {message.system_generated && message.html_body ? (
          <iframe
            title={message.subject || "Mail preview"}
            srcDoc={message.html_body}
            sandbox=""
            className="h-full min-h-[560px] w-full rounded-xl border border-border bg-white"
          />
        ) : (
          <>
            {renderFormattedBody(message.body)}
            {message.signature && (
              <SignatureBlock text={message.signature} className="mt-8" />
            )}
          </>
        )}
      </div>

      <div className="border-t border-border px-5 py-3 text-xs text-slate-500">
        Unstarred mail auto-deletes after {retentionDays} day
        {retentionDays === 1 ? "" : "s"}. Star mail to keep it.
      </div>
    </div>
  );
}

function Mailer({ adminPortal = false }) {
  const Layout = adminPortal ? AdminLayout : MainLayout;
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [signature, setSignature] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [retentionDays, setRetentionDays] = useState(1);
  const [composeOpen, setComposeOpen] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const selectedMessage = useMemo(
    () => messages.find((message) => message.message_id === selectedId) || null,
    [messages, selectedId],
  );

  const loadMail = useCallback(async () => {
    const response = await getMail({
      search: search.trim() || undefined,
      folder: activeFolder === "starred" ? "all" : activeFolder,
      starred: activeFolder === "starred",
    });
    const data = response.data.data || {};
    const nextMessages = data.messages || [];
    setMessages(nextMessages);
    setUnreadCount(data.unread_count || 0);
    setRetentionDays(data.retention_days || 1);
    setSelectedIds((current) =>
      current.filter((id) => nextMessages.some((message) => message.message_id === id)),
    );
    setSelectedId((current) =>
      nextMessages.some((message) => message.message_id === current)
        ? current
        : nextMessages[0]?.message_id || "",
    );
  }, [activeFolder, search]);

  useEffect(() => {
    const loadId = window.setTimeout(() => {
      Promise.all([
        loadMail(),
        getMailSignature().then((response) => setSignature(response.data.data)),
      ])
        .catch(() => addToast("Failed to load mailer", "error"))
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(loadId);
  }, [addToast, loadMail]);

  const selectMessage = async (message) => {
    setSelectedId(message.message_id);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setMobilePreviewOpen(true);
    }
    if (!message.read && message.folder !== "sent") {
      try {
        const response = await markMailRead(message.message_id);
        const updated = response.data.data;
        setMessages((current) =>
          current.map((item) =>
            item.message_id === updated.message_id ? updated : item,
          ),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
        window.dispatchEvent(new Event("mailer:changed"));
      } catch {
        // Selection should still work even if the read marker fails.
      }
    }
  };

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!form.to.trim() || !form.subject.trim() || !form.body.trim()) {
      addToast("To, subject, and body are required", "error");
      return;
    }

    try {
      setSending(true);
      const response = await sendMail(form);
      const data = response.data.data || {};
      setForm(emptyForm);
      setComposeOpen(false);
      await loadMail();
      window.dispatchEvent(new Event("mailer:changed"));
      const missingCount = data.missing_recipients?.length || 0;
      addToast(
        data.delivered_count
          ? `Mail sent to ${data.delivered_count} user${data.delivered_count === 1 ? "" : "s"}${missingCount ? `. ${missingCount} not found.` : "."}`
          : "User not found. System mail added to your inbox.",
        missingCount ? "warning" : "success",
      );
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to send mail", "error");
    } finally {
      setSending(false);
    }
  };

  const handleReply = () => {
    if (!selectedMessage || selectedMessage.from_username === "system") return;
    setForm({
      to: selectedMessage.from_username,
      subject: selectedMessage.subject?.startsWith("Re:")
        ? selectedMessage.subject
        : `Re: ${selectedMessage.subject || ""}`,
      body: buildReplyThread(selectedMessage, signature?.text || ""),
      suppress_signature: true,
    });
    setComposeOpen(true);
  };

  const handleStar = async (message) => {
    try {
      const response = await updateMailStar(message.message_id, !message.starred);
      const updated = response.data.data;
      setMessages((current) =>
        activeFolder === "starred" && !updated.starred
          ? current.filter((item) => item.message_id !== updated.message_id)
          : current.map((item) =>
              item.message_id === updated.message_id ? updated : item,
            ),
      );
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to update star", "error");
    }
  };

  const handleDelete = async (messageId) => {
    try {
      await deleteMail(messageId);
      setMessages((current) => current.filter((item) => item.message_id !== messageId));
      setSelectedIds((current) => current.filter((id) => id !== messageId));
      setSelectedId((current) => (current === messageId ? "" : current));
      setMobilePreviewOpen(false);
      window.dispatchEvent(new Event("mailer:changed"));
      addToast("Mail deleted", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to delete mail", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    try {
      await bulkDeleteMail(selectedIds);
      await loadMail();
      setSelectedIds([]);
      window.dispatchEvent(new Event("mailer:changed"));
      addToast("Selected mail deleted", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to delete selected mail", "error");
    }
  };

  const toggleSelected = (messageId) => {
    setSelectedIds((current) =>
      current.includes(messageId)
        ? current.filter((id) => id !== messageId)
        : [...current, messageId],
    );
  };

  const switchFolder = (folder) => {
    setActiveFolder(folder);
    setSelectedIds([]);
    setMobilePreviewOpen(false);
  };

  const allSelected = messages.length > 0 && selectedIds.length === messages.length;

  if (loading) {
    return (
      <Layout>
        <Loader message="Loading mailer..." />
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <div className="flex h-[calc(100vh-96px)] min-h-0 flex-col overflow-hidden">
      <div className="mb-5 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mailer</h1>
          <p className="mt-1 text-slate-600">
            Internal mail for application users.
          </p>
        </div>
        <Button
          icon={FaPen}
          onClick={() => {
            setForm(emptyForm);
            setComposeOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          Compose
        </Button>
      </div>

      <Card className="min-h-0 min-w-0 flex-1 overflow-hidden p-0">
        <div className="grid h-full min-h-0 min-w-0 overflow-hidden lg:grid-cols-[190px_390px_minmax(0,1fr)]">
          <aside className="overflow-x-auto border-b border-border bg-slate-50/70 p-3 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <div className="flex gap-2 lg:block lg:space-y-1">
              {folders.map((folder) => (
                <button
                  key={folder.key}
                  type="button"
                  onClick={() => switchFolder(folder.key)}
                  className={`flex min-w-max items-center justify-between gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition lg:w-full ${
                    activeFolder === folder.key
                      ? "bg-indigo-100 text-indigo-800"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <folder.icon size={15} />
                    {folder.label}
                  </span>
                  {folder.key === "inbox" && unreadCount > 0 && (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
            <div className="space-y-3 border-b border-border px-4 py-3">
              <Input
                value={search}
                onChange={setSearch}
                placeholder="Search mail"
                icon={FaSearch}
              />
              <div className="flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(event) =>
                      setSelectedIds(event.target.checked ? messages.map((m) => m.message_id) : [])
                    }
                    className="h-4 w-4 accent-indigo-600"
                  />
                  Select
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={!selectedIds.length}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Delete selected"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {messages.map((message) => {
                const isSent = message.folder === "sent";

                return (
                  <div
                    key={message.message_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectMessage(message)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectMessage(message);
                      }
                    }}
                    className={`flex cursor-pointer gap-3 border-b border-border px-4 py-3 transition hover:bg-slate-50 ${
                      selectedId === message.message_id ? "bg-indigo-50/70" : "bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(message.message_id)}
                      onChange={() => toggleSelected(message.message_id)}
                      onClick={(event) => event.stopPropagation()}
                      className="mt-1 h-4 w-4 flex-shrink-0 accent-indigo-600"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`truncate text-sm ${
                            message.read || isSent
                              ? "font-semibold text-slate-700"
                              : "font-bold text-slate-950"
                          }`}
                        >
                          {message.subject}
                        </p>
                      </div>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                        {isSent
                          ? `To: ${recipientLabel(message)}`
                          : `From: ${message.from_name || message.from_username}`}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {previewText(message.body)}
                      </p>
                    </div>
                    {message.starred && (
                      <FaStar className="mt-1 shrink-0 text-amber-500" size={13} />
                    )}
                  </div>
                );
              })}
              {!messages.length && (
                <div className="p-8 text-center text-sm text-slate-500">
                  No mail found.
                </div>
              )}
            </div>
          </section>

          <section className="hidden min-h-0 min-w-0 overflow-hidden lg:block">
            <MessagePreview
              message={selectedMessage}
              retentionDays={retentionDays}
              onReply={handleReply}
              onStar={handleStar}
              onDelete={handleDelete}
            />
          </section>
        </div>
      </Card>
      </div>

      <Modal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="Compose Mail"
        size="2xl"
      >
        <form onSubmit={handleSend} className="space-y-4">
          <Input
            label="To"
            value={form.to}
            onChange={(value) => updateForm("to", value)}
            placeholder="Username/email, username/email"
            required
          />
          <Input
            label="Subject"
            value={form.subject}
            onChange={(value) => updateForm("subject", value)}
            placeholder="Subject"
            required
          />
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Body<span className="text-rose-600">*</span>
            </label>
            <textarea
              value={form.body}
              onChange={(event) => updateForm("body", event.target.value)}
              rows={8}
              placeholder="Write your message"
              className="app-control w-full resize-y rounded-xl px-4 py-3 text-sm leading-6 placeholder-slate-400"
            />
          </div>

          {!form.suppress_signature && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                Signature
              </p>
              <SignatureBlock text={signature?.text || ""} className="mt-2" />
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" icon={FaPaperPlane} loading={sending}>
              Send Mail
            </Button>
          </div>
        </form>
      </Modal>

      {mobilePreviewOpen && selectedMessage && (
        <div className="fixed inset-0 z-50 bg-white lg:hidden">
          <MessagePreview
            message={selectedMessage}
            retentionDays={retentionDays}
            onReply={handleReply}
            onStar={handleStar}
            onDelete={handleDelete}
            onBack={() => setMobilePreviewOpen(false)}
            mobile
          />
        </div>
      )}
    </Layout>
  );
}

export default Mailer;
