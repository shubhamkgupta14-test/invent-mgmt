import { useRef, useState } from "react";
import { FaChevronDown, FaFileExcel, FaFilePdf } from "react-icons/fa";
import Button from "./Button";
import { exportToExcel, exportToPdf } from "../../utils/exportData";
import useCompanySettings from "../../hooks/useCompanySettings";

function ExportMenu({ rows = [], columns = [], filename, title, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [menuAlign, setMenuAlign] = useState("right");
  const buttonRef = useRef(null);
  const { settings, brand } = useCompanySettings();
  const isDisabled = disabled || !rows.length || !columns.length;

  const toggleOpen = () => {
    if (!open) {
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      setMenuAlign(buttonRect && buttonRect.left < 192 ? "left" : "right");
    }
    setOpen((current) => !current);
  };

  const handleExcel = () => {
    exportToExcel({ rows, columns, filename, sheetName: title });
    setOpen(false);
  };

  const handlePdf = () => {
    exportToPdf({
      rows,
      columns,
      title,
      company: {
        ...settings,
        name: brand.name,
        logoUrl: settings.logo_url ? brand.logoUrl : "",
      },
    });
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        type="button"
        variant="secondary"
        size="md"
        onClick={toggleOpen}
        disabled={isDisabled}
        className="border-slate-300 bg-slate-100 text-slate-800 hover:border-slate-400 hover:bg-slate-200"
      >
        Export
        <FaChevronDown size={12} />
      </Button>
      {open && !isDisabled && (
        <div className={`absolute z-30 mt-2 w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-xl ${menuAlign === "left" ? "left-0" : "right-0"}`}>
          <button
            type="button"
            onClick={handleExcel}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-[var(--surface-hover)]"
          >
            <FaFileExcel className="text-emerald-600" size={14} />
            Export to Excel
          </button>
          <button
            type="button"
            onClick={handlePdf}
            className="flex w-full items-center gap-2 border-t border-[var(--border)] px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-[var(--surface-hover)]"
          >
            <FaFilePdf className="text-rose-600" size={14} />
            Export to PDF
          </button>
        </div>
      )}
    </div>
  );
}

export default ExportMenu;
