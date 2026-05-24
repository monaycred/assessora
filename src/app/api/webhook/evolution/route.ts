import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { classifyMessage, classifyMessageWithImage } from "@/lib/ai/classifier";
import { sendTextMessage } from "@/lib/evolution/client";
import { estimateTokenCost, cleanWhatsAppNumber, parseAmount } from "@/lib/utils";
import { AI_MODEL } from "@/lib/anthropic/client";

// POST /api/webhook/evolution
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createAdminClient();

    // Extrai dados da mensagem da Evolution API
    const event = body?.event;
    const data = body?.data;

    // Extrai o nome da instância que enviou o evento
    const instanceName: string =
      body?.instance ||
      body?.instanceName ||
      data?.instance?.instanceName ||
      process.env.EVOLUTION_INSTANCE_NAME ||
      "TMT2";

    // Trata atualização de QR code / status de conexão
    if (event === "qrcode.updated" || event === "QRCODE_UPDATED") {
      const qrCode = data?.qrcode?.base64 || data?.base64 || "";
      await supabase
        .from("whatsapp_instances")
        .update({ status: "qr_code" })
        .eq("instance_name", instanceName);
      return NextResponse.json({ ok: true });
    }

    if (event === "connection.update" || event === "CONNECTION_UPDATE") {
      const state = data?.state || data?.connection;
      if (state === "open") {
        const phone = data?.wid?.split("@")[0] || data?.me?.id?.split(":")[0] || null;
        await supabase
          .from("whatsapp_instances")
          .update({
            status: "connected",
            connected_at: new Date().toISOString(),
            ...(phone ? { phone_number: phone } : {}),
          })
          .eq("instance_name", instanceName);
      } else if (state === "close" || state === "connecting") {
        await supabase
          .from("whatsapp_instances")
          .update({ status: state === "close" ? "disconnected" : "connecting" })
          .eq("instance_name", instanceName);
      }
      return NextResponse.json({ ok: true });
    }

    // Só processa mensagens recebidas
    if (event !== "messages.upsert") {
      return NextResponse.json({ ok: true });
    }

    const message = data?.messages?.[0] || data?.message || data;
    if (!message) return NextResponse.json({ ok: true });

    // Extrai número do remetente
    const fromJID = message?.key?.remoteJid || message?.from || "";
    const fromNumber = cleanWhatsAppNumber(fromJID);

    if (!fromNumber || fromJID.includes("@g.us")) {
      // Ignora grupos
      return NextResponse.json({ ok: true });
    }

    // Extrai conteúdo
    const messageContent =
      message?.message?.conversation ||
      message?.message?.extendedTextMessage?.text ||
      message?.body ||
      "";

    const messageType = message?.message?.imageMessage
      ? "image"
      : message?.message?.documentMessage
      ? "document"
      : "text";

    const mediaUrl =
      message?.message?.imageMessage?.url ||
      message?.message?.documentMessage?.url ||
      null;

    console.log(`[Webhook] Mensagem de ${fromNumber}: ${messageContent}`);

    // 1. Verifica se número está autorizado
    const { data: authorizedNumber } = await supabase
      .from("authorized_whatsapp_numbers")
      .select("*, user_id")
      .eq("phone_number", fromNumber)
      .eq("is_active", true)
      .single();

    if (!authorizedNumber) {
      // 2. Cria solicitação pendente (se não existe)
      const { data: existingRequest } = await supabase
        .from("approval_requests")
        .select("id, status")
        .eq("phone_number", fromNumber)
        .single();

      if (!existingRequest) {
        await supabase.from("approval_requests").insert({
          phone_number: fromNumber,
          status: "pending",
          requested_at: new Date().toISOString(),
        });

        await sendTextMessage(
          fromNumber,
          "Olá! Esse número ainda precisa ser aprovado pelo administrador. Aguarde a aprovação para usar a Iasmin. 😊",
          instanceName
        );
      } else if (existingRequest.status === "pending") {
        await sendTextMessage(
          fromNumber,
          "Seu número ainda está aguardando aprovação. Você será notificado quando puder usar a Iasmin.",
          instanceName
        );
      } else if (existingRequest.status === "rejected") {
        await sendTextMessage(
          fromNumber,
          "Infelizmente seu número não foi autorizado. Entre em contato com o administrador.",
          instanceName
        );
      }

      return NextResponse.json({ ok: true });
    }

    const userId = authorizedNumber.user_id;

    // 3. Salva a mensagem
    const { data: savedMessage } = await supabase
      .from("messages")
      .insert({
        user_id: userId,
        whatsapp_number: fromNumber,
        message_id: message?.key?.id || crypto.randomUUID(),
        content: messageContent,
        message_type: messageType,
        media_url: mediaUrl,
        raw_payload: message,
        processed: false,
      })
      .select()
      .single();

    // 4. Verifica se a mensagem começa com "Iasmin" ou "Gabi"
    const cleanContent = messageContent.trim().toLowerCase();
    const isCommand =
      cleanContent.startsWith("iasmin") ||
      cleanContent.startsWith("gabi") ||
      messageType === "image" ||
      messageType === "document";

    if (!isCommand && messageType === "text") {
      await sendTextMessage(
        fromNumber,
        "Olá! Para me chamar, comece a mensagem com *Iasmin* 😊\n\nExemplo: _Iasmin, registra mercado 150_"
      );
      return NextResponse.json({ ok: true });
    }

    // 5. Classifica com IA
    let classification;
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      if (mediaUrl && messageType === "image") {
        classification = await classifyMessageWithImage(messageContent, mediaUrl);
      } else {
        classification = await classifyMessage(messageContent);
      }

      // Estima tokens (aproximado)
      promptTokens = Math.ceil((messageContent.length / 4) + 500);
      completionTokens = 100;
    } catch (aiError) {
      console.error("[Webhook] Erro na classificação IA:", aiError);
      await sendTextMessage(
        fromNumber,
        "Desculpe, tive um problema ao processar sua mensagem. Tente novamente.",
        instanceName
      );
      return NextResponse.json({ ok: true });
    }

    // 6. Executa a ação baseada na classificação
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
          const remindAt = rd.remind_at || rd.date || new Date(Date.now() + 86400000).toISOString();
          await supabase.from("reminders").insert({
            user_id: userId,
            title: rd.title || messageContent,
            description: messageContent,
            remind_at: remindAt,
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
          const items = sd.items || [];
          const listName = sd.list_name || "Lista de compras";

          const { data: list } = await supabase
            .from("shopping_lists")
            .insert({
              user_id: userId,
              name: listName,
              is_completed: false,
              is_private: false,
            })
            .select()
            .single();

          if (list && items.length > 0) {
            await supabase.from("shopping_list_items").insert(
              items.map((item: string) => ({
                list_id: list.id,
                name: item,
                is_checked: false,
              }))
            );
          }
          actionTaken = "shopping_list";
          break;
        }

        case "wishlist": {
          const wd = classification.extracted_data as any;
          await supabase.from("wishlist_items").insert({
            user_id: userId,
            name: wd.name || messageContent,
            description: wd.description || null,
            estimated_price: wd.price || null,
            priority: wd.priority || "medium",
            is_purchased: false,
            is_private: false,
          });
          actionTaken = "wishlist";
          break;
        }

        case "health": {
          const hd = classification.extracted_data as any;
          await supabase.from("health_records").insert({
            user_id: userId,
            record_type: hd.type || "consulta",
            title: hd.title || messageContent,
            description: messageContent,
            doctor_name: hd.doctor || null,
            record_date: hd.date || new Date().toISOString().split("T")[0],
            next_appointment: hd.next_appointment || null,
          });
          actionTaken = "health";
          break;
        }

        case "trip": {
          const td = classification.extracted_data as any;
          await supabase.from("trips").insert({
            user_id: userId,
            title: td.title || `Viagem para ${td.destination || "destino"}`,
            destination: td.destination || "A definir",
            start_date: td.start_date || null,
            end_date: td.end_date || null,
            status: "planned",
            notes: messageContent,
            is_private: false,
          });
          actionTaken = "trip";
          break;
        }

        case "image":
        case "document": {
          const dd = classification.extracted_data as any;
          await supabase.from("documents").insert({
            user_id: userId,
            title: dd.title || (messageType === "image" ? "Imagem" : "Documento"),
            doc_type: messageType === "image" ? "image" : "other",
            file_url: mediaUrl || "",
            folder: dd.folder || null,
            is_private: false,
          });
          actionTaken = messageType;
          break;
        }

        case "close_account": {
          // Busca despesas do mês
          const firstDay = new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
          ).toISOString();

          const { data: monthExpenses } = await supabase
            .from("expenses")
            .select("description, amount, category")
            .eq("user_id", userId)
            .gte("expense_date", firstDay);

          const total = (monthExpenses || []).reduce(
            (sum: number, e: { amount?: number }) => sum + (e.amount || 0),
            0
          );

          const lines = (monthExpenses || [])
            .map((e: any) => `• ${e.description}: R$ ${e.amount?.toFixed(2)}`)
            .join("\n");

          responseMessage = `*Fechamento do mês:*\n\n${lines || "Nenhuma despesa"}\n\n*Total: R$ ${total.toFixed(2)}*`;
          actionTaken = "close_account";
          break;
        }

        case "unknown":
        default: {
          responseMessage =
            "Não entendi esse comando 😊 Tente:\n\n• _Iasmin, registra mercado 150_\n• _Iasmin, me lembra de cortar cabelo daqui 20 dias_\n• _Iasmin, agenda consulta dia 25 às 14h_";
          break;
        }
      }
    } catch (actionError) {
      console.error("[Webhook] Erro ao executar ação:", actionError);
      responseMessage = "Entendi o comando, mas tive um problema ao salvar. Tente novamente.";
    }

    // Garante que responseMessage tem valor
    if (!responseMessage) {
      responseMessage = "✅ Feito!";
    }

    // 7. Atualiza mensagem como processada
    if (savedMessage) {
      await supabase
        .from("messages")
        .update({ processed: true, action_taken: actionTaken })
        .eq("id", savedMessage.id);
    }

    // 8. Registra uso de IA
    await supabase.from("ai_usage_logs").insert({
      user_id: userId,
      model: AI_MODEL,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
      estimated_cost: estimateTokenCost(AI_MODEL, promptTokens, completionTokens),
      action: actionTaken,
    });

    // 9. Registra log de auditoria
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: `whatsapp_${actionTaken}`,
      entity_type: actionTaken,
      new_data: { message: messageContent, from: fromNumber },
    });

    // 10. Responde no WhatsApp (pela mesma instância que recebeu)
    await sendTextMessage(fromNumber, responseMessage, instanceName);

    return NextResponse.json({ ok: true, action: actionTaken });
  } catch (error) {
    console.error("[Webhook] Erro geral:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - para verificação do webhook
export async function GET() {
  return NextResponse.json({ status: "Iasmin webhook active " });
}
