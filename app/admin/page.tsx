"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import StatCard from "@/components/StatCard";
import TransactionTable from "@/components/TransactionTable";
import { AppState } from "@/lib/state";

const ADMIN_KEY = "admin_logged_in";
const SHOP_KEY = "shop_logged_in";

function initialState(): AppState {
  return {
    balanceTokens: 0,
    costs: { tea: 10, coffee: 10, packet5: 5, packet10: 10, packet20: 20 },
    todaySummary: { teaCount: 0, teaTokens: 0, coffeeCount: 0, coffeeTokens: 0, packetCount: 0, packetTokens: 0, totalSpent: 0, totalAdded: 0 },
    monthSummary: { teaCount: 0, teaTokens: 0, coffeeCount: 0, coffeeTokens: 0, packetCount: 0, packetTokens: 0, totalSpent: 0, totalAdded: 0 },
    recentTransactions: []
  };
}

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [state, setState] = useState<AppState>(initialState());
  const [loaded, setLoaded] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    const isAdmin = localStorage.getItem(ADMIN_KEY) === "1";
    const isShop = localStorage.getItem(SHOP_KEY) === "1";
    setBlocked(!isAdmin && isShop);
    setLoggedIn(isAdmin);
  }, []);

  useEffect(() => {
    if (loggedIn) void loadState();
  }, [loggedIn]);

  const login = () => {
    if (!pin.trim()) return;
    localStorage.setItem(ADMIN_KEY, "1");
    sessionStorage.setItem("admin_pin", pin.trim());
    setLoggedIn(true);
    setMessage("Login successful");
    setError("");
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_KEY);
    sessionStorage.removeItem("admin_pin");
    setLoggedIn(false);
  };

  const addTokens = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const adminPin = sessionStorage.getItem("admin_pin") || pin;
      const res = await fetch("/api/admin/add-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: adminPin, amount: Number(amount), note })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Add failed");
      setState(data.state);
      setRows(data.state.recentTransactions ?? []);
      setLoaded(true);
      setMessage("Tokens added successfully");
      setAmount("");
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add failed");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    if (!dateFilter && !monthFilter) {
      setRows(state.recentTransactions);
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

      let list = data.monthLogs;
      if (dateFilter) list = data.dateLogs;
      if (monthFilter && !dateFilter) list = data.monthLogs;

      setRows(Array.isArray(list) ? list : []);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Filter failed");
    }
  };

  useEffect(() => {
    void applyFilters();
  }, [dateFilter, monthFilter, state.recentTransactions]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, totalPages);
  const paged = rows.slice((current - 1) * pageSize, current * pageSize);

  if (!loggedIn) {
    if (blocked) return <div className="glass-card mx-auto max-w-sm rounded-2xl p-4 text-sm shadow-sm"><p>Shop login active. Logout shop first.</p></div>;
    return (
      <div className="mx-auto max-w-sm space-y-4">
        <div className="glass-card rounded-3xl p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">EURUS LIFESTYLE</p>
          <h1 className="mt-1 text-2xl font-extrabold">Admin Login</h1>
          <input type="password" className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500" placeholder="ADMIN PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
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
          <h1 className="text-xl font-extrabold">Admin Panel</h1>
          <div className="flex gap-2">
            <button onClick={() => void loadState()} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Refresh</button>
            <button onClick={logout} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Logout</button>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Tokens</p>
        <p className="mt-1 text-4xl font-extrabold text-emerald-700">{loaded ? state.balanceTokens : "..."}</p>
      </div>

      <form onSubmit={addTokens} className="glass-card space-y-3 rounded-3xl p-4 shadow-sm">
        <p className="text-sm font-semibold">Add Tokens</p>
        <input type="number" min={1} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input type="text" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button disabled={loading} className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white">{loading ? "Adding..." : "Add Tokens"}</button>
      </form>

      {message ? <p className="rounded-xl bg-emerald-100 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Today Added" value={state.todaySummary.totalAdded} />
        <StatCard title="Today Spent" value={state.todaySummary.totalSpent} />
        <StatCard title="Tea Spent Today" value={state.todaySummary.teaTokens} />
        <StatCard title="Coffee Spent Today" value={state.todaySummary.coffeeTokens} />
        <StatCard title="Packets Spent Today" value={state.todaySummary.packetTokens} />
        <StatCard title="Month Added" value={state.monthSummary.totalAdded} />
        <StatCard title="Month Spent" value={state.monthSummary.totalSpent} />
      </div>

      <div className="glass-card space-y-2 rounded-2xl p-3 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          <input type="month" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold" onClick={() => { setDateFilter(""); setMonthFilter(""); }}>Clear Filters</button>
        </div>
      </div>

      <TransactionTable rows={paged} />

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