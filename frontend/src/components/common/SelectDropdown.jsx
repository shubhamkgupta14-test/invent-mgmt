import { useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown } from "react-icons/fa";

function SelectDropdown({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select Option",
  valueKey = "value",
  labelKey = "label",
  className = "",
  disabled = false,
  required = false,
  allowCustom = false,
  maxVisibleOptions = 8,
}) {
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalizedOptions = useMemo(
    () => options.map((option) => ({
      value: option[valueKey],
      label: option[labelKey],
    })),
    [labelKey, options, valueKey],
  );

  const selectedOption = normalizedOptions.find((option) => option.value === value);
  const displayValue = selectedOption?.label || value || "";

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return normalizedOptions;

    return normalizedOptions.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(needle),
    );
  }, [normalizedOptions, query]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const selectOption = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    setQuery(nextValue);
    setOpen(true);

    if (allowCustom) {
      onChange(nextValue);
    }
  };

  const handleFocus = () => {
    if (!disabled) {
      setQuery(displayValue);
      setOpen(true);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
      return;
    }

    if (event.key === "Enter" && open) {
      event.preventDefault();
      if (filteredOptions.length) {
        selectOption(filteredOptions[0].value);
      } else if (allowCustom) {
        selectOption(query);
      }
    }
  };

  return (
    <div ref={wrapperRef} className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-rose-600">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={open ? query : displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          className={`app-control w-full rounded-xl px-4 py-2.5 pr-10 text-sm transition ${className}`}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            inputRef.current?.focus();
            setQuery(displayValue);
            setOpen(true);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Toggle options"
          tabIndex={-1}
        >
          <FaChevronDown size={14} />
        </button>

        {open && !disabled && (
          <div
            className="absolute z-40 mt-1 w-full overflow-y-auto rounded-xl border border-border bg-white py-1 shadow-lg"
            style={{ maxHeight: `${Math.max(maxVisibleOptions, 3) * 42}px` }}
          >
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option.value)}
                className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 ${
                  option.value === value ? "bg-indigo-50 font-semibold text-[var(--primary)]" : "text-slate-700"
                }`}
                title={option.label}
              >
                <span className="block truncate">{option.label}</span>
              </button>
            ))}

            {!filteredOptions.length && (
              <div className="px-4 py-3 text-sm text-slate-500">
                {allowCustom ? "Press Enter to use this value" : "No matches found"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SelectDropdown;
