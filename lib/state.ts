import { getKolkataDateKeys } from "@/lib/date";
import { getFirebaseDb } from "@/lib/firebaseAdmin";

export type TransactionRow = {
  id: string;
  action: "ADD_TOKENS" | "SPEND_TOKENS";
  item: string | null;
  label: string;
  tokens_change: number;
  balance_after: number;
  quantity: number;
  note: string | null;
  date_key: string;
  month_key: string;
  created_at: string;
  created_at_ms: number;
};

export type Summary = {
  teaCount: number;
  teaTokens: number;
  coffeeCount: number;
  coffeeTokens: number;
  packetCount: number;
  packetTokens: number;
  totalSpent: number;
  totalAdded: number;
};

export type AppState = {
  balanceTokens: number;
  costs: { tea: number; coffee: number; packet5: number; packet10: number; packet20: number };
  todaySummary: Summary;
  monthSummary: Summary;
  recentTransactions: TransactionRow[];
  recentNotifications: NotificationRow[];
};

export type NotificationRow = {
  id: string;
  audience: "admin" | "shop" | "all";
  title: string;
  message: string;
  created_at: string;
  created_at_ms: number;
};

type Settings = {
  balance_tokens: number;
  tea_cost: number;
  coffee_cost: number;
  packet_5_cost: number;
  packet_10_cost: number;
  packet_20_cost: number;
  updated_at: string;
};

const DEFAULT_SETTINGS: Settings = {
  balance_tokens: 0,
  tea_cost: 10,
  coffee_cost: 10,
  packet_5_cost: 5,
  packet_10_cost: 10,
  packet_20_cost: 20,
  updated_at: new Date().toISOString()
};

function sumRows(rows: TransactionRow[]): Summary {
  const s: Summary = { teaCount: 0, teaTokens: 0, coffeeCount: 0, coffeeTokens: 0, packetCount: 0, packetTokens: 0, totalSpent: 0, totalAdded: 0 };
  for (const r of rows) {
    if (r.action === "ADD_TOKENS") {
      s.totalAdded += r.tokens_change;
      continue;
    }
    const spent = Math.abs(r.tokens_change);
    s.totalSpent += spent;
    if (r.item === "tea") {
      s.teaCount += r.quantity;
      s.teaTokens += spent;
    } else if (r.item === "coffee") {
      s.coffeeCount += r.quantity;
      s.coffeeTokens += spent;
    } else if (r.item?.startsWith("packet_")) {
      s.packetCount += r.quantity;
      s.packetTokens += spent;
    }
  }
  return s;
}

function normalizeSettings(input: unknown): Settings {
  const s = (input ?? {}) as Partial<Settings>;
  return {
    balance_tokens: Number.isFinite(Number(s.balance_tokens)) ? Number(s.balance_tokens) : DEFAULT_SETTINGS.balance_tokens,
    tea_cost: Number.isFinite(Number(s.tea_cost)) ? Number(s.tea_cost) : DEFAULT_SETTINGS.tea_cost,
    coffee_cost: Number.isFinite(Number(s.coffee_cost)) ? Number(s.coffee_cost) : DEFAULT_SETTINGS.coffee_cost,
    packet_5_cost: Number.isFinite(Number(s.packet_5_cost)) ? Number(s.packet_5_cost) : DEFAULT_SETTINGS.packet_5_cost,
    packet_10_cost: Number.isFinite(Number(s.packet_10_cost)) ? Number(s.packet_10_cost) : DEFAULT_SETTINGS.packet_10_cost,
    packet_20_cost: Number.isFinite(Number(s.packet_20_cost)) ? Number(s.packet_20_cost) : DEFAULT_SETTINGS.packet_20_cost,
    updated_at: typeof s.updated_at === "string" ? s.updated_at : new Date().toISOString()
  };
}

async function ensureSettings(): Promise<Settings> {
  const db = getFirebaseDb();
  const ref = db.ref("app_settings");
  const snap = await ref.get();
  if (!snap.exists()) {
    await ref.set(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  const normalized = normalizeSettings(snap.val());
  await ref.update(normalized);
  return normalized;
}

async function fetchTransactions(limit = 200): Promise<TransactionRow[]> {
  const db = getFirebaseDb();
  const snap = await db.ref("token_transactions").orderByChild("created_at_ms").limitToLast(limit).get();
  if (!snap.exists()) return [];

  const rows: TransactionRow[] = [];
  snap.forEach((child) => {
    const v = child.val() as Partial<TransactionRow>;
    rows.push({
      id: child.key || "",
      action: v.action === "ADD_TOKENS" ? "ADD_TOKENS" : "SPEND_TOKENS",
      item: typeof v.item === "string" ? v.item : null,
      label: typeof v.label === "string" ? v.label : "",
      tokens_change: Number(v.tokens_change ?? 0),
      balance_after: Number(v.balance_after ?? 0),
      quantity: Number(v.quantity ?? 1),
      note: typeof v.note === "string" ? v.note : null,
      date_key: typeof v.date_key === "string" ? v.date_key : "",
      month_key: typeof v.month_key === "string" ? v.month_key : "",
      created_at: typeof v.created_at === "string" ? v.created_at : new Date(0).toISOString(),
      created_at_ms: Number(v.created_at_ms ?? 0)
    });
    return false;
  });

  return rows.sort((a, b) => b.created_at_ms - a.created_at_ms);
}

async function fetchNotifications(limit = 100): Promise<NotificationRow[]> {
  const db = getFirebaseDb();
  const snap = await db.ref("notifications").orderByChild("created_at_ms").limitToLast(limit).get();
  if (!snap.exists()) return [];

  const rows: NotificationRow[] = [];
  snap.forEach((child) => {
    const v = child.val() as Partial<NotificationRow>;
    rows.push({
      id: child.key || "",
      audience: v.audience === "admin" || v.audience === "shop" ? v.audience : "all",
      title: typeof v.title === "string" ? v.title : "Notification",
      message: typeof v.message === "string" ? v.message : "",
      created_at: typeof v.created_at === "string" ? v.created_at : new Date(0).toISOString(),
      created_at_ms: Number(v.created_at_ms ?? 0)
    });
    return false;
  });
  return rows.sort((a, b) => b.created_at_ms - a.created_at_ms);
}

export async function getAppState(): Promise<AppState> {
  const { dateKey, monthKey } = getKolkataDateKeys();
  const settings = await ensureSettings();
  const recentTransactions = await fetchTransactions(200);
  const recentNotifications = await fetchNotifications(100);
  const today = recentTransactions.filter((r) => r.date_key === dateKey);
  const month = recentTransactions.filter((r) => r.month_key === monthKey);

  return {
    balanceTokens: settings.balance_tokens,
    costs: {
      tea: settings.tea_cost,
      coffee: settings.coffee_cost,
      packet5: settings.packet_5_cost,
      packet10: settings.packet_10_cost,
      packet20: settings.packet_20_cost
    },
    todaySummary: sumRows(today),
    monthSummary: sumRows(month),
    recentTransactions,
    recentNotifications
  };
}

export async function getFilteredLogs(date?: string, month?: string) {
  const rows = await fetchTransactions(2000);
  const dateLogs = date ? rows.filter((r) => r.date_key === date) : rows;
  const monthLogs = month ? rows.filter((r) => r.month_key === month) : rows;
  return {
    dateLogs,
    monthLogs,
    dateSummary: sumRows(dateLogs),
    monthSummary: sumRows(monthLogs)
  };
}
