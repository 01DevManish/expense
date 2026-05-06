import { NextRequest, NextResponse } from "next/server";
import { verifyShopPin } from "@/lib/auth";
import { getAppState } from "@/lib/state";
import { getFirebaseDb } from "@/lib/firebaseAdmin";
import { getKolkataDateKeys } from "@/lib/date";

const allowedItems = ["tea", "coffee", "packet_5", "packet_10", "packet_20"] as const;
type SpendItem = (typeof allowedItems)[number];

type Settings = {
  balance_tokens?: number;
  tea_cost?: number;
  coffee_cost?: number;
  packet_5_cost?: number;
  packet_10_cost?: number;
  packet_20_cost?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pin = String(body?.pin ?? "");
    const item = String(body?.item ?? "") as SpendItem;
    const quantity = Number(body?.quantity ?? 1);

    if (!verifyShopPin(pin)) return NextResponse.json({ error: "Invalid shop pin" }, { status: 401 });
    if (!allowedItems.includes(item)) return NextResponse.json({ error: "Invalid item" }, { status: 400 });
    if (!Number.isInteger(quantity) || quantity <= 0) return NextResponse.json({ error: "Quantity must be a positive integer" }, { status: 400 });

    const db = getFirebaseDb();
    const settingsRef = db.ref("app_settings");

    const settingsSnap = await settingsRef.get();
    const settings: Settings = settingsSnap.exists()
      ? (settingsSnap.val() as Settings)
      : {
          balance_tokens: 0,
          tea_cost: 10,
          coffee_cost: 10,
          packet_5_cost: 5,
          packet_10_cost: 10,
          packet_20_cost: 20
        };

    const costMap: Record<SpendItem, number> = {
      tea: Number(settings.tea_cost ?? 10),
      coffee: Number(settings.coffee_cost ?? 10),
      packet_5: Number(settings.packet_5_cost ?? 5),
      packet_10: Number(settings.packet_10_cost ?? 10),
      packet_20: Number(settings.packet_20_cost ?? 20)
    };

    const unitCost = costMap[item];
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      return NextResponse.json({ error: "Invalid item cost" }, { status: 400 });
    }

    const required = unitCost * quantity;
    const fallbackBalance = Number(settings.balance_tokens ?? 0);

    let insufficient = false;
    let available = fallbackBalance;

    const balanceRef = settingsRef.child("balance_tokens");
    const tx = await balanceRef.transaction((current) => {
      const currentBalance = typeof current === "number" ? current : fallbackBalance;
      available = currentBalance;
      if (currentBalance < required) {
        insufficient = true;
        return;
      }
      return currentBalance - required;
    });

    if (!tx.committed) {
      if (insufficient) {
        return NextResponse.json({ error: `Not enough tokens (required ${required}, available ${available})` }, { status: 400 });
      }
      return NextResponse.json({ error: "Failed to update balance. Please try again." }, { status: 500 });
    }

    const newBalance = Number(tx.snapshot.val() ?? 0);
    await settingsRef.update({ updated_at: new Date().toISOString() });

    const labelMap: Record<SpendItem, string> = {
      tea: "Tea Token Spend",
      coffee: "Coffee Token Spend",
      packet_5: "Packet 5 Token Spend",
      packet_10: "Packet 10 Token Spend",
      packet_20: "Packet 20 Token Spend"
    };

    const { dateKey, monthKey } = getKolkataDateKeys();
    const now = new Date();

    await db.ref("token_transactions").push({
      action: "SPEND_TOKENS",
      item,
      label: labelMap[item],
      tokens_change: -required,
      balance_after: newBalance,
      quantity,
      note: null,
      date_key: dateKey,
      month_key: monthKey,
      created_at: now.toISOString(),
      created_at_ms: now.getTime()
    });

    const state = await getAppState();
    return NextResponse.json({ ok: true, state }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to spend tokens" }, { status: 500 });
  }
}