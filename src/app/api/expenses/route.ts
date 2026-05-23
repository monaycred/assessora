import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/expenses
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const category = searchParams.get("category");

  let query = supabase
    .from("expenses")
    .select("*, payment_methods(name, type)")
    .eq("user_id", user.id)
    .order("expense_date", { ascending: false });

  if (month) {
    const [year, m] = month.split("-");
    const start = new Date(parseInt(year), parseInt(m) - 1, 1).toISOString();
    const end = new Date(parseInt(year), parseInt(m), 0).toISOString();
    query = query.gte("expense_date", start).lte("expense_date", end);
  }

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

// POST /api/expenses
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { description, amount, category, expense_date, payment_method_id, is_shared, notes } = body;

  if (!description || !amount) {
    return NextResponse.json({ error: "Descrição e valor são obrigatórios" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      user_id: user.id,
      description,
      amount: parseFloat(amount),
      category: category || "outros",
      expense_date: expense_date || new Date().toISOString().split("T")[0],
      payment_method_id: payment_method_id || null,
      is_shared: is_shared || false,
      is_private: false,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
