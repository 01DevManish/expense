"use client";

import { useEffect, useRef, useState } from "react";
import StatCard from "@/components/StatCard";
import TransactionTable from "@/components/TransactionTable";
import { AppState } from "@/lib/state";

const SHOP_KEY = "shop_logged_in";
const ADMIN_KEY = "admin_logged_in";
type SpendItem = "tea" | "coffee" | "packet_5" | "packet_10" | "packet_20";
type QtyState = Record<SpendItem, number>;

function initialState(): AppState {
  return {
    balanceTokens: 0,
    costs: { tea: 10, coffee: 10, packet5: 5, packet10: 10, packet20: 20 },
    todaySummary: { teaCount: 0, teaTokens: 0, coffeeCount: 0, coffeeTokens: 0, packetCount: 0, packetTokens: 0, totalSpent: 0, totalAdded: 0 },
    monthSummary: { teaCount: 0, teaTokens: 0, coffeeCount: 0, coffeeTokens: 0, packetCount: 0, packetTokens: 0, totalSpent: 0, totalAdded: 0 },
    recentTransactions: []
  };
}

function ItemIcon({ item }: { item: SpendItem }) {
  if (item === "tea") {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
        <path d="M15 11h2a2 2 0 1 1 0 4h-2" />
        <path d="M7 6c0 1 1 1 1 2s-1 1-1 2" />
        <path d="M10 6c0 1 1 1 1 2s-1 1-1 2" />
      </svg>
    );
  }
  if (item === "coffee") {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
        <path d="M15 11h2a2 2 0 1 1 0 4h-2" />
        <path d="M6 20h10" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7 12 3l9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </svg>
  );
}

