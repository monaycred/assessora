export function dateInSaoPaulo(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = (part: string) => parts.find((item) => item.type === part)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export type CheckinStatus = 'success' | 'lapse' | 'support';

export function checkinReply(status: CheckinStatus, trackerName: string): string {
  if (status === 'success') return `✅ Registrado: você conseguiu ficar sem ${trackerName} hoje. Um dia de cada vez!`;
  if (status === 'lapse') return `💚 Registrado. Seu contador de ${trackerName} foi reiniciado. Você pode recomeçar agora.`;
  return `💚 Pedido de apoio registrado para ${trackerName}. Abra seu grupo na Iasmin se quiser conversar; seu diário permanece privado.`;
}
