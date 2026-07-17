import { FaSpinner } from "react-icons/fa";
import PageSkeleton from "./PageSkeleton";

function inferSkeleton(message) {
  const text = String(message).toLowerCase();
  if (text.includes("dashboard")) return "dashboard";
  if (text.includes("mailer")) return "mail";
  if (text.includes("notification")) return "cards";
  if (text.includes("profile") || text.includes("admin")) return "settings";
  if (text.includes("form") || text.includes("generator") || text.includes("calculator")) return "form";
  return "table";
}

function Loader({ fullScreen = true, message = "Loading...", variant }) {
  if (fullScreen) {
    return <PageSkeleton variant={variant || inferSkeleton(message)} label={message} />;
  }

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <FaSpinner className="text-indigo-600 text-4xl animate-spin" />
      <p className="text-slate-600 font-medium">{message}</p>
    </div>
  );

  return (
    <div className="flex justify-center items-center h-96 w-full">
      {content}
    </div>
  );
}

export default Loader;
