import { useRef, useState } from "react";
import { FaChevronDown, FaDownload, FaUpload } from "react-icons/fa";
import * as XLSX from "xlsx";
import Button from "./Button";

const BULK_UPLOAD_MAX_FILE_SIZE_MB = 5;
const BULK_UPLOAD_MAX_FILE_SIZE = BULK_UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024;

function BulkUpdateMenu({
  headers,
  sampleRows,
  sampleFileName,
  uploadFile,
  onResult,
  onUploaded,
  addToast,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [menuAlign, setMenuAlign] = useState("right");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);
  const buttonRef = useRef(null);
  const inFlightRef = useRef("");

  const downloadSample = () => {
    const worksheet = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    worksheet["!cols"] = headers.map((header) => ({ wch: Math.max(header.length + 2, 14) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bulk Upload");
    XLSX.writeFile(workbook, sampleFileName);
    setOpen(false);
  };

  const chooseFile = () => {
    if (uploading) return;
    setOpen(false);
    inputRef.current?.click();
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploading) return;

    const fileKey = `${file.name}:${file.size}:${file.lastModified}`;
    if (inFlightRef.current === fileKey) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      addToast("Only .xlsx Excel files are allowed", "error");
      return;
    }

    if (file.size > BULK_UPLOAD_MAX_FILE_SIZE) {
      addToast(`File size must be ${BULK_UPLOAD_MAX_FILE_SIZE_MB}MB or less`, "error");
      return;
    }

    try {
      setUploading(true);
      inFlightRef.current = fileKey;
      const response = await uploadFile(file);
      const result = response.data?.data;
      onResult(result);
      const summary = result?.summary || {};
      addToast(
        `Bulk upload completed: ${summary.created || 0} created, ${summary.failed || 0} failed`,
        summary.failed ? "warning" : "success",
      );
      if (summary.created) await onUploaded?.();
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to upload file", "error");
    } finally {
      setUploading(false);
      inFlightRef.current = "";
    }
  };

  const toggleOpen = () => {
    if (!open) {
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      setMenuAlign(buttonRect && buttonRect.left < 224 ? "left" : "right");
    }
    setOpen((current) => !current);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={handleFile}
        disabled={uploading || disabled}
      />
      <Button
        ref={buttonRef}
        variant="secondary"
        size="md"
        icon={FaUpload}
        loading={uploading}
        disabled={uploading || disabled}
        onClick={toggleOpen}
        className="border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100"
      >
        Bulk Upload
        {!uploading && <FaChevronDown size={12} />}
      </Button>
      {open && (
        <div className={`absolute z-30 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-xl ${menuAlign === "left" ? "left-0" : "right-0"}`}>
          <button
            type="button"
            onClick={downloadSample}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-[var(--surface-hover)]"
          >
            <FaDownload size={14} />
            Download Sample
          </button>
          <button
            type="button"
            onClick={chooseFile}
            className="flex w-full items-center gap-2 border-t border-[var(--border)] px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-[var(--surface-hover)]"
          >
            <FaUpload size={14} />
            Upload Excel
          </button>
        </div>
      )}
    </div>
  );
}

export default BulkUpdateMenu;
