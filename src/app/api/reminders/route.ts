import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", user.id)
    .order("remind_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { title, description, remind_at, is_recurring, recurrence_rule } = await req.json();

  if (!title || !remind_at) {
    return NextResponse.json({ error: "Título e data são obrigatórios" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reminders")
    .insert({
      user_id: user.id,
      title,
      description: description || null,
      remind_at,
      status: "pending",
      is_recurring: is_recurring || false,
      recurrence_rule: recurrence_rule || null,
      is_private: false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
