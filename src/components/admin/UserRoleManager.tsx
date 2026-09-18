'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function UserRoleManager({ profileId, currentAdminId, initialRole }: {
  profileId: string;
  currentAdminId: string;
  initialRole: 'member' | 'admin';
}) {
  const router = useRouter();
  const [role, setRole] = useState(initialRole);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function changeRole(nextRole: 'member' | 'admin') {
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/admin/users/${profileId}/role`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível alterar o cargo');
      setRole(nextRole);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao alterar cargo'); }
    finally { setSaving(false); }
  }

  return <div className="flex flex-col items-end gap-1">
    <label className="sr-only" htmlFor={`role-${profileId}`}>Cargo do usuário</label>
    <select id={`role-${profileId}`} value={role} disabled={saving || profileId === currentAdminId}
      onChange={(event) => changeRole(event.target.value as 'member' | 'admin')}
      className="rounded-md border border-dark-700 bg-dark-900 px-2 py-1 text-xs text-dark-100">
      <option value="member">Membro</option>
      <option value="admin">Admin</option>
    </select>
    {error && <span role="alert" className="max-w-48 text-right text-xs text-red-400">{error}</span>}
  </div>;
}
