'use client'

import { useState, useEffect, useCallback } from 'react'

interface LogEntry {
  id: string
  created_at: string
  instance_name?: string
  from_number?: string
  event_type?: string
  message_content?: string
  step_before?: number
  step_after?: number
  result?: string
  error?: string
}

const EVENT_COLORS: Record<string, string> = {
  new_contact: 'bg-blue-100 text-blue-700',
  onboarding: 'bg-purple-100 text-purple-700',
  onboarding_complete: 'bg-indigo-100 text-indigo-700',
  ai_response: 'bg-green-100 text-green-700',
  ai_error: 'bg-red-100 text-red-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  silenced_awaiting_approval: 'bg-gray-100 text-gray-500',
  fatal_error: 'bg-red-200 text-red-800',
  message: 'bg-gray-100 text-gray-600',
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [filter, setFilter] = useState('')

  const carregar = useCallback(async () => {
    const res = await fetch('/api/logs')
    const data = await res.json()
    setLogs(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(carregar, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh, carregar])

  const logsFiltrados = filter
    ? logs.filter(l =>
        l.from_number?.includes(filter) ||
        l.event_type?.includes(filter) ||
        l.message_content?.toLowerCase().includes(filter.toLowerCase()) ||
        l.result?.toLowerCase().includes(filter.toLowerCase())
      )
    : logs

  return (
    <div className="h-full overflow-auto bg-white">
      <div className="border-b border-[#ebebeb] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-gray-900">Logs do Webhook</h1>
          <p className="text-[12px] text-gray-500 mt-1">Debug em tempo real do fluxo de mensagens.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filtrar por numero, evento..."
            className="text-[12px] px-3 py-1.5 rounded border border-[#dcdcdc] w-52"
          />
          <label className="flex items-center gap-2 text-[12px] text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh (5s)
          </label>
          <button
            onClick={carregar}
            className="px-3 py-1.5 rounded border border-[#d0d5dd] bg-white text-[12px] text-gray-700"
          >
            Atualizar
          </button>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <p className="text-[13px] text-gray-400">Carregando logs...</p>
        ) : logsFiltrados.length === 0 ? (
          <div className="text-center text-[13px] text-gray-400 border border-dashed border-[#d1d5db] rounded-lg py-12">
            Nenhum log encontrado.
          </div>
        ) : (
          <div className="space-y-2">
            {logsFiltrados.map(log => (
              <div key={log.id} className="border border-[#e5e7eb] rounded-lg p-3 bg-white font-mono text-[11px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-400">{formatTime(log.created_at)}</span>
                  {log.instance_name && (
                    <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">{log.instance_name}</span>
                  )}
                  {log.from_number && (
                    <span className="text-gray-600">{log.from_number}</span>
                  )}
                  {log.event_type && (
                    <span className={`px-1.5 py-0.5 rounded ${EVENT_COLORS[log.event_type] || 'bg-gray-100 text-gray-600'}`}>
                      {log.event_type}
                    </span>
                  )}
                  {log.step_before !== undefined && log.step_after !== undefined && (
                    <span className="text-gray-400">step {log.step_before} → {log.step_after}</span>
                  )}
                </div>
                {log.message_content && (
                  <p className="mt-1 text-gray-500 truncate">msg: "{log.message_content.slice(0, 120)}"</p>
                )}
                {log.result && (
                  <p className="mt-0.5 text-green-700">ok: {log.result}</p>
                )}
                {log.error && (
                  <p className="mt-0.5 text-red-600">erro: {log.error}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
