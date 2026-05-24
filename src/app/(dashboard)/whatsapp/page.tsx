'use client'

import { useEffect, useState } from 'react'

const CANAIS = [
  { value: 'whatsapp', label: 'WhatsApp (Evolution)' },
  { value: 'whatsapp_cloud', label: 'WhatsApp Cloud' },
  { value: 'instagram', label: 'Direct Instagram' },
  { value: 'outro', label: 'Outro canal' },
]

const PROVIDERS = [
  { value: 'evolution', label: 'Evolution API' },
  { value: 'whatsapp_cloud', label: 'WhatsApp Cloud oficial' },
  { value: 'meta_instagram', label: 'Meta Instagram' },
  { value: 'manual', label: 'Manual' },
]

const FORM_INICIAL = {
  display_name: '',
  numero: '',
  tipo_canal: 'whatsapp',
  provider: 'evolution',
  instance_name: '',
  api_url: '',
  api_key: '',
  cor: '#25D366',
}

function mascararChave(chave?: string | null) {
  if (!chave) return 'Não informada'
  if (chave.length <= 8) return '••••••••'
  return `${chave.slice(0, 4)}...${chave.slice(-4)}`
}

interface Instancia {
  id: string
  display_name: string
  instance_name: string
  numero?: string
  tipo_canal?: string
  provider?: string
  api_url?: string
  api_key?: string
  webhook_url?: string
  status_conexao?: string
  cor?: string
  ativo?: boolean
  is_active?: boolean
}

