import { createClient } from "@/lib/supabase/server";
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
  const { data, error } = await supabase.rpc("create_loan_with_transaction", {
    p_borrower_name: body.borrower_name,
    p_member_id: body.member_id ?? null,
    p_account_id: body.account_id,
    p_principal_amount: body.principal_amount,
    p_interest_rate: body.interest_rate ?? 0,
    p_loan_date: body.loan_date,
    p_due_date: body.due_date ?? null,
    p_purpose: body.purpose ?? null,
    p_collateral: body.collateral ?? null,
    p_notes: body.notes ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
