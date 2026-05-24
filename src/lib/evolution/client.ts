import axios from "axios";

const evolutionApi = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: {
    apikey: process.env.EVOLUTION_API_KEY,
    "Content-Type": "application/json",
  },
});

const DEFAULT_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || "TMT2";

// ─── Mensagens ────────────────────────────────────────────────────────────────

export async function sendTextMessage(
  to: string,
  message: string,
  instanceName?: string
): Promise<void> {
  const instance = instanceName || DEFAULT_INSTANCE;
  try {
    await evolutionApi.post(`/message/sendText/${instance}`, {
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
  const instance = instanceName || DEFAULT_INSTANCE;
  try {
    await evolutionApi.post(`/message/sendMedia/${instance}`, {
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

/** Lista todas as instâncias criadas no Evolution */
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

/** Obtém status de conexão de uma instância */
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

/** Cria uma nova instância no Evolution */
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

/** Obtém QR code de uma instância */
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

/** Desconecta (logout) uma instância */
export async function disconnectInstance(instanceName: string): Promise<boolean> {
  try {
    await evolutionApi.delete(`/instance/logout/${instanceName}`);
    return true;
  } catch (error) {
    console.error(`[Evolution] Erro ao desconectar ${instanceName}:`, error);
    return false;
  }
}

/** Deleta uma instância do Evolution */
export async function deleteEvolutionInstance(instanceName: string): Promise<boolean> {
  try {
    await evolutionApi.delete(`/instance/delete/${instanceName}`);
    return true;
  } catch (error) {
    console.error(`[Evolution] Erro ao deletar ${instanceName}:`, error);
    return false;
  }
}

/** Reinicia uma instância */
export async function restartInstance(instanceName: string): Promise<boolean> {
  try {
    await evolutionApi.put(`/instance/restart/${instanceName}`);
    return true;
  } catch (error) {
    console.error(`[Evolution] Erro ao reiniciar ${instanceName}:`, error);
    return false;
  }
}

/** Configura webhook de uma instância */
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

/** Verifica status da instância padrão (compatibilidade) */
export async function checkInstanceStatus(): Promise<boolean> {
  const status = await getInstanceStatus(DEFAULT_INSTANCE);
  return status.state === "open";
}

export default evolutionApi;
