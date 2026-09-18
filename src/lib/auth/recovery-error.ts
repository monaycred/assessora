export function recoveryErrorMessage(message?: string) {
  const seconds = message?.match(/after\s+(\d+)\s+seconds?/i)?.[1];
  if (seconds) return `Aguarde ${seconds} segundos antes de pedir outro link para esta conta.`;
  if (message?.toLowerCase().includes('rate limit')) return 'Limite de envios atingido. Aguarde alguns minutos e tente novamente.';
  return 'Não foi possível enviar o link agora. Tente novamente mais tarde.';
}
