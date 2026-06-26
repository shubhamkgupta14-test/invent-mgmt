import { FaExclamationTriangle } from "react-icons/fa";
import Modal from "./Modal";
import Button from "./Button";

export function ConfirmDialog({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to continue?",
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  danger = true,
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <div className="space-y-4">
        {/* Icon & Message */}
        <div className="flex items-start gap-3">
          <div
            className={`flex-shrink-0 p-2 rounded-lg ${danger ? "bg-rose-100" : "bg-amber-100"}`}
          >
            <FaExclamationTriangle
              className={danger ? "text-rose-600" : "text-amber-600"}
              size={20}
            />
          </div>
          <p className="text-slate-700 text-sm leading-relaxed">{message}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
            disabled={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
