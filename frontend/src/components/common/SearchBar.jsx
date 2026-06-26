import { FaSearch } from "react-icons/fa";

function SearchBar({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="relative rounded-lg border border-border bg-white shadow-sm transition-all duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
        <FaSearch size={14} />
      </div>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-transparent px-12 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
      />
    </div>
  );
}

export default SearchBar;
