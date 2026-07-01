import Modal from "./Modal";
import { formatMoney } from "../../utils/formatters";

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return value.toLocaleString("en-IN");
  return value;
}

function DetailModal({ isOpen, onClose, title, sections = [], size = "2xl" }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <div className="space-y-5">
        {sections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-border bg-slate-50 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              {section.title}
            </h3>
            {section.render ? (
              section.render()
            ) : (
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {section.fields.map((field) => (
                  <div key={field.label}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {field.label}
                    </p>
                    <div className="mt-1 text-sm font-medium text-slate-900 break-words">
                      {field.render
                        ? field.render(field.value)
                        : field.money
                          ? formatMoney(field.value)
                          : formatValue(field.value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </Modal>
  );
}

export default DetailModal;
