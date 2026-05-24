"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import {
  Smartphone,
  Plus,
  Trash2,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  QrCode,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Star,
  Phone,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WhatsAppInstance {
  id: string;
  instance_name: string;
  display_name: string | null;
  phone_number: string | null;
  status: "connected" | "disconnected" | "connecting" | "qr_code" | "banned" | "unknown";
  is_active: boolean;
  connected_at: string | null;
  disconnected_at: string | null;
  ban_reason: string | null;
  created_at: string;
  evolution_state?: string;
  profile_name?: string;
  profile_pic?: string;
  evolution_phone?: string;
}

interface RecentMessage {
  id: string;
  whatsapp_number: string;
  content: string;
  processed: boolean;
  action_taken: string | null;
  created_at: string;
}

function statusConfig(status: string, evoState?: string) {
  const state = evoState || status;
  switch (state) {
    case "open":
    case "connected":
      return { label: "Conectado", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30", dot: "bg-green-400", icon: Wifi };
    case "connecting":
      return { label: "Conectando...", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", dot: "bg-yellow-400", icon: Loader2 };
    case "qr_code":
      return { label: "Aguardando QR", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", dot: "bg-blue-400", icon: QrCode };
    case "banned":
      return { label: "Banido", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", dot: "bg-red-400", icon: AlertTriangle };
    case "close":
    case "disconnected":
      return { label: "Desconectado", color: "text-dark-400", bg: "bg-dark-800/40 border-dark-700/30", dot: "bg-dark-500", icon: WifiOff };
    default:
      return { label: "Desconhecido", color: "text-dark-500", bg: "bg-dark-800/30 border-dark-700/20", dot: "bg-dark-600", icon: WifiOff };
  }
}

function formatPhone(num: string | null): string {
  if (!num) return "—";
  const d = num.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,8)}-${d.slice(8)}`;
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  return `+${d}`;
}

function QRCodeDisplay({ instanceName, onConnected }: { instanceName: string; onConnected: () => void }) {
  const [qr, setQr] = useState<{ base64?: string; code?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(60);
  const fetchRef = useRef<() => void>(() => {});

  const fetchQR = useCallback(async () => {
    try {
      const res = await fetch(`/api/whatsapp/instances/${instanceName}/qr`);
      const data = await res.json();
      if (data.base64 || data.code) { setQr(data); setCountdown(60); }
    } catch { /* silencioso */ } finally { setLoading(false); }
  }, [instanceName]);

  fetchRef.current = fetchQR;

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/whatsapp/instances/${instanceName}/status`);
      const data = await res.json();
      if (data.state === "open") onConnected();
    } catch {/* silencioso */}
  }, [instanceName, onConnected]);

  useEffect(() => {
    fetchQR();
    const qrInterval = setInterval(() => fetchRef.current(), 60000);
    const statusInterval = setInterval(checkStatus, 5000);
    const cdInterval = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 60), 1000);
    return () => { clearInterval(qrInterval); clearInterval(statusInterval); clearInterval(cdInterval); };
  }, [fetchQR, checkStatus]);

  if (loading) return (
    <div className="flex flex-col items-center py-8">
      <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" />
      <p className="text-sm text-dark-400">Gerando QR Code...</p>
    </div>
  );

  if (!qr?.base64 && !qr?.code) return (
    <div className="flex flex-col items-center py-8">
      <QrCode className="w-10 h-10 text-dark-600 mb-3" />
      <p className="text-sm text-dark-400">QR Code não disponível</p>
      <button onClick={fetchQR} className="mt-3 text-xs text-primary-500 hover:text-primary-400 flex items-center gap-1">
        <RefreshCw className="w-3 h-3" /> Tentar novamente
      </button>
    </div>
  );

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm text-dark-300 mb-4 text-center">
        Abra o WhatsApp → <strong>Dispositivos vinculados</strong> → <strong>Vincular dispositivo</strong>
      </p>
      {qr.base64 && (
        <div className="bg-white p-3 rounded-xl mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.base64.startsWith("data:") ? qr.base64 : `data:image/png;base64,${qr.base64}`} alt="QR Code" className="w-52 h-52" />
        </div>
      )}
      {!qr.base64 && qr.code && (
        <div className="bg-dark-800 rounded-xl p-4 mb-3 font-mono text-xs text-primary-400 break-all max-w-xs text-center">{qr.code}</div>
      )}
      <div className="flex items-center gap-2 text-xs text-dark-500">
        <Clock className="w-3 h-3" />
        <span>Expira em {countdown}s</span>
        <button onClick={fetchQR} className="text-primary-500"><RefreshCw className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

