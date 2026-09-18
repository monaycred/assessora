'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const supabase = createClient();

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setReady(true); setChecking(false);
      }
    });
    (async () => {
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError && mounted) setError('Link inválido ou expirado. Solicite outro.');
        window.history.replaceState({}, '', '/redefinir-senha');
      }
      const { data } = await supabase.auth.getSession();
      if (mounted) { setReady(!!data.session); setChecking(false); }
    })();
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (password.length < 8) { setError('A senha precisa ter ao menos 8 caracteres.'); return; }
    if (password !== confirmation) { setError('As senhas não coincidem.'); return; }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setError('Não foi possível trocar a senha. Solicite outro link.');
    else { await supabase.auth.signOut(); setDone(true); }
    setSaving(false);
  }

  return <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
    <div className="w-full max-w-sm rounded-2xl border border-dark-700/50 bg-dark-900 p-7 shadow-2xl">
      <h1 className="text-lg font-semibold text-dark-100">Criar nova senha</h1>
      {checking ? <p className="mt-4 text-sm text-dark-400">Verificando o link...</p> : done ?
        <p role="status" className="mt-4 text-sm text-primary-500">Senha alterada. Você já pode entrar com seu CPF.</p> : ready ?
        <form onSubmit={submit} className="mt-5 space-y-4">
          <Input label="Nova senha" type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} required />
          <Input label="Confirme a nova senha" type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} minLength={8} required />
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <Button type="submit" fullWidth loading={saving}>Salvar senha</Button>
        </form> : <p role="alert" className="mt-4 text-sm text-red-400">{error || 'Link inválido ou expirado. Solicite outro.'}</p>}
      <Link href={done ? '/login' : '/esqueci-senha'} className="mt-5 block text-center text-sm text-primary-500 hover:underline">
        {done ? 'Ir para o login' : 'Solicitar outro link'}
      </Link>
    </div>
  </div>;
}
