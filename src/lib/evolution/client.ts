import axios from "axios";

// Cliente padrão usando env vars (fallback quando não há instância do DB)
const evolutionApi = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: {
    apikey: process.env.EVOLUTION_API_KEY,
    "Content-Type": "application/json",
  },
});

const DEFAULT_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || "IASMIN";

// Cria cliente axios para uma instância específica com suas próprias credenciais
function makeClient(apiUrl: string, apiKey: string) {
  return axios.create({
    baseURL: apiUrl,
    headers: { apikey: apiKey, "Content-Type": "application/json" },
  });
}

// ─── Busca instância ativa do DB (server-side only) ───────────────────────────

export async function getActiveInstance(): Promise<{
  instanceName: string;
  apiUrl: string;
  apiKey: string;
} | null> {
  try {
    // Import dinâmico para evitar ciclo e garantir server-side
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("whatsapp_instances")
      .select("instance_name, api_url, api_key")
      .eq("is_active", true)
      .maybeSingle();

    if (!data) return null;
    return {
      instanceName: data.instance_name,
      apiUrl: data.api_url || process.env.EVOLUTION_API_URL || "",
      apiKey: data.api_key || process.env.EVOLUTION_API_KEY || "",
    };
  } catch (e) {
    console.error("[Evolution] Erro ao buscar instância ativa:", e);
    return null;
  }
}

// ─── Mensagens ────────────────────────────────────────────────────────────────

export async function sendTextMessage(
  to: string,
  message: string,
  instanceName?: string
): Promise<void> {
  let client = evolutionApi;
  let instance = instanceName || DEFAULT_INSTANCE;

  // Tenta usar instância ativa do DB
  if (!instanceName) {
    const active = await getActiveInstance();
    if (active) {
      instance = active.instanceName;
      client = makeClient(active.apiUrl, active.apiKey);
    }
  }

  try {
    await client.post(`/message/sendText/${instance}`, {
      number: to,
      text: message,
      delay: 500,
    });
  } catch (error) {
    console.error("[Evolution] Erro ao enviar mensagem:", error);
    throw error;
  }
}

export async function sendImageMessage(
  to: string,
  imageUrl: string,
  caption?: string,
  instanceName?: string
): Promise<void> {
  let client = evolutionApi;
  let instance = instanceName || DEFAULT_INSTANCE;

  if (!instanceName) {
    const active = await getActiveInstance();
    if (active) {
      instance = active.instanceName;
      client = makeClient(active.apiUrl, active.apiKey);
    }
  }

  try {
    await client.post(`/message/sendMedia/${instance}`, {
      number: to,
      mediatype: "image",
      media: imageUrl,
      caption: caption || "",
    });
  } catch (error) {
    console.error("[Evolution] Erro ao enviar imagem:", error);
    throw error;
  }
}

// ─── Gerenciamento de Instâncias ──────────────────────────────────────────────

export interface InstanceStatus {
  instanceName: string;
  state: "open" | "close" | "connecting" | "unknown";
  profileName?: string;
  profilePicUrl?: string;
  phoneNumber?: string;
}

export interface QRCodeResponse {
  code?: string;
  base64?: string;
  pairingCode?: string;
}

export async function listEvolutionInstances(): Promise<InstanceStatus[]> {
  try {
    const response = await evolutionApi.get("/instance/fetchInstances");
    const instances = response.data;
    if (!Array.isArray(instances)) return [];
    return instances.map((inst: any) => ({
      instanceName: inst.instance?.instanceName || inst.instanceName || "",
      state: inst.instance?.state || "unknown",
      profileName: inst.instance?.profileName,
      profilePicUrl: inst.instance?.profilePicUrl,
      phoneNumber: inst.instance?.owner?.split("@")[0],
    }));
  } catch (error) {
    console.error("[Evolution] Erro ao listar instâncias:", error);
    return [];
  }
}

export async function getInstanceStatus(instanceName: string): Promise<InstanceStatus> {
  try {
    const response = await evolutionApi.get(`/instance/connectionState/${instanceName}`);
    const data = response.data?.instance || response.data;
    return {
      instanceName,
      state: data?.state || "unknown",
      profileName: data?.profileName,
      profilePicUrl: data?.profilePicUrl,
      phoneNumber: data?.owner?.split("@")[0],
    };
  } catch (error) {
    console.error(`[Evolution] Erro ao checar status de ${instanceName}:`, error);
    return { instanceName, state: "unknown" };
  }
}

export async function createEvolutionInstance(
  instanceName: string,
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await evolutionApi.post("/instance/create", {
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      webhook: {
        url: webhookUrl,
        byEvents: true,
        base64: false,
        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
      },
    });
    return { success: true };
  } catch (error: any) {
    const msg = error?.response?.data?.message || error.message || "Erro desconhecido";
    console.error("[Evolution] Erro ao criar instância:", msg);
    return { success: false, error: msg };
  }
}

export async function getInstanceQRCode(instanceName: string): Promise<QRCodeResponse> {
  try {
    const response = await evolutionApi.get(`/instance/connect/${instanceName}`);
    return {
      code: response.data?.code,
      base64: response.data?.base64,
      pairingCode: response.data?.pairingCode,
    };
  } catch (error) {
    console.error(`[Evolution] Erro ao obter QR de ${instanceName}:`, error);
    return {};
  }
}

export async function disconnectInstance(instanceName: string): Promise<boolean> {
  try {
    await evolutionApi.delete(`/instance/logout/${instanceName}`);
    return true;
  } catch (error) {
    console.error(`[Evolution] Erro ao desconectar ${instanceName}:`, error);
    return false;
  }
}

export async function deleteEvolutionInstance(instanceName: string): Promise<boolean> {
  try {
    await evolutionApi.delete(`/instance/delete/${instanceName}`);
    return true;
  } catch (error) {
    console.error(`[Evolution] Erro ao deletar ${instanceName}:`, error);
    return false;
  }
}

export async function restartInstance(instanceName: string): Promise<boolean> {
  try {
    await evolutionApi.put(`/instance/restart/${instanceName}`);
    return true;
  } catch (error) {
    console.error(`[Evolution] Erro ao reiniciar ${instanceName}:`, error);
    return false;
  }
}

export async function setInstanceWebhook(
  instanceName: string,
  webhookUrl: string
): Promise<boolean> {
  try {
    await evolutionApi.post(`/webhook/set/${instanceName}`, {
      url: webhookUrl,
      byEvents: true,
      base64: false,
      events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
    });
    return true;
  } catch (error) {
    console.error(`[Evolution] Erro ao configurar webhook de ${instanceName}:`, error);
    return false;
  }
}

export async function checkInstanceStatus(): Promise<boolean> {
  const active = await getActiveInstance();
  const inst = active?.instanceName || DEFAULT_INSTANCE;
  const status = await getInstanceStatus(inst);
  return status.state === "open";
}

export default evolutionApi;