export default function WhatsAppPage() {
  const supabase = createClient();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [messages, setMessages] = useState<RecentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<WhatsAppInstance | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banning, setBanning] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const instRes = await fetch("/api/whatsapp/instances");
      const instData = await instRes.json();
      setInstances(instData.instances || []);
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, whatsapp_number, content, processed, action_taken, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      setMessages(msgs || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  }, [supabase]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRefresh = () => { setRefreshing(true); loadData(); };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/whatsapp/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar");
      setNewInstanceName(data.instance.instance_name);
      setCreateModalOpen(false);
      setShowQR(true);
      await loadData();
    } catch (err: any) { alert(err.message); }
    finally { setCreating(false); setDisplayName(""); }
  };

  const handleActivate = async (name: string) => {
    await fetch(`/api/whatsapp/instances/${name}/activate`, { method: "POST" });
    loadData();
  };

  const handleDisconnect = async (name: string) => {
    if (!confirm("Desconectar esta instância?")) return;
    await fetch(`/api/whatsapp/instances/${name}/disconnect`, { method: "POST" });
    loadData();
  };

  const handleBan = async () => {
    if (!banTarget) return;
    setBanning(true);
    try {
      await supabase.from("whatsapp_instances").update({
        status: "banned", is_active: false,
        ban_reason: banReason || "Banido pelo usuário",
        disconnected_at: new Date().toISOString(),
      }).eq("instance_name", banTarget.instance_name);
      setBanModalOpen(false); setBanTarget(null); setBanReason("");
      loadData();
    } finally { setBanning(false); }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Deletar instância "${name}" permanentemente?`)) return;
    await fetch(`/api/whatsapp/instances/${name}`, { method: "DELETE" });
    loadData();
  };

  const handleShowQR = (inst: WhatsAppInstance) => { setNewInstanceName(inst.instance_name); setShowQR(true); };

  const activeInstance = instances.find(i => i.is_active);

  return (
    <div>
      <Header title="WhatsApp" subtitle="Gerencie as instâncias e conexões do WhatsApp" />
      <div className="p-6 space-y-5">

        {/* Instância Ativa */}
        <Card className={activeInstance ? statusConfig(activeInstance.status, activeInstance.evolution_state).bg : "border-dark-700/30"}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary-500" />
              <h3 className="text-sm font-semibold text-white">Instância Ativa</h3>
            </div>
            <button onClick={handleRefresh} disabled={refreshing} className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          {loading ? (
            <div className="py-6 flex items-center justify-center"><Loader2 className="w-5 h-5 text-primary-500 animate-spin" /></div>
          ) : activeInstance ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${statusConfig(activeInstance.status, activeInstance.evolution_state).bg}`}>
                {activeInstance.profile_pic
                  ? <img src={activeInstance.profile_pic} alt="foto" className="w-full h-full rounded-2xl object-cover" />
                  : <Smartphone className={`w-6 h-6 ${statusConfig(activeInstance.status, activeInstance.evolution_state).color}`} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white">{activeInstance.display_name || activeInstance.instance_name}</span>
                  <div className={`w-2 h-2 rounded-full ${statusConfig(activeInstance.status, activeInstance.evolution_state).dot}`} />
                  <span className={`text-xs ${statusConfig(activeInstance.status, activeInstance.evolution_state).color}`}>
                    {statusConfig(activeInstance.status, activeInstance.evolution_state).label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <p className="text-xs text-dark-400 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {formatPhone(activeInstance.evolution_phone || activeInstance.phone_number)}
                  </p>
                  <p className="text-xs text-dark-500">ID: <span className="font-mono">{activeInstance.instance_name}</span></p>
                  {activeInstance.connected_at && (
                    <p className="text-xs text-dark-500">
                      Desde: {formatDistanceToNow(new Date(activeInstance.connected_at), { locale: ptBR, addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(activeInstance.evolution_state !== "open" && activeInstance.status !== "connected") && (
                  <Button size="sm" variant="outline" onClick={() => handleShowQR(activeInstance)}>
                    <QrCode className="w-3.5 h-3.5" /> Conectar
                  </Button>
                )}
                {(activeInstance.evolution_state === "open" || activeInstance.status === "connected") && (
                  <Button size="sm" variant="outline" onClick={() => handleDisconnect(activeInstance.instance_name)}>
                    <WifiOff className="w-3.5 h-3.5" /> Desconectar
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => { setBanTarget(activeInstance); setBanModalOpen(true); }}>
                  <AlertTriangle className="w-3.5 h-3.5" /> Número Banido
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <WifiOff className="w-10 h-10 text-dark-700 mx-auto mb-3" />
              <p className="text-sm text-dark-400">Nenhuma instância ativa</p>
              <p className="text-xs text-dark-600 mt-1">Crie ou ative uma instância abaixo</p>
            </div>
          )}
        </Card>

        {/* QR Code inline */}
        {showQR && newInstanceName && (
          <Card className="border-primary-500/30 bg-primary-500/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-primary-500" />
                <h3 className="text-sm font-semibold text-white">Escaneie o QR Code</h3>
                <span className="text-xs text-dark-400 font-mono">({newInstanceName})</span>
              </div>
              <button onClick={() => { setShowQR(false); setNewInstanceName(null); }} className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <QRCodeDisplay instanceName={newInstanceName} onConnected={() => { setShowQR(false); setNewInstanceName(null); loadData(); }} />
          </Card>
        )}

        {/* Histórico de Instâncias */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-dark-400" />
              <h3 className="text-sm font-semibold text-white">Histórico de Instâncias</h3>
              <span className="text-xs text-dark-600 bg-dark-800 px-2 py-0.5 rounded-full">{instances.length}</span>
            </div>
            <Button size="sm" onClick={() => setCreateModalOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Nova Instância
            </Button>
          </div>
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 text-primary-500 animate-spin" /></div>
          ) : instances.length === 0 ? (
            <div className="py-10 text-center">
              <Smartphone className="w-10 h-10 text-dark-700 mx-auto mb-3" />
              <p className="text-sm text-dark-400">Nenhuma instância criada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-700/50">
                    <th className="text-left text-xs text-dark-500 font-medium py-2 pr-4">Instância</th>
                    <th className="text-left text-xs text-dark-500 font-medium py-2 pr-4">Número</th>
                    <th className="text-left text-xs text-dark-500 font-medium py-2 pr-4">Status</th>
                    <th className="text-left text-xs text-dark-500 font-medium py-2 pr-4">Criada</th>
                    <th className="text-right text-xs text-dark-500 font-medium py-2">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800/50">
                  {instances.map(inst => {
                    const cfg = statusConfig(inst.status, inst.evolution_state);
                    return (
                      <tr key={inst.id} className={inst.is_active ? "bg-primary-500/5" : ""}>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            {inst.is_active && <Star className="w-3 h-3 text-primary-500 flex-shrink-0" />}
                            <div>
                              <p className="text-white font-medium text-xs">{inst.display_name || inst.instance_name}</p>
                              <p className="text-dark-500 text-xs font-mono">{inst.instance_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4"><span className="text-dark-300 text-xs">{formatPhone(inst.evolution_phone || inst.phone_number)}</span></td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                          </div>
                          {inst.ban_reason && <p className="text-xs text-red-400/70 mt-0.5">{inst.ban_reason}</p>}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-dark-500 text-xs">
                            {formatDistanceToNow(new Date(inst.created_at), { locale: ptBR, addSuffix: true })}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-1">
                            {!inst.is_active && inst.status !== "banned" && (
                              <button onClick={() => handleShowQR(inst)} className="p-1.5 rounded-lg text-dark-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="QR Code">
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!inst.is_active && inst.status !== "banned" && (
                              <button onClick={() => handleActivate(inst.instance_name)} className="p-1.5 rounded-lg text-dark-400 hover:text-green-400 hover:bg-green-500/10 transition-colors" title="Ativar">
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {inst.is_active && (
                              <button onClick={() => handleDisconnect(inst.instance_name)} className="p-1.5 rounded-lg text-dark-400 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors" title="Desconectar">
                                <WifiOff className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {inst.status !== "banned" && (
                              <button onClick={() => { setBanTarget(inst); setBanModalOpen(true); }} className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Banido">
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!inst.is_active && (
                              <button onClick={() => handleDelete(inst.instance_name)} className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Deletar">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Mensagens Recentes */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-dark-400" />
            <h3 className="text-sm font-semibold text-white">Mensagens Recentes</h3>
          </div>
          {messages.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare className="w-8 h-8 text-dark-700 mx-auto mb-2" />
              <p className="text-sm text-dark-500">Nenhuma mensagem recebida ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map(msg => (
                <div key={msg.id} className="flex items-start gap-3 p-3 rounded-xl bg-dark-800/40 border border-dark-700/30">
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${msg.processed ? "bg-green-500/10" : "bg-yellow-500/10"}`}>
                    {msg.processed ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Clock className="w-3 h-3 text-yellow-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-white">{formatPhone(msg.whatsapp_number)}</span>
                      {msg.action_taken && msg.action_taken !== "unknown" && (
                        <span className="text-xs px-1.5 py-0.5 bg-primary-500/10 text-primary-400 rounded-md border border-primary-500/20">{msg.action_taken}</span>
                      )}
                    </div>
                    <p className="text-xs text-dark-400 truncate">{msg.content || "(sem conteúdo)"}</p>
                  </div>
                  <span className="text-xs text-dark-600 flex-shrink-0">
                    {formatDistanceToNow(new Date(msg.created_at), { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Modal: Nova Instância */}
      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Nova Instância WhatsApp">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300">
            Uma nova instância será criada no Evolution API. Você precisará escanear um QR Code para vincular o número.
          </div>
          <div>
            <label className="text-xs text-dark-400 mb-1.5 block">Nome da instância (opcional)</label>
            <input
              type="text"
              placeholder="Ex: Número Backup, Chip 2..."
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-dark-800 border border-dark-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-dark-600 focus:outline-none focus:border-primary-500/50"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setCreateModalOpen(false)}>Cancelar</Button>
            <Button fullWidth loading={creating} onClick={handleCreate}>
              <Plus className="w-4 h-4" /> Criar e Conectar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Marcar Banido */}
      <Modal open={banModalOpen} onClose={() => { setBanModalOpen(false); setBanTarget(null); setBanReason(""); }} title="Marcar como Banido">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <p className="text-sm font-medium text-red-300">{banTarget?.display_name || banTarget?.instance_name}</p>
            </div>
            <p className="text-xs text-red-400/70">Esta instância será marcada como banida e desativada. Você poderá criar uma nova com outro número.</p>
          </div>
          <div>
            <label className="text-xs text-dark-400 mb-1.5 block">Motivo (opcional)</label>
            <input
              type="text"
              placeholder="Ex: Banido por spam, Número temporário..."
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
              className="w-full bg-dark-800 border border-dark-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-dark-600 focus:outline-none focus:border-red-500/50"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => { setBanModalOpen(false); setBanTarget(null); setBanReason(""); }}>Cancelar</Button>
            <Button variant="danger" fullWidth loading={banning} onClick={handleBan}>
              <AlertTriangle className="w-4 h-4" /> Confirmar Banimento
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
