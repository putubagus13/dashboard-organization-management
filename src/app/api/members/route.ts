import { createClient } from "@/lib/supabase/server";
import { withCreateAudit } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);
  const statusId = searchParams.get("status_id") ?? "";
  const isActive = searchParams.get("is_active") ?? "";

  let query = supabase
    .from("members")
    .select("*, status:member_status_types(id,name,color)", { count: "exact" })
    .is("deleted_at", null);

  if (search) query = query.ilike("full_name", `%${search}%`);
  if (statusId) query = query.eq("status_id", statusId);
  if (isActive !== "") query = query.eq("is_active", isActive === "true");

  const { data, count, error } = await query
    .order("full_name")
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { data, error } = await supabase.from("members").insert(await withCreateAudit(supabase, body)).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
