const Block = ({ className = "" }) => (
  <div className={`rounded-lg bg-slate-200/80 ${className}`} />
);

const PageHeading = () => (
  <div className="mb-7 space-y-3">
    <Block className="h-8 w-48" />
    <Block className="h-4 w-full max-w-md" />
  </div>
);

const Toolbar = () => (
  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <Block className="h-10 w-full sm:max-w-sm" />
    <div className="flex gap-2">
      <Block className="h-10 w-24" />
      <Block className="h-10 w-28" />
    </div>
  </div>
);

const TableRows = ({ rows = 7, columns = 5 }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="grid gap-5 border-b border-slate-200 bg-slate-50 px-5 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: columns }, (_, index) => <Block key={index} className="h-3" />)}
    </div>
    {Array.from({ length: rows }, (_, row) => (
      <div key={row} className="grid gap-5 border-b border-slate-100 px-5 py-3.5 last:border-0" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, column) => (
          <Block key={column} className={`h-4 ${column === 0 ? "w-4/5" : "w-full"}`} />
        ))}
      </div>
    ))}
  </div>
);

const TableSkeleton = () => (
  <>
    <PageHeading />
    <Toolbar />
    <TableRows />
  </>
);

const DashboardSkeleton = () => (
  <>
    <PageHeading />
    <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3"><Block className="h-4 w-28" /><Block className="h-8 w-24" /></div>
            <Block className="h-12 w-12 rounded-xl" />
          </div>
          <div className="mt-5 flex justify-between border-t border-slate-100 pt-3"><Block className="h-3 w-20" /><Block className="h-3 w-24" /></div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2"><TableRows rows={5} columns={3} /><TableRows rows={5} columns={3} /></div>
  </>
);

const FormSkeleton = () => (
  <>
    <PageHeading />
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <Block className="mb-6 h-6 w-44" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="space-y-2"><Block className="h-3 w-24" /><Block className="h-10 w-full" /></div>
        ))}
      </div>
      <div className="mt-7 flex justify-end gap-3"><Block className="h-10 w-24" /><Block className="h-10 w-32" /></div>
    </div>
  </>
);

const SettingsSkeleton = () => (
  <>
    <PageHeading />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Block className="mx-auto h-24 w-24 rounded-full" />
        <Block className="mx-auto mt-4 h-5 w-32" />
        <div className="mt-7 space-y-3">{Array.from({ length: 5 }, (_, index) => <Block key={index} className="h-9 w-full" />)}</div>
      </div>
      <FormSkeleton />
    </div>
  </>
);

const MailSkeleton = () => (
  <>
    <PageHeading />
    <div className="grid min-h-[520px] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[220px_340px_1fr]">
      <div className="space-y-3 border-r border-slate-200 p-4">{Array.from({ length: 6 }, (_, index) => <Block key={index} className="h-10 w-full" />)}</div>
      <div className="space-y-4 border-r border-slate-200 p-4">{Array.from({ length: 7 }, (_, index) => <Block key={index} className="h-14 w-full" />)}</div>
      <div className="space-y-4 p-6"><Block className="h-7 w-2/3" /><Block className="h-4 w-1/3" /><Block className="mt-8 h-4 w-full" /><Block className="h-4 w-5/6" /><Block className="h-4 w-3/4" /></div>
    </div>
  </>
);

const CardsSkeleton = () => (
  <>
    <PageHeading />
    <Toolbar />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex gap-4"><Block className="h-11 w-11 rounded-full" /><div className="flex-1 space-y-3"><Block className="h-5 w-2/5" /><Block className="h-4 w-full" /><Block className="h-4 w-4/5" /></div></div></div>
      ))}
    </div>
  </>
);

const skeletons = {
  dashboard: DashboardSkeleton,
  form: FormSkeleton,
  settings: SettingsSkeleton,
  mail: MailSkeleton,
  cards: CardsSkeleton,
  table: TableSkeleton,
};

function PageSkeleton({ variant = "table", label = "Loading page" }) {
  const Skeleton = skeletons[variant] || TableSkeleton;
  return (
    <div className="w-full animate-pulse px-1 py-3" role="status" aria-label={label}>
      <Skeleton />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default PageSkeleton;
