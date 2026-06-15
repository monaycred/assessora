// ============================================================
// WhatsApp Notifications - Addiction Tracker
// Integração com Evolution API para enviar mensagens
// ============================================================

import { generateMilestoneMessage } from './utils';

interface WhatsAppNotification {
  trackerId: string;
  userPhone: string;
  milestoneDays: number;
  userFirstName?: string;
}

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.NEXT_PUBLIC_EVOLUTION_INSTANCE || 'IASMIN';

/**
 * Envia notificação de marco atingido via WhatsApp
 * Integração com Evolution API
 */
export async function sendMilestoneNotification(
  notification: WhatsAppNotification
): Promise<boolean> {
  try {
    const message = generateMilestoneMessage(notification.milestoneDays);

    // Validar se tem Evolution API configurada
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.warn('[WhatsApp] Evolution API não configurada');
      return false;
    }

    // Formatar número (remover caracteres especiais)
    const phoneNumber = notification.userPhone.replace(/\D/g, '');
    if (!phoneNumber || phoneNumber.length < 10) {
      console.warn('[WhatsApp] Número de telefone inválido:', notification.userPhone);
      return false;
    }

    // Preparar payload para Evolution API
    const payload = {
      number: phoneNumber,
      options: {
        delay: 1000,
        presence: 'composing',
      },
      textMessage: {
        text: message,
      },
    };

    // Enviar via Evolution API
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[WhatsApp] Erro ao enviar notificação:', response.status, error);
      return false;
    }

    console.log('[WhatsApp] Notificação de marco enviada com sucesso:', {
      phone: phoneNumber,
      days: notification.milestoneDays,
    });

    return true;
  } catch (error) {
    console.error('[WhatsApp] Erro ao enviar notificação:', error);
    return false;
  }
}

/**
 * Envia notificação diária de progresso
 */
export async function sendDailyProgressNotification(
  userPhone: string,
  trackerName: string,
  currentDays: number
): Promise<boolean> {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.warn('[WhatsApp] Evolution API não configurada');
      return false;
    }

    const message = `${trackerName}: Você está no dia ${currentDays}! 💪\n\nQuer adicionar uma nota sobre hoje?`;
    const phoneNumber = userPhone.replace(/\D/g, '');

    const payload = {
      number: phoneNumber,
      options: { delay: 1000 },
      textMessage: { text: message },
    };

    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      console.error('[WhatsApp] Erro ao enviar notificação diária:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[WhatsApp] Erro ao enviar notificação diária:', error);
    return false;
  }
}

/**
 * Envia mensagem de confirmação de milestone
 */
export async function sendMilestoneConfirmation(
  userPhone: string,
  trackerName: string,
  days: number,
  confirmed: boolean
): Promise<boolean> {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.warn('[WhatsApp] Evolution API não configurada');
      return false;
    }

    const message = confirmed
      ? `${trackerName}: Próximo marco em breve! Você está indo bem! 🚀`
      : `${trackerName}: Tudo bem, a vida é um processo. Vamos recomeçar? 💪`;

    const phoneNumber = userPhone.replace(/\D/g, '');

    const payload = {
      number: phoneNumber,
      options: { delay: 1000 },
      textMessage: { text: message },
    };

    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify(payload),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('[WhatsApp] Erro ao enviar confirmação:', error);
    return false;
  }
}

/**
 * Busca número de telefone do usuário para enviar notificação
 */
export async function getUserPhoneNumber(userId: string): Promise<string | null> {
  try {
    // TODO: Implementar busca real no banco
    // const { createClient } = require('@supabase/supabase-js');
    // const supabase = createClient(...);
    // const { data } = await supabase
    //   .from('user_profiles')
    //   .select('phone')
    //   .eq('user_id', userId)
    //   .single();
    // return data?.phone || null;

    console.log('[WhatsApp] Buscando número do usuário:', userId);
    return null;
  } catch (error) {
    console.error('[WhatsApp] Erro ao buscar número:', error);
    return null;
  }
}
