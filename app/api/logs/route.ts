import { NextRequest, NextResponse } from "next/server";
import { getFilteredLogs } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date") || undefined;
    const month = req.nextUrl.searchParams.get("month") || undefined;
    const data = await getFilteredLogs(date, month);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to fetch logs" }, { status: 500 });
  }
}
