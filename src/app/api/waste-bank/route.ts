import { createClient } from "@/lib/supabase/server";
import { withCreateAudit } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "sessions";

  if (type === "leaderboard") {
    const { data, error } = await supabase
      .from("waste_collectors")
      .select("*, member:members(full_name,member_number)")
      .is("deleted_at", null)
      .order("total_weight", { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  const { data, count, error } = await supabase
    .from("waste_collection_sessions")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("session_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { type, ...payload } = body;

  const table = type === "session" ? "waste_collection_sessions"
    : type === "collection" ? "waste_collections"
    : "waste_collection_items";

  const { data, error } = await supabase.from(table).insert(await withCreateAudit(supabase, payload)).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
