export const toggleSort = (current, field) => ({
  field,
  order: current.field === field && current.order === "asc" ? "desc" : "asc",
});

export const sortRecords = (records, sortConfig, accessors = {}) => {
  if (!sortConfig?.field) return records;

  const getValue = (record) => {
    const accessor = accessors[sortConfig.field];
    return accessor ? accessor(record) : record?.[sortConfig.field];
  };

  return [...records].sort((first, second) => {
    const firstValue = getValue(first);
    const secondValue = getValue(second);

    if (firstValue === secondValue) return 0;
    if (firstValue === null || firstValue === undefined) return 1;
    if (secondValue === null || secondValue === undefined) return -1;

    const firstNumber = Number(firstValue);
    const secondNumber = Number(secondValue);
    const bothNumeric = !Number.isNaN(firstNumber) && !Number.isNaN(secondNumber);

    const result = bothNumeric
      ? firstNumber - secondNumber
      : String(firstValue).localeCompare(String(secondValue), undefined, {
          numeric: true,
          sensitivity: "base",
        });

    return sortConfig.order === "asc" ? result : -result;
  });
};
