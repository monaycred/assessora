'use client'

import { useState, useEffect } from 'react'

interface Contact {
  id: string
  created_at: string
  phone_number: string
  name?: string
  cpf?: string
  birth_date?: string
  email?: string
  cep?: string
  address_json?: any
  instance_name?: string
  first_message?: string
  status: string
  onboarding_step: number
}

function formatCPF(cpf?: string) {
  if (!cpf) return '-'
  return `${cpf.slice(0,3)}.${cpf.slice(3,6)}.${cpf.slice(6,9)}-${cpf.slice(9,11)}`
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`
  return phone
}

function tempoAtras(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

const STEP_LABELS = ['Iniciou', 'Informou nome', 'Informou CPF', 'Informou nascimento', 'Informou email', 'Informou CEP', 'Concluído']

export default function AprovacoesPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState<string | null>(null)
  const [tab, setTab] = useState<'aguardando' | 'aprovado' | 'bloqueado' | 'onboarding'>('aguardando')

  async function carregar() {
    setLoading(true)
    const res = await fetch('/api/contacts')
    const data = await res.json()
    setContacts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function acao(id: string, action: 'approve' | 'reject') {
    setProcessando(id)
    const res = await fetch(`/api/approvals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    if (!res.ok) alert(data.error || 'Erro ao processar')
    setProcessando(null)
    await carregar()
  }

  const filtrados = contacts.filter(c => c.status === tab)

  const countPorStatus = {
    aguardando: contacts.filter(c => c.status === 'aguardando_aprovacao').length,
    aprovado: contacts.filter(c => c.status === 'aprovado').length,
    bloqueado: contacts.filter(c => c.status === 'bloqueado').length,
    onboarding: contacts.filter(c => c.status === 'onboarding').length,
  }

  const tabList = [
    { key: 'aguardando', label: 'Aguardando', count: countPorStatus.aguardando, color: 'text-amber-600' },
    { key: 'onboarding', label: 'Em cadastro', count: countPorStatus.onboarding, color: 'text-blue-600' },
    { key: 'aprovado', label: 'Aprovados', count: countPorStatus.aprovado, color: 'text-green-600' },
    { key: 'bloqueado', label: 'Bloqueados', count: countPorStatus.bloqueado, color: 'text-red-600' },
  ]

  const listaFiltrada = contacts.filter(c =>
    tab === 'aguardando' ? c.status === 'aguardando_aprovacao' : c.status === tab
  )

  return (
    <div className="h-full overflow-auto bg-white">
      <div className="border-b border-[#ebebeb] px-6 py-4">
        <h1 className="text-[18px] font-semibold text-gray-900">Aprovacoes</h1>
        <p className="text-[12px] text-gray-500 mt-1">
          Contatos que fizeram pre-cadastro via WhatsApp.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#ebebeb] px-6">
        {tabList.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-[#E8621A] text-[#E8621A]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-2 text-[11px] font-semibold ${tab === t.key ? 'text-[#E8621A]' : t.color}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-6">
        {loading ? (
          <p className="text-[13px] text-gray-400">Carregando...</p>
        ) : listaFiltrada.length === 0 ? (
          <div className="text-center text-[13px] text-gray-400 border border-dashed border-[#d1d5db] rounded-lg py-12">
            Nenhum contato nessa categoria.
          </div>
        ) : (
          <div className="grid gap-3">
            {listaFiltrada.map(contact => (
              <div key={contact.id} className="border border-[#e5e7eb] rounded-lg bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-[14px] font-semibold text-gray-900">
                        {contact.name || 'Sem nome ainda'}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f3f4f6] text-gray-500">
                        {contact.instance_name || 'instancia desconhecida'}
                      </span>
                      <span className="text-[10px] text-gray-400">{tempoAtras(contact.created_at)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <p className="text-[12px] text-gray-500">
                        <span className="text-gray-400">Tel:</span> {formatPhone(contact.phone_number)}
                      </p>
                      <p className="text-[12px] text-gray-500">
                        <span className="text-gray-400">CPF:</span> {formatCPF(contact.cpf)}
                      </p>
                      <p className="text-[12px] text-gray-500">
                        <span className="text-gray-400">Email:</span> {contact.email || '-'}
                      </p>
                      <p className="text-[12px] text-gray-500">
                        <span className="text-gray-400">Nascimento:</span> {contact.birth_date || '-'}
                      </p>
                      {contact.address_json?.localidade && (
                        <p className="text-[12px] text-gray-500 col-span-2">
                          <span className="text-gray-400">Endereco:</span>{' '}
                          {contact.address_json.logradouro}, {contact.address_json.bairro} — {contact.address_json.localidade}/{contact.address_json.uf} ({contact.cep})
                        </p>
                      )}
                      {contact.first_message && (
                        <p className="text-[12px] text-gray-400 col-span-2 italic">
                          "{contact.first_message.slice(0, 80)}{contact.first_message.length > 80 ? '...' : ''}"
                        </p>
                      )}
                    </div>

                    {/* Barra de progresso do onboarding */}
                    {contact.status === 'onboarding' && (
                      <div className="mt-3">
                        <p className="text-[11px] text-gray-400 mb-1">
                          Progresso: {STEP_LABELS[Math.min(contact.onboarding_step, STEP_LABELS.length - 1)]}
                        </p>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.round((contact.onboarding_step / 6) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botoes de acao */}
                  {contact.status === 'aguardando_aprovacao' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => acao(contact.id, 'approve')}
                        disabled={processando === contact.id}
                        className="px-4 py-2 rounded bg-[#16803A] text-white text-[12px] font-medium disabled:opacity-60 whitespace-nowrap"
                      >
                        {processando === contact.id ? 'Aguarde...' : 'Aprovar'}
                      </button>
                      <button
                        onClick={() => acao(contact.id, 'reject')}
                        disabled={processando === contact.id}
                        className="px-4 py-2 rounded border border-[#fecdca] text-[#b42318] text-[12px] font-medium disabled:opacity-60 whitespace-nowrap"
                      >
                        Recusar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
