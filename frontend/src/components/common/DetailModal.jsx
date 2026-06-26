import Modal from "./Modal";

const money = (value = 0) => `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return value.toLocaleString("en-IN");
  return value;
}

function DetailModal({ isOpen, onClose, title, sections = [] }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="2xl">
      <div className="space-y-5">
        {sections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-border bg-slate-50 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              {section.title}
            </h3>
            {section.render ? (
              section.render()
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {section.fields.map((field) => (
                  <div key={field.label}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {field.label}
                    </p>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      {field.render
                        ? field.render(field.value)
                        : field.money
                          ? money(field.value)
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
