type MetricCardProps = {
  label: string;
  value: string;
  description?: string;
};

export function MetricCard({ label, value, description }: MetricCardProps) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.92))] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-orange-400 to-emerald-300" aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {description ? <p className="mt-2 text-xs leading-5 text-slate-600">{description}</p> : null}
    </article>
  );
}
