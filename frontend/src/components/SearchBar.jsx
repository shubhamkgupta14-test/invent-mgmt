function SearchBar({ value, onChange, placeholder = "Search..." }) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="
        w-full
        p-3
        border
        rounded-lg
        focus:outline-none
        focus:ring-2
        focus:ring-blue-300
      "
    />
  );
}

export default SearchBar;
