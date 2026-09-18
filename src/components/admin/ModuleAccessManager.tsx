'use client';

import { useState } from 'react';

const MODULES = [
  ['addiction', 'Controle de Vícios · gratuito'],
  ['financeiro', 'Financeiro'], ['lembretes', 'Lembretes'], ['agenda', 'Agenda'],
  ['projetos', 'Projetos'], ['documentos', 'Documentos'], ['listas', 'Listas'],
  ['desejos', 'Desejos'], ['viagens', 'Viagens'], ['integracoes', 'Integrações'],
] as const;

export default function ModuleAccessManager({ profileId, initialEnabled }: {
  profileId: string;
  initialEnabled: string[];
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function toggle(key: string) {
    const next = !enabled.includes(key);
    setSaving(key);
    setError('');
    try {
      const response = await fetch('/api/admin/module-access', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_profile_id: profileId, module_key: key, enabled: next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar');
      setEnabled((current) => next ? [...current, key] : current.filter((item) => item !== key));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao salvar');
    } finally {
      setSaving(null);
    }
  }

  return (
    <details className="mt-3 border-t border-dark-700/50 pt-3">
      <summary className="cursor-pointer text-xs font-medium text-primary-400">Módulos liberados ({enabled.length})</summary>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
        {MODULES.map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-xs text-dark-200">
            <input type="checkbox" checked={enabled.includes(key)} disabled={saving !== null}
              onChange={() => toggle(key)} />
            {label}
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </details>
  );
}
