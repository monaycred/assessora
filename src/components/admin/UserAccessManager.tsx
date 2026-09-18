'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatPhone } from '@/lib/utils';

export default function UserAccessManager({ profileId, currentAdminId, initialActive, email, recoveryPhone, profilePhone }: {
  profileId: string;
  currentAdminId: string;
  initialActive: boolean;
  email: string;
  recoveryPhone: string | null;
  profilePhone: string | null;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function perform(action: 'activate' | 'deactivate' | 'send_recovery' | 'send_recovery_whatsapp') {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/admin/users/${profileId}/access`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar o acesso');
      if (action === 'send_recovery' || action === 'send_recovery_whatsapp') setMessage(result.message);
      else { setActive(result.is_active); router.refresh(); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao atualizar acesso'); }
    finally { setBusy(false); }
  }

  return <div className="flex flex-col items-end gap-1">
    <div className="max-w-64 text-right text-xs text-dark-400">
      <p>E-mail do acesso: <span className="text-dark-200">{email || 'Não cadastrado'}</span></p>
      <p>WhatsApp que recebe o link: <span className="text-dark-200">{recoveryPhone ? formatPhone(recoveryPhone) : 'Não vinculado'}</span></p>
      {profilePhone && recoveryPhone && profilePhone.replace(/\D/g, '') !== recoveryPhone.replace(/\D/g, '') &&
        <p className="text-amber-500">O telefone do perfil é {formatPhone(profilePhone)}. Confira qual número está correto.</p>}
    </div>
    <div className="flex flex-wrap justify-end gap-1">
      <button type="button" disabled={busy || (active && profileId === currentAdminId)}
        onClick={() => perform(active ? 'deactivate' : 'activate')}
        className="rounded-md border border-dark-700 px-2 py-1 text-xs text-dark-200 hover:border-primary-500 disabled:opacity-50">
        {active ? 'Desativar' : 'Ativar conta'}
      </button>
      {active && <button type="button" disabled={busy || !email} onClick={() => perform('send_recovery')}
        className="rounded-md border border-primary-500/40 px-2 py-1 text-xs text-primary-500 hover:bg-primary-500/10 disabled:opacity-50">
        Recuperar por e-mail
      </button>}
      {active && <button type="button" disabled={busy || !recoveryPhone} onClick={() => perform('send_recovery_whatsapp')}
        className="rounded-md border border-primary-500/40 px-2 py-1 text-xs text-primary-500 hover:bg-primary-500/10 disabled:opacity-50">
        Recuperar por WhatsApp
      </button>}
    </div>
    {message && <span role="status" className="max-w-56 text-right text-xs text-primary-500">{message}</span>}
    {error && <span role="alert" className="max-w-56 text-right text-xs text-red-400">{error}</span>}
  </div>;
}
