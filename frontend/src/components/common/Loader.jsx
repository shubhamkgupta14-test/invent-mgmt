import { FaSpinner } from "react-icons/fa";

function Loader({ fullScreen = true, message = "Loading..." }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <FaSpinner className="text-indigo-600 text-4xl animate-spin" />
      <p className="text-slate-600 font-medium">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {content}
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-96 w-full">
      {content}
    </div>
  );
}

export default Loader;
