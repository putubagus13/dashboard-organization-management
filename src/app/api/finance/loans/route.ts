import { createClient } from "@/lib/supabase/server";
import { withCreateAudit } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";

  let query = supabase.from("loans")
    .select("*, member:members(full_name,member_number), account:cash_accounts(name)", { count: "exact" })
    .is("deleted_at", null);

  if (status) query = query.eq("status", status);

  const { data, count, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { data, error } = await supabase.from("loans").insert(await withCreateAudit(supabase, body)).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
