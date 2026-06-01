import { createClient } from "@/lib/supabase/server";
import { withCreateAudit } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const meetingId = searchParams.get("meeting_id") ?? "";

  let query = supabase.from("attendance")
    .select("*, member:members(full_name,member_number)", { count: "exact" })
    .is("deleted_at", null);

  if (meetingId) query = query.eq("meeting_id", meetingId);

  const { data, count, error } = await query.order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { data, error } = await supabase.from("attendance")
    .upsert(await withCreateAudit(supabase, body), { onConflict: "meeting_id,member_id" })
    .select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
