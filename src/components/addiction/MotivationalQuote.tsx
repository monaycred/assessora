'use client';

import { useMemo, useState } from 'react';

const quotes = {
  estoicismo: [
    'Você tem poder sobre suas escolhas de hoje.',
    'A constância transforma o que parecia impossível.',
    'Não carregue o mês inteiro. Vença este dia.',
  ],
  biblico: [
    'A cada manhã, renove sua força e continue.',
    'Um passo firme hoje também faz parte da transformação.',
    'Você não precisa caminhar sozinho.',
  ],
  motivacao: [
    'Progresso é continuar, mesmo em passos pequenos.',
    'Sua próxima escolha pode fortalecer sua jornada.',
    'Recomeçar também é avançar.',
  ],
};

type QuoteKind = keyof typeof quotes;

export default function MotivationalQuote() {
  const [kind, setKind] = useState<QuoteKind>('motivacao');
  const day = useMemo(() => Math.floor(Date.now() / 86400000), []);
  const quote = quotes[kind][day % quotes[kind].length];
  return <section className="rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-700 p-5 text-white shadow-lg sm:p-7">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Frase do dia</p>
    <blockquote className="mt-3 max-w-3xl text-xl font-bold leading-relaxed sm:text-2xl">“{quote}”</blockquote>
    <div className="mt-5 flex flex-wrap gap-2">{(['motivacao','estoicismo','biblico'] as QuoteKind[]).map((item) =>
      <button key={item} type="button" onClick={() => setKind(item)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${kind === item ? 'bg-white text-teal-800' : 'bg-white/15 text-white hover:bg-white/25'}`}>
        {item === 'biblico' ? 'Bíblica' : item === 'estoicismo' ? 'Estoicismo' : 'Motivação'}
      </button>)}</div>
  </section>;
}