export default function WhatsAppPage() {
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [form, setForm] = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [teste, setTeste] = useState<Record<string, any>>({})
  const [testando, setTestando] = useState<string | null>(null)
  const [webhook, setWebhook] = useState<Record<string, any>>({})
  const [configurandoWebhook, setConfigurandoWebhook] = useState<string | null>(null)
  const [ativando, setAtivando] = useState<string | null>(null)

  async function carregar() {
    const res = await fetch('/api/whatsapp/instances', { cache: 'no-store' })
    const data = await res.json()
    setInstancias(Array.isArray(data) ? data : (data.instances || []))
  }

  useEffect(() => { carregar() }, [])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    const payload = {
      display_name: form.display_name || form.instance_name,
      instance_name: form.instance_name || form.display_name,
      numero: form.numero,
      tipo_canal: form.tipo_canal,
      provider: form.provider,
      api_url: form.api_url,
      api_key: form.api_key,
      cor: form.cor,
    }

    const res = await fetch('/api/whatsapp/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErro(data.error || data.erro || 'Erro ao salvar instância')
    } else {
      setForm(FORM_INICIAL)
      await carregar()
    }

    setSalvando(false)
  }

  async function testar(payload: Record<string, unknown>, chave: string) {
    setTestando(chave)
    setTeste(prev => ({ ...prev, [chave]: null }))

    const res = await fetch('/api/whatsapp/instances/testar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({ ok: false, erro: 'Erro ao testar conexão' }))

    setTeste(prev => ({ ...prev, [chave]: data }))
    if (chave === 'form' && data?.ok && data?.numero) {
      setForm(prev => ({ ...prev, numero: data.numero }))
    }
    setTestando(null)
    if (payload.id) await carregar()
  }

  async function configurarWebhook(instancia: Instancia) {
    setConfigurandoWebhook(instancia.id)
    setWebhook(prev => ({ ...prev, [instancia.id]: null }))

    const res = await fetch(`/api/whatsapp/instances/${instancia.instance_name}/webhook`, {
      method: 'POST',
    })
    const data = await res.json().catch(() => ({ ok: false, erro: 'Erro ao configurar webhook' }))

    setWebhook(prev => ({ ...prev, [instancia.id]: data }))
    setConfigurandoWebhook(null)
    await carregar()
  }

  async function ativarInstancia(instancia: Instancia) {
    setAtivando(instancia.id)

    const res = await fetch(`/api/whatsapp/instances/${instancia.instance_name}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: true, ativo: true }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErro(data.error || 'Erro ao ativar instância')
    }

    setAtivando(null)
    await carregar()
  }

  async function desativarInstancia(instancia: Instancia) {
    const confirmado = window.confirm(`Desativar a instância "${instancia.display_name || instancia.instance_name}"?`)
    if (!confirmado) return

    setAtivando(instancia.id)

    const res = await fetch(`/api/whatsapp/instances/${instancia.instance_name}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: false, is_active: false, status_conexao: 'desconectado' }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErro(data.error || 'Erro ao desativar instância')
    }

    setAtivando(null)
    await carregar()
  }

  return (
    <div className="h-full overflow-auto bg-white">
      <div className="border-b border-[#ebebeb] px-6 py-4">
        <h1 className="text-[18px] font-semibold text-gray-900">Instâncias WhatsApp</h1>
        <p className="text-[12px] text-gray-500 mt-1">
          Cadastre cada número/canal de atendimento. A instância ativa é usada pela Iasmin para enviar mensagens.
        </p>
      </div>

      <div className="grid grid-cols-[360px_1fr] gap-6 p-6">
        {/* Formulário de cadastro */}
        <form onSubmit={salvar} className="border border-[#e5e7eb] rounded-lg p-4 bg-[#fafafa] h-fit">
          <h2 className="text-[14px] font-semibold text-gray-900 mb-4">Nova instância</h2>

          <label className="block text-[11px] text-gray-500 mb-1">Nome no sistema</label>
          <input
            value={form.display_name}
            onChange={e => setForm({ ...form, display_name: e.target.value })}
            placeholder="Ex: IASMIN Principal"
            className="w-full text-[12px] px-3 py-2 rounded border border-[#dcdcdc] mb-3 bg-white"
          />

          <label className="block text-[11px] text-gray-500 mb-1">Canal</label>
          <select
            value={form.tipo_canal}
            onChange={e => setForm({ ...form, tipo_canal: e.target.value })}
            className="w-full text-[12px] px-3 py-2 rounded border border-[#dcdcdc] mb-3 bg-white"
          >
            {CANAIS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          <label className="block text-[11px] text-gray-500 mb-1">Provider</label>
          <select
            value={form.provider}
            onChange={e => setForm({ ...form, provider: e.target.value })}
            className="w-full text-[12px] px-3 py-2 rounded border border-[#dcdcdc] mb-3 bg-white"
          >
            {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          <label className="block text-[11px] text-gray-500 mb-1">Instance name (Evolution)</label>
          <input
            value={form.instance_name}
            onChange={e => setForm({ ...form, instance_name: e.target.value })}
            placeholder="Ex: IASMIN"
            className="w-full text-[12px] px-3 py-2 rounded border border-[#dcdcdc] mb-3 bg-white"
          />

          <label className="block text-[11px] text-gray-500 mb-1">Número</label>
          <input
            value={form.numero}
            onChange={e => setForm({ ...form, numero: e.target.value })}
            placeholder="5512999999999"
            className="w-full text-[12px] px-3 py-2 rounded border border-[#dcdcdc] mb-3 bg-white"
          />

          <label className="block text-[11px] text-gray-500 mb-1">URL da API</label>
          <input
            value={form.api_url}
            onChange={e => setForm({ ...form, api_url: e.target.value })}
            placeholder="https://sua-evolution.com"
            className="w-full text-[12px] px-3 py-2 rounded border border-[#dcdcdc] mb-3 bg-white"
          />

          <label className="block text-[11px] text-gray-500 mb-1">API Key</label>
          <input
            value={form.api_key}
            onChange={e => setForm({ ...form, api_key: e.target.value })}
            placeholder="Chave da Evolution"
            className="w-full text-[12px] px-3 py-2 rounded border border-[#dcdcdc] mb-4 bg-white"
          />

          {erro && <p className="text-[11px] text-red-600 mb-3">{erro}</p>}

          {teste.form && (
            <div className={`text-[11px] rounded border px-2 py-2 mb-3 ${
              teste.form.ok
                ? 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]'
                : 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]'
            }`}>
              {teste.form.ok
                ? `Conexão ${teste.form.status || 'online'} — ${teste.form.instance_name}`
                : teste.form.erro || teste.form.error || 'Não foi possível conectar'}
            </div>
          )}

          <button
            type="button"
            onClick={() => testar({
              provider: form.provider,
              api_url: form.api_url,
              api_key: form.api_key,
              instance_name: form.instance_name || form.display_name,
            }, 'form')}
            disabled={testando === 'form'}
            className="w-full rounded border border-[#d0d5dd] bg-white text-gray-700 text-[12px] font-medium py-2 mb-2 disabled:opacity-60"
          >
            {testando === 'form' ? 'Testando...' : 'Testar conexão'}
          </button>

          <button
            type="submit"
            disabled={salvando}
            className="w-full rounded bg-[#25D366] text-white text-[12px] font-medium py-2 disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : 'Criar instância'}
          </button>
        </form>

        {/* Lista de instâncias */}
        <div className="min-w-0">
          <div className="grid gap-3">
            {instancias.map(instancia => {
              const isAtiva = instancia.is_active === true || instancia.ativo === true
              const statusCor = isAtiva ? 'bg-[#ECFDF3] text-[#027A48]' : 'bg-[#f3f4f6] text-gray-500'

              return (
                <div key={instancia.id} className="border border-[#e5e7eb] rounded-lg bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: instancia.cor || '#25D366' }} />
                        <h3 className="text-[14px] font-semibold text-gray-900 truncate">
                          {instancia.display_name || instancia.instance_name}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f3f4f6] text-gray-600 flex-shrink-0">
                          {instancia.tipo_canal || 'whatsapp'}
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-500 mt-1">
                        Instance: {instancia.instance_name}
                      </p>
                      <p className="text-[12px] text-gray-500">
                        Número: {instancia.numero || 'Não informado'}
                      </p>
                      <p className="text-[12px] text-gray-500">
                        API: {instancia.api_url || 'Usando configuração global'}
                      </p>
                      <p className="text-[12px] text-gray-500">
                        Key: {mascararChave(instancia.api_key)}
                      </p>
                      <p className="text-[12px] text-gray-500">
                        Webhook: {instancia.webhook_url || 'Não configurado'}
                      </p>
                    </div>
                    <span className={`text-[11px] px-2 py-1 rounded flex-shrink-0 ${statusCor}`}>
                      {instancia.ativo === false || instancia.is_active === false
                        ? 'inativa'
                        : instancia.status_conexao || 'desconectado'}
                    </span>
                  </div>

                  {teste[instancia.id] && (
                    <div className={`text-[11px] rounded border px-2 py-2 mt-3 ${
                      teste[instancia.id].ok
                        ? 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]'
                        : 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]'
                    }`}>
                      {teste[instancia.id].ok
                        ? `Teste OK: ${teste[instancia.id].status || 'online'}`
                        : teste[instancia.id].erro || teste[instancia.id].error || 'Falha no teste'}
                    </div>
                  )}

                  {webhook[instancia.id] && (
                    <div className={`text-[11px] rounded border px-2 py-2 mt-3 ${
                      webhook[instancia.id].ok
                        ? 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]'
                        : 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]'
                    }`}>
                      {webhook[instancia.id].ok
                        ? `Webhook configurado: ${webhook[instancia.id].webhook_url}`
                        : webhook[instancia.id].erro || webhook[instancia.id].error || 'Falha ao configurar webhook'}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => testar({ id: instancia.id }, instancia.id)}
                      disabled={testando === instancia.id}
                      className="rounded border border-[#d0d5dd] bg-white px-3 py-1.5 text-[11px] text-gray-700 disabled:opacity-60"
                    >
                      {testando === instancia.id ? 'Testando...' : 'Testar conexão'}
                    </button>

                    <button
                      type="button"
                      onClick={() => configurarWebhook(instancia)}
                      disabled={configurandoWebhook === instancia.id || (instancia.ativo === false && instancia.is_active === false)}
                      className="rounded border border-[#d0d5dd] bg-white px-3 py-1.5 text-[11px] text-gray-700 disabled:opacity-60"
                    >
                      {configurandoWebhook === instancia.id ? 'Configurando...' : 'Configurar webhook'}
                    </button>

                    {isAtiva ? (
                      <button
                        type="button"
                        onClick={() => desativarInstancia(instancia)}
                        disabled={ativando === instancia.id}
                        className="rounded border border-[#fecdca] bg-white px-3 py-1.5 text-[11px] text-[#b42318] disabled:opacity-60"
                      >
                        {ativando === instancia.id ? 'Aguarde...' : 'Desativar'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => ativarInstancia(instancia)}
                        disabled={ativando === instancia.id}
                        className="rounded border border-[#ABEFC6] bg-white px-3 py-1.5 text-[11px] text-[#027A48] disabled:opacity-60"
                      >
                        {ativando === instancia.id ? 'Aguarde...' : 'Ativar como principal'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {instancias.length === 0 && (
              <div className="text-center text-[12px] text-gray-400 border border-dashed border-[#d1d5db] rounded-lg py-12">
                Nenhuma instância cadastrada ainda.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
