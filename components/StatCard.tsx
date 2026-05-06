type Props = { title: string; value: string | number; hint?: string };

export default function StatCard({ title, value, hint }: Props) {
  return (
    <div className="glass-card rounded-2xl p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}