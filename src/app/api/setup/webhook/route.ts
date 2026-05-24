import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/setup/webhook — configura webhook da instancia IASMIN na Evolution
// Pode ser chamado pelo browser diretamente
export async function GET() {
  const EVOLUTION_URL = "https://evolution-evolution-api.k4ezzu.easypanel.host";
  const EVOLUTION_KEY = "429683C4C977415CAAFCCE10F7D57E11";
  const INSTANCE = "IASMIN";
  const WEBHOOK_URL = "https://assessora.gedaias.com/api/webhook/evolution";

  const results: any = {};

  // 1. Verifica status da instancia
  try {
    const r = await fetch(`${EVOLUTION_URL}/instance/connectionState/${INSTANCE}`, {
      headers: { apikey: EVOLUTION_KEY },
    });
    results.connectionState = await r.json();
  } catch (e) {
    results.connectionStateError = String(e);
  }

  // 2. Configura webhook
  try {
    const r = await fetch(`${EVOLUTION_URL}/webhook/set/${INSTANCE}`, {
      method: "POST",
      headers: { apikey: EVOLUTION_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: WEBHOOK_URL,
          webhookByEvents: false,
          webhookBase64: true,
          base64: true,
          events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
        },
      }),
    });
    results.webhookSet = await r.json();
    results.webhookSetStatus = r.status;
  } catch (e) {
    results.webhookSetError = String(e);
  }

  // 3. Confirma webhook atual
  try {
    const r = await fetch(`${EVOLUTION_URL}/webhook/find/${INSTANCE}`, {
      headers: { apikey: EVOLUTION_KEY },
    });
    results.webhookFind = await r.json();
  } catch (e) {
    results.webhookFindError = String(e);
  }

  // 4. Atualiza DB
  try {
    const supabase = createAdminClient();
    await supabase.from("whatsapp_instances").update({
      webhook_url: WEBHOOK_URL,
      api_url: EVOLUTION_URL,
      api_key: EVOLUTION_KEY,
      status_conexao: "online",
    }).eq("instance_name", INSTANCE);
    results.dbUpdated = true;
  } catch (e) {
    results.dbError = String(e);
  }

  return NextResponse.json(results, { status: 200 });
}
