import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { disconnectInstance } from "@/lib/evolution/client";

// POST /api/whatsapp/instances/[name]/disconnect
export async function POST(
  _req: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const { name } = params;

    await disconnectInstance(name);

    const supabase = createAdminClient();
    await supabase
      .from("whatsapp_instances")
      .update({
        status: "disconnected",
        disconnected_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("instance_name", name);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API] Erro ao desconectar:", error);
    return NextResponse.json({ error: "Erro ao desconectar" }, { status: 500 });
  }
}
