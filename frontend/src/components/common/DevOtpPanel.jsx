import { useState } from "react";
import { FaCheck, FaCopy } from "react-icons/fa";

function DevOtpPanel({ otp }) {
  const [copied, setCopied] = useState(false);
  if (!otp) return null;

  const copyOtp = async () => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(otp);
    } else {
      const input = document.createElement("textarea");
      input.value = otp;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Development OTP</p>
        <p className="font-mono text-lg font-bold tracking-[0.2em] text-amber-950">{otp}</p>
      </div>
      <button type="button" onClick={copyOtp} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100" title="Copy OTP" aria-label="Copy development OTP">
        {copied ? <FaCheck size={13} /> : <FaCopy size={13} />}
      </button>
    </div>
  );
}

export default DevOtpPanel;
