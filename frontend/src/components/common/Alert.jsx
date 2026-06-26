import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";

function Alert({ alert, onClose }) {
  if (!alert) return null;

  return (
    <div
      className={`mb-4 rounded-lg border p-4 flex justify-between items-start ${
        alert.type === "success"
          ? "border-green-300 bg-green-50"
          : "border-red-300 bg-red-50"
      }`}
    >
      {" "}
      <div>
        <div className="flex items-center gap-2">
          {alert.type === "success" ? (
            <FaCheckCircle className="text-green-600" />
          ) : (
            <FaExclamationCircle className="text-red-600" />
          )}

          <p
            className={`font-semibold ${
              alert.type === "success" ? "text-green-700" : "text-red-700"
            }`}
          >
            {alert.message}
          </p>
        </div>

        {alert.details?.length > 0 && (
          <ul className="mt-2 text-sm text-red-600 space-y-1">
            {alert.details.map((item, index) => (
              <li key={index}>
                • {item.field?.replace("body.", "")}: {item.message}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
        ✕
      </button>
    </div>
  );
}

export default Alert;
