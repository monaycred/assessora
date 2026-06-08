import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import axios from "axios";

// GET /api/whatsapp/instances/[name]/qr — obtém QR code usando credenciais da instância
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Busca credenciais da instância no banco
    const supabase = createAdminClient();
    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("api_url, api_key")
      .eq("instance_name", name)
      .maybeSingle();

    const apiUrl = instance?.api_url || process.env.EVOLUTION_API_URL;
    const apiKey = instance?.api_key || process.env.EVOLUTION_API_KEY;

    const client = axios.create({
      baseURL: apiUrl,
      headers: { apikey: apiKey, "Content-Type": "application/json" },
    });

    const response = await client.get(`/instance/connect/${name}`);
    return NextResponse.json({
      code: response.data?.code,
      base64: response.data?.base64,
      pairingCode: response.data?.pairingCode,
    });
  } catch (error) {
    console.error("[API] Erro ao obter QR:", error);
    return NextResponse.json({ error: "Erro ao obter QR code" }, { status: 500 });
  }
}
