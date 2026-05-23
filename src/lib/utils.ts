import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formata CPF: 00000000000 -> 000.000.000-00
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, "");
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// Remove formatação do CPF
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

// Valida CPF
export function validateCPF(cpf: string): boolean {
  const cleaned = cleanCPF(cpf);
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) return false;

  return true;
}

// Formata telefone: 5511999999999 -> +55 (11) 99999-9999
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 13) {
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

// Formata valor monetário
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Formata data
export function formatDate(date: string | Date, pattern = "dd/MM/yyyy"): string {
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, pattern, { locale: ptBR });
  } catch {
    return "";
  }
}

// Formata data relativa (ex: "há 2 horas")
export function formatRelativeDate(date: string | Date): string {
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return formatDistanceToNow(d, { locale: ptBR, addSuffix: true });
  } catch {
    return "";
  }
}

// Trunca texto
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

// Gera slug a partir de texto
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Extrai número limpo para WhatsApp (sem @s.whatsapp.net)
export function cleanWhatsAppNumber(jid: string): string {
  return jid.replace(/@.*/, "").replace(/\D/g, "");
}

// Formata número WhatsApp para exibição
export function formatWhatsAppNumber(number: string): string {
  const cleaned = cleanWhatsAppNumber(number);
  return formatPhone(cleaned);
}

// Estima custo de tokens OpenAI
export function estimateTokenCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  // Preços Anthropic Claude (por token)
  const pricing: Record<string, { input: number; output: number }> = {
    // Claude Haiku 4.5 — mais rápido e barato (classificações)
    "claude-haiku-4-5-20251001": { input: 0.0008 / 1000, output: 0.004 / 1000 },
    // Claude Sonnet 4.6 — mais capaz (visão, análises)
    "claude-sonnet-4-6": { input: 0.003 / 1000, output: 0.015 / 1000 },
    // Claude Opus 4.6 — mais poderoso
    "claude-opus-4-6": { input: 0.015 / 1000, output: 0.075 / 1000 },
  };

  const modelPricing =
    pricing[model] || pricing["claude-haiku-4-5-20251001"];
  return (
    promptTokens * modelPricing.input +
    completionTokens * modelPricing.output
  );
}

// Gera ID único simples
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// Capitaliza primeira letra
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Verifica se string é número
export function isNumeric(value: string): boolean {
  return !isNaN(Number(value.replace(",", ".")));
}

// Converte string de valor para número (aceita "230" ou "230,50" ou "R$ 230")
export function parseAmount(value: string): number {
  const cleaned = value
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return parseFloat(cleaned) || 0;
}
