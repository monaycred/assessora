import { anthropic, AI_MODEL, AI_MODEL_VISION } from "@/lib/anthropic/client";
import { openai, OPENAI_MODEL_DEFAULT } from "@/lib/openai/client";
import { createAdminClient } from "@/lib/supabase/server";
import type { AIClassification } from "@/types";

// ── Fallback prompt (usado se o banco ainda não tem config) ────────────────
const DEFAULT_SYSTEM_PROMPT = `Você é a Iasmin, uma assistente pessoal operacional via WhatsApp.

REGRAS IMPORTANTES:
- Você NÃO é um chatbot geral. Não responda perguntas aleatórias.
- Você APENAS classifica e executa ações específicas do sistema.
- Responda SEMPRE de forma curta e objetiva em português brasileiro.
- Nunca calcule automaticamente divisões de despesas. Apenas registre.

INTENÇÕES QUE VOCÊ RECONHECE:
1. "expense" - Registrar despesa/gasto/compra
2. "reminder" - Criar lembrete / lembrar de fazer algo (tomar remédio, beber água, ligar, etc.)
3. "event" - Agendar evento/consulta/compromisso em data e hora específica
4. "shopping_list" - Criar/adicionar à lista de compras
5. "wishlist" - Adicionar à lista de desejos
6. "document" - Salvar documento
7. "image" - Guardar imagem
8. "close_account" - Fechar conta / fechamento mensal
9. "unknown" - Não reconhecido

REGRA IMPORTANTE: Se o usuário pede para SER LEMBRADO de fazer algo (tomar remédio, beber água, fazer exercício, ligar, etc.), use SEMPRE "reminder" — NUNCA "health" ou outro intent.

EXTRAÇÃO DE DADOS — exemplos:
- "registra mercado 230 no cartão da Marcela"
  → intent:"expense", amount:230, description:"Mercado", category:"mercado", payment_owner:"Marcela"
- "me lembra de cortar cabelo daqui 20 dias"
  → intent:"reminder", title:"Cortar cabelo", remind_at:"<data atual + 20 dias>T08:00:00-03:00", is_recurring:false
- "me lembra de tomar remédio amanhã às 9:30h"
  → intent:"reminder", title:"Tomar remédio", remind_at:"<data de amanhã>T09:30:00-03:00", is_recurring:false
- "me lembra de ligar pra mãe às 18h"
  → intent:"reminder", title:"Ligar pra mãe", remind_at:"<data atual>T18:00:00-03:00", is_recurring:false
- "me lembra por 26 dias a partir de hoje de tomar remédio às 9:30h"
  → intent:"reminder", title:"Tomar remédio", time:"09:30", is_recurring:true, repeat_days:26
- "me lembra todos os dias por 7 dias de beber água às 8h"
  → intent:"reminder", title:"Beber água", time:"08:00", is_recurring:true, repeat_days:7
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

REGRAS PARA LEMBRETES (intent:"reminder"):
- Sempre calcule remind_at como ISO 8601 com offset -03:00 usando a data/hora do contexto.
- "amanhã" = data atual + 1 dia.
- "daqui X dias" = data atual + X dias.
- Se o usuário pedir repetição por vários dias ("por X dias", "durante X dias", "todos os dias por X dias"):
  use is_recurring:true, repeat_days:X, time:"HH:MM" (sem remind_at — o sistema cria os lembretes).
- Se NÃO houver repetição: use is_recurring:false e inclua remind_at completo.

Responda SEMPRE em JSON válido com este formato exato:
{
  "intent": "nome_da_intencao",
  "confidence": 0.95,
  "extracted_data": {
    "campo1": "valor1"
  },
  "response_message": "Mensagem curta de confirmação em português para enviar ao usuário no WhatsApp"
}

A response_message deve ser curta, amigável, e confirmar o que foi feito.`;

// ── Cache simples (evita ler o banco a cada mensagem) ──────────────────────
let configCache: { provider: string; model: string; system_prompt: string } | null = null;
let cacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

