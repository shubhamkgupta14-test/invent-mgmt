import { FaSearch } from "react-icons/fa";

function SearchBar({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="app-control relative rounded-xl transition-all duration-200">
      <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
        <FaSearch size={14} />
      </div>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-transparent px-12 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
      />
    </div>
  );
}

export default SearchBar;
