import { FaPencilAlt, FaTrash, FaEye } from "react-icons/fa";

export function ActionButtons({
  onEdit,
  onDelete,
  onView,
  loading = false,
  variant = "compact", // compact or full
}) {
  if (variant === "full") {
    return (
      <div className="flex items-center gap-2">
        {onView && (
          <button
            onClick={onView}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            title="View"
          >
            <FaEye size={16} />
            <span className="text-sm font-medium">View</span>
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
            className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
      {onView && (
        <button
          onClick={onView}
          disabled={loading}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          title="View"
        >
          <FaEye size={16} />
        </button>
      )}
      {onEdit && (
        <button
          onClick={onEdit}
          disabled={loading}
          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          title="Edit"
        >
          <FaPencilAlt size={16} />
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          disabled={loading}
          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          title="Delete"
        >
          <FaTrash size={16} />
        </button>
      )}
    </div>
  );
}

export default ActionButtons;
