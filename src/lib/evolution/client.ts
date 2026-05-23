import axios from "axios";

const evolutionApi = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: {
    apikey: process.env.EVOLUTION_API_KEY,
    "Content-Type": "application/json",
  },
});

const INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || "iasmin";

// Envia mensagem de texto
export async function sendTextMessage(
  to: string,
  message: string
): Promise<void> {
  try {
    await evolutionApi.post(`/message/sendText/${INSTANCE}`, {
      number: to,
      text: message,
      delay: 500,
    });
  } catch (error) {
    console.error("[Evolution] Erro ao enviar mensagem:", error);
    throw error;
  }
}

// Envia imagem
export async function sendImageMessage(
  to: string,
  imageUrl: string,
  caption?: string
): Promise<void> {
  try {
    await evolutionApi.post(`/message/sendMedia/${INSTANCE}`, {
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

// Verifica status da instância
export async function checkInstanceStatus(): Promise<boolean> {
  try {
    const response = await evolutionApi.get(
      `/instance/connectionState/${INSTANCE}`
    );
    return response.data?.instance?.state === "open";
  } catch {
    return false;
  }
}

export default evolutionApi;