async function getActiveConfig() {
  const now = Date.now();
  if (configCache && now - cacheAt < CACHE_TTL_MS) return configCache;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("ai_config")
      .select("provider, model, system_prompt")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data?.system_prompt) {
      console.log("[Classifier] usando prompt do banco ai_config");
      configCache = data;
      cacheAt = now;
      return data;
    }
  } catch {
    // tabela não existe — usa fallback
  }

  console.log("[Classifier] usando DEFAULT_SYSTEM_PROMPT");
  return { provider: "anthropic", model: AI_MODEL, system_prompt: DEFAULT_SYSTEM_PROMPT };
}

export function clearConfigCache() {
  configCache = null;
  cacheAt = 0;
}

// ── Classifica via Anthropic ───────────────────────────────────────────────
async function classifyWithAnthropic(userContent: string, systemPrompt: string, model: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: model || AI_MODEL,
    max_tokens: 600,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });
  return response.content[0].type === "text" ? response.content[0].text : "{}";
}

// ── Classifica via OpenAI ──────────────────────────────────────────────────
async function classifyWithOpenAI(userContent: string, systemPrompt: string, model: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: model || OPENAI_MODEL_DEFAULT,
    max_tokens: 600,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });
  return response.choices[0]?.message?.content || "{}";
}

// ── Função principal ───────────────────────────────────────────────────────
export async function classifyMessage(
  message: string,
  contextInfo?: string
): Promise<AIClassification> {
  const config = await getActiveConfig();
  const userContent = contextInfo ? `Contexto: ${contextInfo}\n\nMensagem: ${message}` : message;

  let raw: string;
  try {
    if (config.provider === "openai") {
      raw = await classifyWithOpenAI(userContent, config.system_prompt, config.model);
    } else {
      raw = await classifyWithAnthropic(userContent, config.system_prompt, config.model);
    }
  } catch (err) {
    console.error("[Classifier] Erro ao chamar IA:", err);
    throw err;
  }

  const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();

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

// ── Classifica com imagem (sempre Anthropic Vision) ───────────────────────
export async function classifyMessageWithImage(
  message: string,
  imageUrl: string
): Promise<AIClassification> {
  const config = await getActiveConfig();

  let imageData: string;
  let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg";

  try {
    const imgResponse = await fetch(imageUrl);
    const buffer = await imgResponse.arrayBuffer();
    imageData = Buffer.from(buffer).toString("base64");
    const contentType = imgResponse.headers.get("content-type") || "";
    if (contentType.includes("png")) mediaType = "image/png";
    else if (contentType.includes("webp")) mediaType = "image/webp";
  } catch {
    return classifyMessage(message || "guarda essa imagem");
  }

  const response = await anthropic.messages.create({
    model: AI_MODEL_VISION,
    max_tokens: 600,
    system: config.system_prompt,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageData } },
          { type: "text", text: message || "Analise esta imagem e classifique a ação corretamente." },
        ],
      },
    ],
  });

  const content = response.content[0].type === "text" ? response.content[0].text : "{}";
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

// ── Resumo financeiro ──────────────────────────────────────────────────────
export async function generateFinancialSummary(data: {
  expenses: Array<{ description: string; amount: number; category: string; date: string }>;
  period: string;
}): Promise<string> {
  const config = await getActiveConfig();
  const systemMsg = "Você é a Iasmin. Gere um resumo financeiro breve e claro em português brasileiro. Use emojis com moderação. Seja concisa e objetiva.";
  const userMsg = `Gere um resumo das despesas de ${data.period}:\n${JSON.stringify(data.expenses, null, 2)}`;

  if (config.provider === "openai") {
    const response = await openai.chat.completions.create({
      model: config.model || OPENAI_MODEL_DEFAULT,
      max_tokens: 500,
      messages: [{ role: "system", content: systemMsg }, { role: "user", content: userMsg }],
    });
    return response.choices[0]?.message?.content || "Não foi possível gerar o resumo.";
  }

  const response = await anthropic.messages.create({
    model: config.model || AI_MODEL,
    max_tokens: 500,
    system: systemMsg,
    messages: [{ role: "user", content: userMsg }],
  });
  return response.content[0].type === "text" ? response.content[0].text : "Não foi possível gerar o resumo.";
}

export function extractTokenUsage(response: { usage: { input_tokens: number; output_tokens: number } }) {
  return {
    promptTokens: response.usage.input_tokens,
    completionTokens: response.usage.output_tokens,
    totalTokens: response.usage.input_tokens + response.usage.output_tokens,
  };
}
