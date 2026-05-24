import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getInstanceStatus } from "@/lib/evolution/client";

// GET /api/whatsapp/instances/[name]/status — checa status e atualiza banco
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const evoStatus = await getInstanceStatus(name);

    // Mapeia estado Evolution → status interno
    const statusMap: Record<string, string> = {
      open: "connected",
      close: "disconnected",
      connecting: "connecting",
      unknown: "unknown",
    };
    const dbStatus = statusMap[evoStatus.state] || "unknown";

    // Atualiza banco com status e número detectado
    const supabase = createAdminClient();
    const updateData: Record<string, unknown> = { status: dbStatus };

    if (evoStatus.state === "open") {
      updateData.connected_at = new Date().toISOString();
      if (evoStatus.phoneNumber) updateData.phone_number = evoStatus.phoneNumber;
    } else if (evoStatus.state === "close") {
      updateData.disconnected_at = new Date().toISOString();
    }

    await supabase
      .from("whatsapp_instances")
      .update(updateData)
      .eq("instance_name", name);

    return NextResponse.json({
      instanceName: name,
      state: evoStatus.state,
      status: dbStatus,
      phoneNumber: evoStatus.phoneNumber,
      profileName: evoStatus.profileName,
      profilePicUrl: evoStatus.profilePicUrl,
    });
  } catch (error) {
    console.error("[API] Erro ao checar status:", error);
    return NextResponse.json({ error: "Erro ao checar status" }, { status: 500 });
  }
}
