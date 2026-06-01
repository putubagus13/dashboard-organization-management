import { createClient } from "@/lib/supabase/server";
import { withCreateAudit } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1);
  const memberId = searchParams.get("member_id") ?? "";

  let query = supabase.from("dues_payments")
    .select("*, member:members(full_name,member_number,status:member_status_types(name))", { count: "exact" })
    .is("deleted_at", null)
    .eq("period_year", year)
    .eq("period_month", month);

  if (memberId) query = query.eq("member_id", memberId);

  const { data, count, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { data, error } = await supabase.from("dues_payments")
    .upsert(await withCreateAudit(supabase, body), { onConflict: "member_id,period_year,period_month" })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