export default function ShopPage() {
  const [pin, setPin] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [state, setState] = useState<AppState>(initialState());
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [qty, setQty] = useState<QtyState>({ tea: 1, coffee: 1, packet_5: 1, packet_10: 1, packet_20: 1 });
  const [dateFilter, setDateFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [rows, setRows] = useState<AppState["recentTransactions"]>([]);
  const [page, setPage] = useState(1);
  const lockRef = useRef(false);

  const loadState = async () => {
    if (lockRef.current) return;
    lockRef.current = true;
    try {
      const res = await fetch(`/api/state?ts=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load state");
      setState(data);
      setRows(data.recentTransactions ?? []);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load state");
    } finally {
      lockRef.current = false;
    }
  };

  const loadLogs = async () => {
    if (!dateFilter && !monthFilter) {
      setRows(state.recentTransactions ?? []);
      setPage(1);
      return;
    }
    try {
      const qs = new URLSearchParams();
      if (dateFilter) qs.set("date", dateFilter);
      if (monthFilter) qs.set("month", monthFilter);
      const res = await fetch(`/api/logs?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to filter logs");
      const list = dateFilter ? data.dateLogs : data.monthLogs;
      setRows(Array.isArray(list) ? list : []);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load logs");
    }
  };

  useEffect(() => {
    const isShop = localStorage.getItem(SHOP_KEY) === "1";
    const isAdmin = localStorage.getItem(ADMIN_KEY) === "1";
    setBlocked(!isShop && isAdmin);
    setLoggedIn(isShop);
  }, []);

  useEffect(() => {
    if (loggedIn) void loadState();
  }, [loggedIn]);

  useEffect(() => {
    if (loggedIn) void loadLogs();
  }, [dateFilter, monthFilter, state.recentTransactions, loggedIn]);

  const login = () => {
    if (!pin.trim()) return;
    localStorage.setItem(SHOP_KEY, "1");
    sessionStorage.setItem("shop_pin", pin.trim());
    setLoggedIn(true);
    setMessage("Login successful");
    setError("");
  };

  const logout = () => {
    localStorage.removeItem(SHOP_KEY);
    sessionStorage.removeItem("shop_pin");
    setLoggedIn(false);
  };

  const spend = async (item: SpendItem) => {
    const quantity = qty[item];
    setLoading(true);
    setMessage("");
    setError("");
    try {
      if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Enter a valid quantity");
      const shopPin = sessionStorage.getItem("shop_pin") || pin;
      const res = await fetch("/api/shop/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: shopPin, item, quantity })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Spend failed");
      setState(data.state);
      setRows(data.state.recentTransactions ?? []);
      setLoaded(true);
      setMessage(`Tokens spent successfully (${quantity})`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Spend failed");
    } finally {
      setLoading(false);
    }
  };

  const setQuantity = (item: SpendItem, value: string) => {
    const n = Number(value);
    setQty((prev) => ({ ...prev, [item]: Number.isFinite(n) && n > 0 ? Math.floor(n) : 1 }));
  };

  const items: Array<{ item: SpendItem; title: string; cost: number; color: string }> = [
    { item: "tea", title: "Tea", cost: state.costs.tea, color: "from-amber-500 to-orange-500" },
    { item: "coffee", title: "Coffee", cost: state.costs.coffee, color: "from-amber-700 to-orange-700" },
    { item: "packet_5", title: "Packet 5", cost: state.costs.packet5, color: "from-sky-500 to-blue-600" },
    { item: "packet_10", title: "Packet 10", cost: state.costs.packet10, color: "from-indigo-500 to-blue-700" },
    { item: "packet_20", title: "Packet 20", cost: state.costs.packet20, color: "from-violet-500 to-indigo-700" }
  ];

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, totalPages);
  const pagedRows = rows.slice((current - 1) * pageSize, current * pageSize);

  if (!loggedIn) {
    if (blocked) return <div className="glass-card mx-auto max-w-sm rounded-2xl p-4 text-sm shadow-sm"><p>Admin login active. Logout admin first.</p></div>;
    return (
      <div className="mx-auto max-w-sm space-y-4">
        <div className="glass-card rounded-3xl p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">EURUS LIFESTYLE</p>
          <h1 className="mt-1 text-2xl font-extrabold">Shop Login</h1>
          <input type="password" className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-indigo-500" placeholder="SHOP PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
          <button onClick={login} className="mt-3 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white">Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="glass-card sticky top-2 z-10 rounded-2xl p-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">EURUS LIFESTYLE</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <h1 className="text-xl font-extrabold">Shop Panel</h1>
          <div className="flex gap-2">
            <button onClick={() => void loadState()} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Refresh</button>
            <button onClick={logout} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Logout</button>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-4 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Remaining Tokens</p>
        <p className="mt-1 text-5xl font-extrabold text-indigo-700">{loaded ? state.balanceTokens : "..."}</p>
      </div>

      {message ? <p className="rounded-xl bg-emerald-100 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

      <div className="grid grid-cols-1 gap-3">
        {items.map((it) => {
          const q = qty[it.item];
          const total = q * it.cost;
          return (
            <div key={it.item} className="glass-card rounded-3xl p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">{it.title}</p>
                <p className="text-xs text-slate-500">{it.cost} each | Spend: {total}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={q}
                  onChange={(e) => setQuantity(it.item, e.target.value)}
                  className="h-16 w-28 rounded-xl border border-slate-200 bg-white px-2 text-center text-xl font-bold outline-none focus:border-indigo-500"
                />
                <button
                  disabled={loading}
                  onClick={() => spend(it.item)}
                  className={`ml-auto h-16 w-28 rounded-xl bg-gradient-to-r ${it.color} text-white flex items-center justify-center`}
                  title={`${it.title} spend`}
                >
                  <ItemIcon item={it.item} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Tea Today" value={`${state.todaySummary.teaCount} / ${state.todaySummary.teaTokens}`} hint="qty / tokens" />
        <StatCard title="Coffee Today" value={`${state.todaySummary.coffeeCount} / ${state.todaySummary.coffeeTokens}`} hint="qty / tokens" />
        <StatCard title="Packet Today" value={`${state.todaySummary.packetCount} / ${state.todaySummary.packetTokens}`} hint="qty / tokens" />
        <StatCard title="Total Spent Today" value={state.todaySummary.totalSpent} />
        <StatCard title="This Month Spent" value={state.monthSummary.totalSpent} />
      </div>

      <div className="glass-card space-y-2 rounded-2xl p-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shop Logs</p>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          <input type="month" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
        </div>
        <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold" onClick={() => { setDateFilter(""); setMonthFilter(""); }}>Clear Filters</button>
      </div>

      <TransactionTable rows={pagedRows} />

      <div className="glass-card flex items-center justify-between rounded-2xl p-3 shadow-sm">
        <p className="text-xs font-semibold text-slate-600">Page {current} of {totalPages}</p>
        <div className="flex gap-2">
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold" disabled={current <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold" disabled={current >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </div>
    </div>
  );
}
