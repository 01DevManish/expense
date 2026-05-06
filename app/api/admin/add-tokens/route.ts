import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/auth";
import { getAppState } from "@/lib/state";
import { getFirebaseDb } from "@/lib/firebaseAdmin";
import { getKolkataDateKeys } from "@/lib/date";
import { sendTxnNotification } from "@/lib/fcm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pin = String(body?.pin ?? "");
    const amount = Number(body?.amount ?? 0);
    const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim() : null;

    if (!verifyAdminPin(pin)) return NextResponse.json({ error: "Invalid admin pin" }, { status: 401 });
    if (!Number.isInteger(amount) || amount <= 0) return NextResponse.json({ error: "Amount must be a positive integer" }, { status: 400 });

    const db = getFirebaseDb();
    const settingsRef = db.ref("app_settings");

    const tx = await settingsRef.transaction((current) => {
      const base = current ?? {
        balance_tokens: 0,
        tea_cost: 10,
        coffee_cost: 10,
        packet_5_cost: 5,
        packet_10_cost: 10,
        packet_20_cost: 20,
        updated_at: new Date().toISOString()
      };
      const prevBalance = Number(base.balance_tokens ?? 0);
      return {
        ...base,
        balance_tokens: prevBalance + amount,
        updated_at: new Date().toISOString()
      };
    });

    if (!tx.committed || !tx.snapshot.exists()) {
      return NextResponse.json({ error: "Failed to update balance" }, { status: 500 });
    }

    const updated = tx.snapshot.val() as { balance_tokens: number };
    const { dateKey, monthKey } = getKolkataDateKeys();
    const now = new Date();

    await db.ref("token_transactions").push({
      action: "ADD_TOKENS",
      item: "admin_add",
      label: "Admin Add Tokens",
      tokens_change: amount,
      balance_after: Number(updated.balance_tokens ?? 0),
      quantity: 1,
      note,
      date_key: dateKey,
      month_key: monthKey,
      created_at: now.toISOString(),
      created_at_ms: now.getTime()
    });

    await db.ref("notifications").push({
      audience: "all",
      title: "Token Added",
      message: `Admin added ${amount} tokens. Balance is ${Number(updated.balance_tokens ?? 0)}.`,
      created_at: now.toISOString(),
      created_at_ms: now.getTime()
    });
    try {
      await sendTxnNotification("Token Added", `Admin added ${amount} tokens. Balance is ${Number(updated.balance_tokens ?? 0)}.`);
    } catch {
      // Keep token update successful even if push fails.
    }

    const state = await getAppState();
    return NextResponse.json({ ok: true, state }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to add tokens" }, { status: 500 });
  }
}
