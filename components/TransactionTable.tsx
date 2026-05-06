import { TransactionRow } from "@/lib/state";

function formatTime(ts: string) {
  return new Date(ts).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

export default function TransactionTable({ rows }: { rows: TransactionRow[] }) {
  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <div className="glass-card rounded-2xl p-4 text-sm text-slate-500">No transactions found.</div>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="glass-card rounded-2xl p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">{r.label}</p>
                <p className="text-xs text-slate-500">{formatTime(r.created_at)}</p>
              </div>
              <p className={`text-sm font-bold ${r.tokens_change >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {r.tokens_change > 0 ? `+${r.tokens_change}` : r.tokens_change}
              </p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <p>Item: <span className="font-semibold text-slate-800">{r.item ?? "-"}</span></p>
              <p>Qty: <span className="font-semibold text-slate-800">{r.quantity}</span></p>
              <p>Balance: <span className="font-semibold text-slate-800">{r.balance_after}</span></p>
              <p>Action: <span className="font-semibold text-slate-800">{r.action}</span></p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}