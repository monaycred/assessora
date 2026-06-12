import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { classifyMessage, classifyMessageWithImage } from "@/lib/ai/classifier";
import { sendTextMessage } from "@/lib/evolution/client";
import { estimateTokenCost, cleanWhatsAppNumber, parseAmount } from "@/lib/utils";
import { AI_MODEL } from "@/lib/anthropic/client";

// Valida CPF (formato e dígitos verificadores)
function validarCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(c[10]);
}

// Formata CPF para exibição
function formatarCPF(cpf: string): string {
  const c = cpf.replace(/\D/g, "");
  return `${c.slice(0,3)}.${c.slice(3,6)}.${c.slice(6,9)}-${c.slice(9,11)}`;
}

// Busca endereço pelo CEP via ViaCEP
async function buscarCEP(cep: string): Promise<{ logradouro: string; bairro: string; localidade: string; uf: string } | null> {
  try {
    const c = cep.replace(/\D/g, "");
    if (c.length !== 8) return null;
    const res = await fetch(`https://viacep.com.br/ws/${c}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

// Salva log do webhook para debug
async function log(supabase: any, data: {
  instance_name?: string;
  from_number?: string;
  event_type?: string;
  message_content?: string;
  step_before?: number;
  step_after?: number;
  result?: string;
  error?: string;
}) {
  try {
    await supabase.from("webhook_logs").insert(data);
  } catch { /* log nunca deve quebrar o fluxo */ }
}

// POST /api/webhook/evolution
export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  try {
    const body = await req.json();

    const event = body?.event;
    const data = body?.data;

    const instanceName: string =
      body?.instance ||
      body?.instanceName ||
      data?.instance?.instanceName ||
      process.env.EVOLUTION_INSTANCE_NAME ||
      "IASMIN";

    // ── Eventos de conexão/QR — só atualiza status ──────────────────────────
    if (event === "qrcode.updated" || event === "QRCODE_UPDATED") {
      await supabase.from("whatsapp_instances")
        .update({ status_conexao: "qr_code" })
        .eq("instance_name", instanceName);
      return NextResponse.json({ ok: true });
    }

    if (event === "connection.update" || event === "CONNECTION_UPDATE") {
      const state = data?.state || data?.connection;
      if (state === "open") {
        await supabase.from("whatsapp_instances")
          .update({ status_conexao: "online", status: "connected" })
          .eq("instance_name", instanceName);
      } else if (state === "close") {
        await supabase.from("whatsapp_instances")
          .update({ status_conexao: "desconectado", status: "disconnected" })
          .eq("instance_name", instanceName);
      }
      return NextResponse.json({ ok: true });
    }

    // ── Só processa messages.upsert ─────────────────────────────────────────
    if (event !== "messages.upsert" && event !== "MESSAGES_UPSERT") {
      return NextResponse.json({ ok: true });
    }

    // Evolution v2 envia o objeto da mensagem direto em data (com key, message, etc.)
    // data?.messages?.[0] cobre o caso de array; fallback é data diretamente
    const message = data?.messages?.[0] || data;
    if (!message) return NextResponse.json({ ok: true });

    // Ignora mensagens enviadas pelo próprio bot
    if (message?.key?.fromMe === true) return NextResponse.json({ ok: true });

    const fromJID = message?.key?.remoteJid || message?.from || "";
    const fromNumber = cleanWhatsAppNumber(fromJID);

    if (!fromNumber || fromJID.includes("@g.us")) {
      return NextResponse.json({ ok: true });
    }

    const messageContent: string =
      message?.message?.conversation ||
      message?.message?.extendedTextMessage?.text ||
      message?.body ||
      "";

    const messageType = message?.message?.imageMessage ? "image"
      : message?.message?.documentMessage ? "document"
      : "text";

    const mediaUrl =
      message?.message?.imageMessage?.url ||
      message?.message?.documentMessage?.url ||
      null;

    console.log(`[Webhook] ${instanceName} | ${fromNumber}: "${messageContent}"`);

    // ── Busca contato pelo telefone ─────────────────────────────────────────
    const { data: contact } = await supabase
      .from("contacts")
      .select("*")
      .eq("phone_number", fromNumber)
      .maybeSingle();

    // ═══════════════════════════════════════════════════════════════════════
    // CASO 1: Contato APROVADO — responde com IA normalmente
    // ═══════════════════════════════════════════════════════════════════════
    if (contact?.status === "aprovado") {
      await log(supabase, { instance_name: instanceName, from_number: fromNumber, event_type: "message", message_content: messageContent, result: "ai_processing" });

      const authUserId = contact.user_id; // auth.users.id

      // Busca o profile id (todas as tabelas referenciam user_profiles.id, não auth.users.id)
      const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", authUserId)
        .single();
      const userId = userProfile?.id ?? authUserId;

      // Salva mensagem
      const { data: savedMessage } = await supabase.from("messages").insert({
        user_id: userId,
        whatsapp_number: fromNumber,
        message_id: message?.key?.id || crypto.randomUUID(),
        content: messageContent,
        message_type: messageType,
        media_url: mediaUrl,
        raw_payload: message,
        processed: false,
      }).select().single();

      // Verifica prefixo "Iasmin" ou qualquer mensagem (onboarding já passou)
      const cleanContent = messageContent.trim().toLowerCase();
      const isCommand = cleanContent.startsWith("iasmin") || cleanContent.startsWith("ia,") || messageType !== "text";

      if (!isCommand) {
        await sendTextMessage(fromNumber, "Para me chamar, comece com *Iasmin* 😊\n\nExemplo: _Iasmin, registra mercado 150_", instanceName);
        return NextResponse.json({ ok: true });
      }

      // Classifica com IA
      let classification: any;
      let promptTokens = 0;
      let completionTokens = 0;

      try {
        if (mediaUrl && messageType === "image") {
          classification = await classifyMessageWithImage(messageContent, mediaUrl);
        } else {
          const now = new Date();
          // Servidor roda em UTC — calcula horário de Brasília (UTC-3)
          const brasilOffset = -3 * 60;
          const brasilTime = new Date(now.getTime() + (brasilOffset - now.getTimezoneOffset()) * 60000);
          const p = (n: number) => String(n).padStart(2, "0");
          const brasilDateStr = `${brasilTime.getFullYear()}-${p(brasilTime.getMonth()+1)}-${p(brasilTime.getDate())}`;
          const brasilTimeStr = `${p(brasilTime.getHours())}:${p(brasilTime.getMinutes())}`;
          const contextInfo = [
            `Fuso horário: America/Sao_Paulo (UTC-3).`,
            `Data e hora atual no Brasil: ${brasilDateStr} às ${brasilTimeStr}.`,
            `IMPORTANTE: sempre use offset -03:00 nos campos de data/hora (remind_at, start_at).`,
            `Exemplo: "18:29 de hoje" = "${brasilDateStr}T18:29:00-03:00".`,
          ].join(" ");
          classification = await classifyMessage(messageContent, contextInfo);
        }
        promptTokens = Math.ceil((messageContent.length / 4) + 500);
        completionTokens = 100;
      } catch (aiError) {
        console.error("[Webhook] Erro IA:", aiError);
        await sendTextMessage(fromNumber, "Tive um problema ao processar. Tente novamente.", instanceName);
        await log(supabase, { instance_name: instanceName, from_number: fromNumber, event_type: "ai_error", error: String(aiError) });
        return NextResponse.json({ ok: true });
      }

      let actionTaken = "unknown";
      let responseMessage = classification.response_message;

      try {
        switch (classification.intent) {
          case "expense": {
            const ed = classification.extracted_data as any;
            await supabase.from("expenses").insert({
              user_id: userId,
              description: ed.description || messageContent,
              amount: parseAmount(String(ed.amount || 0)),
              category: ed.category || "outros",
              expense_date: ed.date || new Date().toISOString().split("T")[0],
              is_shared: ed.is_shared || false,
              is_private: false,
              notes: messageContent,
            });
            actionTaken = "expense";
            break;
          }
          case "reminder": {
            const rd = classification.extracted_data as any;
            await supabase.from("reminders").insert({
              user_id: userId,
              title: rd.title || messageContent,
              description: messageContent,
              remind_at: rd.remind_at || rd.date || new Date(Date.now() + 86400000).toISOString(),
              status: "pending",
              is_recurring: false,
              is_private: false,
            });
            actionTaken = "reminder";
            break;
          }
          case "event": {
            const evd = classification.extracted_data as any;
            await supabase.from("calendar_events").insert({
              user_id: userId,
              title: evd.title || messageContent,
              description: messageContent,
              location: evd.location || null,
              start_at: evd.start_at || evd.date || new Date().toISOString(),
              all_day: false,
              is_private: false,
              event_type: evd.event_type || null,
            });
            actionTaken = "event";
            break;
          }
          case "shopping_list": {
            const sd = classification.extracted_data as any;
            const { data: list } = await supabase.from("shopping_lists").insert({
              user_id: userId,
              name: sd.list_name || "Lista de compras",
              is_completed: false,
              is_private: false,
            }).select().single();
            if (list && sd.items?.length > 0) {
              await supabase.from("shopping_list_items").insert(
                sd.items.map((item: string) => ({ list_id: list.id, name: item, is_checked: false }))
              );
            }
            actionTaken = "shopping_list";
            break;
          }
          case "wishlist": {
            const wd = classification.extracted_data as any;
            await supabase.from("wishlist_items").insert({
              user_id: userId, name: wd.name || messageContent,
              description: wd.description || null, estimated_price: wd.price || null,
              priority: wd.priority || "medium", is_purchased: false, is_private: false,
            });
            actionTaken = "wishlist";
            break;
          }
          case "close_account": {
            const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
            const { data: monthExpenses } = await supabase.from("expenses")
              .select("description, amount, category").eq("user_id", userId).gte("expense_date", firstDay);
            const total = (monthExpenses || []).reduce((s: number, e: any) => s + (e.amount || 0), 0);
            const lines = (monthExpenses || []).map((e: any) => `• ${e.description}: R$ ${Number(e.amount).toFixed(2)}`).join("\n");
            responseMessage = `*Fechamento do mês:*\n\n${lines || "Nenhuma despesa"}\n\n*Total: R$ ${total.toFixed(2)}*`;
            actionTaken = "close_account";
            break;
          }
          default: {
            responseMessage = "Não entendi 😊 Tente:\n• _Iasmin, registra mercado 150_\n• _Iasmin, me lembra de cortar cabelo daqui 20 dias_\n• _Iasmin, agenda consulta dia 25 às 14h_";
            break;
          }
        }
      } catch (actionError) {
        console.error("[Webhook] Erro na ação:", actionError);
        responseMessage = "Entendi, mas tive um problema ao salvar. Tente novamente.";
      }

      if (!responseMessage) responseMessage = "✅ Feito!";

      if (savedMessage) {
        await supabase.from("messages").update({ processed: true, action_taken: actionTaken }).eq("id", savedMessage.id);
      }

      await supabase.from("ai_usage_logs").insert({
        user_id: userId, model: AI_MODEL,
        prompt_tokens: promptTokens, completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        estimated_cost: estimateTokenCost(AI_MODEL, promptTokens, completionTokens),
        action: actionTaken,
      });

      await sendTextMessage(fromNumber, responseMessage, instanceName);
      await log(supabase, { instance_name: instanceName, from_number: fromNumber, event_type: "ai_response", message_content: messageContent, result: actionTaken });

      return NextResponse.json({ ok: true, action: actionTaken });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CASO 2: Aguardando aprovação — fica MUDO
    // ═══════════════════════════════════════════════════════════════════════
    if (contact?.status === "aguardando_aprovacao") {
      await log(supabase, { instance_name: instanceName, from_number: fromNumber, event_type: "message", message_content: messageContent, result: "silenced_awaiting_approval" });
      // Não responde nada
      return NextResponse.json({ ok: true });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CASO 3: Bloqueado — ignora silenciosamente
    // ═══════════════════════════════════════════════════════════════════════
    if (contact?.status === "bloqueado") {
      return NextResponse.json({ ok: true });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CASO 4: Em onboarding (ou novo contato)
    // ═══════════════════════════════════════════════════════════════════════
    const stepAtual = contact?.onboarding_step ?? -1;
    const resposta = messageContent.trim();

    // Novo contato — cria registro e inicia onboarding
    if (!contact) {
      await supabase.from("contacts").insert({
        phone_number: fromNumber,
        status: "onboarding",
        onboarding_step: 0,
        instance_name: instanceName,
        first_message: messageContent,
      });

      await log(supabase, { instance_name: instanceName, from_number: fromNumber, event_type: "new_contact", message_content: messageContent, step_before: -1, step_after: 0 });

      await sendTextMessage(
        fromNumber,
        "Olá! 👋 Sou a Iasmin, sua assessora virtual pessoal.\n\nVamos fazer seu cadastro rapidinho!\n\n*Qual é o seu nome completo?*",
        instanceName
      );
      return NextResponse.json({ ok: true });
    }

    // Processa cada step do onboarding
    switch (stepAtual) {

      case 0: { // Aguardando nome
        if (resposta.length < 3) {
          await sendTextMessage(fromNumber, "Por favor, informe seu nome completo 😊", instanceName);
          return NextResponse.json({ ok: true });
        }
        await supabase.from("contacts").update({ name: resposta, onboarding_step: 1 }).eq("phone_number", fromNumber);
        await log(supabase, { instance_name: instanceName, from_number: fromNumber, event_type: "onboarding", message_content: resposta, step_before: 0, step_after: 1, result: "nome salvo" });
        const primeiroNome = resposta.split(" ")[0];
        await sendTextMessage(fromNumber, `Prazer, *${primeiroNome}*! 😊\n\nAgora preciso do seu *CPF* (só os números):`, instanceName);
        break;
      }

      case 1: { // Aguardando CPF
        const cpfLimpo = resposta.replace(/\D/g, "");
        if (!validarCPF(cpfLimpo)) {
          await sendTextMessage(fromNumber, "CPF inválido. Por favor, digite novamente (só os números):", instanceName);
          return NextResponse.json({ ok: true });
        }
        // Verifica se CPF já está cadastrado
        const { data: cpfExistente } = await supabase.from("contacts").select("id").eq("cpf", cpfLimpo).maybeSingle();
        if (cpfExistente) {
          await sendTextMessage(fromNumber, "Esse CPF já possui um cadastro. Entre em contato com o suporte.", instanceName);
          return NextResponse.json({ ok: true });
        }
        await supabase.from("contacts").update({ cpf: cpfLimpo, onboarding_step: 2 }).eq("phone_number", fromNumber);
        await log(supabase, { instance_name: instanceName, from_number: fromNumber, event_type: "onboarding", step_before: 1, step_after: 2, result: "cpf salvo" });
        await sendTextMessage(fromNumber, "✅ CPF registrado!\n\nQual é a sua *data de nascimento*? (DD/MM/AAAA)", instanceName);
        break;
      }

      case 2: { // Aguardando data de nascimento
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!dateRegex.test(resposta)) {
          await sendTextMessage(fromNumber, "Formato inválido. Use DD/MM/AAAA. Exemplo: 15/03/1990", instanceName);
          return NextResponse.json({ ok: true });
        }
        const [, dia, mes, ano] = resposta.match(dateRegex)!;
        const anoNum = parseInt(ano);
        if (anoNum < 1900 || anoNum > new Date().getFullYear() - 16) {
          await sendTextMessage(fromNumber, "Data inválida. Verifique e tente novamente.", instanceName);
          return NextResponse.json({ ok: true });
        }
        await supabase.from("contacts").update({ birth_date: resposta, onboarding_step: 3 }).eq("phone_number", fromNumber);
        await log(supabase, { instance_name: instanceName, from_number: fromNumber, event_type: "onboarding", step_before: 2, step_after: 3, result: "nascimento salvo" });
        await sendTextMessage(fromNumber, "Perfeito! 🎂\n\nQual é o seu *email*? (você receberá o acesso por aqui)", instanceName);
        break;
      }

      case 3: { // Aguardando email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(resposta)) {
          await sendTextMessage(fromNumber, "Email inválido. Digite um email correto:", instanceName);
          return NextResponse.json({ ok: true });
        }
        // Verifica se email já existe
        const { data: emailExistente } = await supabase.from("contacts").select("id").eq("email", resposta.toLowerCase()).maybeSingle();
        if (emailExistente) {
          await sendTextMessage(fromNumber, "Esse email já está cadastrado. Use outro ou entre em contato com o suporte.", instanceName);
          return NextResponse.json({ ok: true });
        }
        await supabase.from("contacts").update({ email: resposta.toLowerCase(), onboarding_step: 4 }).eq("phone_number", fromNumber);
        await log(supabase, { instance_name: instanceName, from_number: fromNumber, event_type: "onboarding", step_before: 3, step_after: 4, result: "email salvo" });
        await sendTextMessage(fromNumber, "✅ Email registrado!\n\nQual é o seu *CEP*? (só os números)", instanceName);
        break;
      }

      case 4: { // Aguardando CEP
        const cepLimpo = resposta.replace(/\D/g, "");
        if (cepLimpo.length !== 8) {
          await sendTextMessage(fromNumber, "CEP inválido. Digite os 8 números do CEP:", instanceName);
          return NextResponse.json({ ok: true });
        }
        const endereco = await buscarCEP(cepLimpo);
        if (!endereco) {
          await sendTextMessage(fromNumber, "Não encontrei esse CEP. Verifique e tente novamente:", instanceName);
          return NextResponse.json({ ok: true });
        }
        await supabase.from("contacts").update({
          cep: cepLimpo,
          address_json: endereco,
          onboarding_step: 5,
        }).eq("phone_number", fromNumber);
        await log(supabase, { instance_name: instanceName, from_number: fromNumber, event_type: "onboarding", step_before: 4, step_after: 5, result: "cep salvo" });
        await sendTextMessage(
          fromNumber,
          `Encontrei seu endereço:\n\n📍 ${endereco.logradouro}\n${endereco.bairro}\n${endereco.localidade} - ${endereco.uf}\n\nEstá correto? Responda *SIM* para confirmar ou *NÃO* para corrigir o CEP.`,
          instanceName
        );
        break;
      }

      case 5: { // Aguardando confirmação do endereço
        const sim = /^sim$/i.test(resposta.trim());
        const nao = /^n[aã]o$/i.test(resposta.trim());
        if (!sim && !nao) {
          await sendTextMessage(fromNumber, "Por favor, responda *SIM* ou *NÃO*:", instanceName);
          return NextResponse.json({ ok: true });
        }
        if (nao) {
          // Volta para o step do CEP
          await supabase.from("contacts").update({ onboarding_step: 4, cep: null, address_json: {} }).eq("phone_number", fromNumber);
          await sendTextMessage(fromNumber, "Tudo bem! Digite o *CEP* correto:", instanceName);
          return NextResponse.json({ ok: true });
        }
        // Confirmou — finaliza pré-cadastro
        await supabase.from("contacts").update({
          onboarding_step: 6,
          status: "aguardando_aprovacao",
        }).eq("phone_number", fromNumber);
        await log(supabase, { instance_name: instanceName, from_number: fromNumber, event_type: "onboarding_complete", step_before: 5, step_after: 6, result: "aguardando_aprovacao" });
        await sendTextMessage(
          fromNumber,
          "✅ *Cadastro concluído!*\n\nSeu cadastro foi recebido e está aguardando aprovação.\n\nAssim que for aprovado, você receberá um email com o link de acesso à Iasmin. 🎉",
          instanceName
        );
        break;
      }

      default: {
        // Step desconhecido — não faz nada
        await log(supabase, { instance_name: instanceName, from_number: fromNumber, event_type: "unknown_step", message_content: resposta, step_before: stepAtual, result: "ignored" });
        break;
      }
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("[Webhook] Erro geral:", error);
    await log(supabase, { event_type: "fatal_error", error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - health check
export async function GET() {
  return NextResponse.json({ status: "Iasmin webhook active", version: "2.0" });
}
