import { FaPencilAlt, FaTrash } from "react-icons/fa";

export function ActionButtons({
  onEdit,
  onDelete,
  loading = false,
  variant = "compact", // compact or full
}) {
  if (variant === "full") {
    return (
      <div className="flex items-center gap-2">
        {onEdit && (
          <button
            onClick={onEdit}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-[var(--secondary)] px-3 py-2 text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--secondary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            title="Edit"
          >
            <FaPencilAlt size={16} />
            <span className="text-sm font-medium">Edit</span>
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            title="Delete"
          >
            <FaTrash size={16} />
            <span className="text-sm font-medium">Delete</span>
          </button>
        )}
      </div>
    );
  }

  // Compact icon-only version
  return (
    <div className="flex items-center gap-2">
      {onEdit && (
        <button
          onClick={onEdit}
          disabled={loading}
          className="rounded-lg p-2 text-[var(--link)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--link-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          title="Edit"
        >
          <FaPencilAlt size={16} />
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          disabled={loading}
          className="rounded-lg p-2 text-[var(--destructive)] transition-colors hover:bg-rose-50 hover:text-[var(--destructive-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          title="Delete"
        >
          <FaTrash size={16} />
        </button>
      )}
    </div>
  );
}

export default ActionButtons;
