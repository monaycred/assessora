'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cleanCPF, formatCPF, validateCPF } from '@/lib/utils';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(''); setMessage('');
    if (!validateCPF(cleanCPF(cpf))) { setError('CPF inválido.'); return; }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cleanCPF(cpf) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao solicitar recuperação.');
      setMessage(result.message);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao solicitar recuperação.'); }
    finally { setLoading(false); }
  }

  return <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
    <div className="w-full max-w-sm rounded-2xl border border-dark-700/50 bg-dark-900 p-7 shadow-2xl">
      <h1 className="text-lg font-semibold text-dark-100">Recuperar senha</h1>
      <p className="mt-1 mb-6 text-sm text-dark-400">Informe seu CPF. O link para criar outra senha será enviado ao e-mail do cadastro ativo.</p>
      <form onSubmit={submit} className="space-y-4">
        <Input label="CPF" value={cpf} placeholder="000.000.000-00" onChange={event => setCpf(formatCPF(cleanCPF(event.target.value).slice(0, 11)))} required />
        {message && <p role="status" className="text-sm text-primary-500">{message}</p>}
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <Button type="submit" fullWidth loading={loading}>Enviar link</Button>
      </form>
      <p className="mt-5 text-center text-sm text-dark-400">Conta inativa ou sem acesso ao e-mail? Fale com o administrador.</p>
      <Link href="/login" className="mt-4 block text-center text-sm text-primary-500 hover:underline">Voltar ao login</Link>
    </div>
  </div>;
}
