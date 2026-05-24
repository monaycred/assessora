import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  createEvolutionInstance,
  getInstanceStatus,
  setInstanceWebhook,
} from "@/lib/evolution/client";

// GET /api/whatsapp/instances — lista todas as instâncias
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: instances, error } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Busca status real do Evolution para cada instância
    const enriched = await Promise.all(
      (instances || []).map(async (inst) => {
        const evoStatus = await getInstanceStatus(inst.instance_name);
        return {
          ...inst,
          evolution_state: evoStatus.state,
          profile_name: evoStatus.profileName,
          profile_pic: evoStatus.profilePicUrl,
          evolution_phone: evoStatus.phoneNumber,
        };
      })
    );

    return NextResponse.json({ instances: enriched });
  } catch (error) {
    console.error("[API] Erro ao listar instâncias:", error);
    return NextResponse.json({ error: "Erro ao listar instâncias" }, { status: 500 });
  }
}

// POST /api/whatsapp/instances — cria nova instância
export async function POST(req: NextRequest) {
  try {
    const { display_name } = await req.json();
    const supabase = createAdminClient();

    // Gera nome único para a instância
    const timestamp = Date.now();
    const instanceName = `iasmin_${timestamp}`;

    // Webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/evolution`;

    // Cria no Evolution
    const evoResult = await createEvolutionInstance(instanceName, webhookUrl);
    if (!evoResult.success) {
      return NextResponse.json(
        { error: `Erro na Evolution API: ${evoResult.error}` },
        { status: 500 }
      );
    }

    // Salva no banco
    const { data, error } = await supabase
      .from("whatsapp_instances")
      .insert({
        instance_name: instanceName,
        display_name: display_name || `Instância ${new Date().toLocaleDateString("pt-BR")}`,
        status: "connecting",
        is_active: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ instance: data }, { status: 201 });
  } catch (error) {
    console.error("[API] Erro ao criar instância:", error);
    return NextResponse.json({ error: "Erro ao criar instância" }, { status: 500 });
  }
}
