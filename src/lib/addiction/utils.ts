// ============================================================
// UTILITÁRIOS - Addiction Tracker
// ============================================================

import { RANDOM_CITIES } from '@/types/addiction';

/**
 * Gera um nome de cidade aleatório
 */
export function generateRandomCity(): string {
  return RANDOM_CITIES[Math.floor(Math.random() * RANDOM_CITIES.length)];
}

/**
 * Calcula dias decorridos desde uma data
 */
export function calculateDaysSince(startDate: string | Date): number {
  const start = new Date(startDate);
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calcula horas decorridas desde uma data
 */
export function calculateHoursSince(startDate: string | Date): number {
  const start = new Date(startDate);
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60));
}

/**
 * Calcula minutos decorridos desde uma data
 */
export function calculateMinutesSince(startDate: string | Date): number {
  const start = new Date(startDate);
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60));
}

/**
 * Formata tempo em formato legível (X dias, Y horas, Z minutos)
 */
export function formatTimeSince(startDate: string | Date): string {
  const days = calculateDaysSince(startDate);
  const hours = calculateHoursSince(startDate) % 24;
  const minutes = calculateMinutesSince(startDate) % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.length > 0 ? parts.join(' ') : '0m';
}

/**
 * Formata progresso em barra visual
 */
export function createProgressBar(current: number, goal: number, width: number = 10): string {
  const percentage = Math.min(Math.round((current / goal) * 100), 100);
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Calcula percentual de progresso até meta
 */
export function calculateProgress(current: number, goal: number): number {
  return Math.min(Math.round((current / goal) * 100), 100);
}

/**
 * Converte milestones em segundos para dias
 */
export function milestonesToDays(milestones: number[]): number[] {
  return milestones.map((ms) => Math.round(ms / 86400));
}

/**
 * Converte milestones em dias para segundos
 */
export function milestonesToSeconds(milestones: number[]): number[] {
  return milestones.map((days) => days * 86400);
}

/**
 * Próximo marco a ser atingido
 */
export function getNextMilestone(
  currentDays: number,
  milestones: number[]
): number | undefined {
  const milestoneDays = milestonesToDays(milestones);
  return milestoneDays.find((m) => m > currentDays);
}

/**
 * Marcos já atingidos
 */
export function getReachedMilestones(
  currentDays: number,
  milestones: number[]
): number[] {
  const milestoneDays = milestonesToDays(milestones);
  return milestoneDays.filter((m) => m <= currentDays);
}

/**
 * Validação de nome na comunidade
 */
export function isValidCommunityName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Nome não pode estar vazio' };
  }

  if (name.length > 20) {
    return { valid: false, error: 'Nome não pode ter mais de 20 caracteres' };
  }

  // Detectar palavrões (lista básica)
  const badWords = ['puta', 'caralho', 'merda', 'droga', 'viadagem'];
  if (badWords.some((word) => name.toLowerCase().includes(word))) {
    return { valid: false, error: 'Nome contém linguagem inapropriada' };
  }

  // Detectar dados pessoais (padrões de CPF, email, etc)
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const cpfRegex = /\d{3}\.\d{3}\.\d{3}-\d{2}/;
  const phoneRegex = /\(\d{2}\)\s?\d{4,5}-\d{4}/;

  if (emailRegex.test(name) || cpfRegex.test(name) || phoneRegex.test(name)) {
    return { valid: false, error: 'Nome não pode conter dados pessoais' };
  }

  return { valid: true };
}

/**
 * Gera mensagem customizada para marco
 */
export function generateMilestoneMessage(days: number): string {
  const messages: Record<number, string> = {
    1: '🎉 DOU 24 HORAS! 🎉\n\nParabéns! Você está no dia 1!\nVamos que deu certo, continua no compromisso?',
    3: '🎊 PARABÉNS! 3 DIAS! 🎊\n\nVocê está de parabéns! Continue assim!',
    7: '💪 AHHHH COMPLETAMOS 7 DIAS! 💪\n\nQue semana incrível! Você está inspirando!',
    10: '🔥 10 DIAS! TÁ INDO FORTE! 🔥',
    15: '✨ 15 DIAS! VOCÊ ESTÁ TRANSFORMANDO! ✨',
    20: '🚀 VINTE DIAS! VOCÊ ESTÁ MATANDO! 🚀',
    30: '🏆 UM MÊS! QUE VITÓRIA! 🏆\n\nVocê conseguiu! Um mês inteiro!',
    45: '💎 45 DIAS! VOCÊ É FORTE DEMAIS! 💎',
    60: '👑 DOIS MESES! PARABÉNS GUERREIRO(A)! 👑',
  };

  return messages[days] || `🎉 ${days} DIAS! VOCÊ É INCRÍVEL! 🎉`;
}

/**
 * Formata data para display (ex: "15 de junho")
 */
export function formatDateBR(date: string | Date): string {
  const d = new Date(date);
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  return `${d.getDate()} de ${months[d.getMonth()]}`;
}

/**
 * Calcula tempo até próximo marco
 */
export function timeUntilNextMilestone(
  currentDays: number,
  nextMilestoneDay: number
): string {
  const remaining = nextMilestoneDay - currentDays;
  if (remaining <= 0) return 'Próximo agora!';
  if (remaining === 1) return 'Amanhã!';
  return `Em ${remaining} dias`;
}

/**
 * Validação de horário no formato HH:MM
 */
export function isValidTimeFormat(time: string): boolean {
  const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
}

/**
 * Trunca texto com ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
