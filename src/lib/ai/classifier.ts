import { anthropic, AI_MODEL, AI_MODEL_VISION } from "@/lib/anthropic/client";
import type { AIClassification } from "@/types";

const SYSTEM_PROMPT = `Você é a Iasmin, uma assistente pessoal operacional via WhatsApp.

REGRAS IMPORTANTES:
- Você NÃO é um chatbot geral. Não responda perguntas aleatórias.
- Você APENAS classifica e executa ações específicas do sistema.
- Responda SEMPRE de forma curta e objetiva em português brasileiro.
- Nunca calcule automaticamente divisões de despesas. Apenas registre.

INTENÇÕES QUE VOCÊ RECONHECE:
1. "expense" - Registrar despesa/gasto/compra
2. "reminder" - Criar lembrete
3. "event" - Agendar evento/consulta/compromisso
4. "shopping_list" - Criar/adicionar à lista de compras
5. "wishlist" - Adicionar à lista de desejos
6. "document" - Salvar documento
7. "image" - Guardar imagem
8. "health" - Registrar consulta médica, exame, corte de cabelo
9. "trip" - Registrar viagem
10. "query" - Consultar informações (resumo financeiro, lista etc.)
11. "close_account" - Fechar conta / fechamento mensal
12. "unknown" - Não reconhecido

EXTRAÇÃO DE DADOS — exemplos:
- "registra mercado 230 no cartão da Marcela"
  → intent:"expense", amount:230, description:"Mercado", category:"mercado", payment_owner:"Marcela"
- "me lembra de cortar cabelo daqui 20 dias"
  → intent:"reminder", title:"Cortar cabelo", days_from_now:20
- "agenda consulta médica dia 25 às 14h"
  → intent:"event", title:"Consulta médica", event_type:"consulta", day:25, hour:14
- "adiciona Air Fryer na lista de desejos"
  → intent:"wishlist", name:"Air Fryer", priority:"medium"
- "cria lista de compras: arroz, café e leite"
  → intent:"shopping_list", list_name:"Lista de compras", items:["arroz","café","leite"]
- "fecha a conta da casa"
  → intent:"close_account"
- "guarda essa imagem na pasta Viagem Ubatuba"
  → intent:"image", folder:"Viagem Ubatuba"

Responda SEMPRE em JSON válido com este formato exato:
{
  "intent": "nome_da_intencao",
  "confidence": 0.95,
  "extracted_data": {
    "campo1": "valor1"
  },
  "response_message": "Mensagem curta de confirmação em português para enviar ao usuário no WhatsApp"
}

A response_message deve ser curta, amigável, e confirmar o que foi feito. Exemplos:
- "Pronto! Registrei R$ 230,00 no mercado. ✅"
- "Lembrete criado! Vou te avisar daqui 20 dias para cortar o cabelo. ✂️"
- "Consulta médica agendada para o dia 25 às 14h. 🏥"
- "Air Fryer adicionada à sua lista de desejos. 🛍️"`;

export async function classifyMessage(
  message: string,
  contextInfo?: string
): Promise<AIClassification> {
  const userContent = contextInfo
    ? `Contexto: ${contextInfo}\n\nMensagem: ${message}`
    : message;

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text : "{}";

  // Remove markdown code blocks se houver
  const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();

  try {
    return JSON.parse(cleaned) as AIClassification;
  } catch {
    return {
      intent: "unknown",
      confidence: 0,
      extracted_data: {},
      response_message:
        "Desculpe, não entendi esse comando. 😊\n\nTente:\n• _Iasmin, registra [despesa]_\n• _Iasmin, me lembra de [tarefa]_\n• _Iasmin, agenda [evento]_",
    };
  }
}

// Classifica mensagem com imagem (visão)
export async function classifyMessageWithImage(
  message: string,
  imageUrl: string
): Promise<AIClassification> {
  // Faz download da imagem para base64
  let imageData: string;
  let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" =
    "image/jpeg";

  try {
    const imgResponse = await fetch(imageUrl);
    const buffer = await imgResponse.arrayBuffer();
    imageData = Buffer.from(buffer).toString("base64");
    const contentType = imgResponse.headers.get("content-type") || "";
    if (contentType.includes("png")) mediaType = "image/png";
    else if (contentType.includes("webp")) mediaType = "image/webp";
  } catch {
    // Se não conseguiu baixar a imagem, classifica só pelo texto
    return classifyMessage(message || "guarda essa imagem");
  }

  const response = await anthropic.messages.create({
    model: AI_MODEL_VISION,
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageData,
            },
          },
          {
            type: "text",
            text:
              message ||
              "Analise esta imagem e classifique a ação corretamente.",
          },
        ],
      },
    ],
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();

  try {
    return JSON.parse(cleaned) as AIClassification;
  } catch {
    return {
      intent: "image",
      confidence: 0.8,
      extracted_data: { image_url: imageUrl },
      response_message: "Pronto, imagem salva! 📸",
    };
  }
}

// Gera resumo financeiro do mês
export async function generateFinancialSummary(data: {
  expenses: Array<{
    description: string;
    amount: number;
    category: string;
    date: string;
  }>;
  period: string;
}): Promise<string> {
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 500,
    system:
      "Você é a Iasmin. Gere um resumo financeiro breve e claro em português brasileiro. Use emojis com moderação. Seja concisa e objetiva.",
    messages: [
      {
        role: "user",
        content: `Gere um resumo das despesas de ${data.period}:\n${JSON.stringify(data.expenses, null, 2)}`,
      },
    ],
  });

  return response.content[0].type === "text"
    ? response.content[0].text
    : "Não foi possível gerar o resumo.";
}

// Retorna uso de tokens da última chamada (para log)
export function extractTokenUsage(response: { usage: { input_tokens: number; output_tokens: number } }) {
  return {
    promptTokens: response.usage.input_tokens,
    completionTokens: response.usage.output_tokens,
    totalTokens: response.usage.input_tokens + response.usage.output_tokens,
  };
}
