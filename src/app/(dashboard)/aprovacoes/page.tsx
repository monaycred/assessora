import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeDate, formatPhone } from "@/lib/utils";
import { CheckCircle, XCircle, Clock, Phone } from "lucide-react";
import AprovacaoActions from "./AprovacaoActions";

export default async function AprovacoesPage() {
  const supabase = await createClient();

  const { data: approvals } = await supabase
    .from("approval_requests")
    .select("*")
    .order("requested_at", { ascending: false });

  const pending = approvals?.filter((a) => a.status === "pending") || [];
  const reviewed = approvals?.filter((a) => a.status !== "pending") || [];

  return (
    <div>
      <Header
        title="Aprovações Pendentes"
        subtitle="Números de WhatsApp aguardando autorização"
      />

      <div className="p-6 space-y-6">
        {/* Pendentes */}
        {pending.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-semibold text-white">
                Aguardando Aprovação ({pending.length})
              </h3>
            </div>

            <div className="space-y-3">
              {pending.map((approval: any) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl border border-dark-700/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {formatPhone(approval.phone_number)}
                      </p>
                      <p className="text-xs text-dark-400">
                        Solicitado {formatRelativeDate(approval.requested_at)}
                      </p>
                    </div>
                  </div>
                  <AprovacaoActions approvalId={approval.id} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {pending.length === 0 && (
          <Card>
            <div className="py-10 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-white">
                Nenhuma aprovação pendente
              </p>
              <p className="text-xs text-dark-500 mt-1">
                Quando um novo número enviar mensagem para a Iasmin, ele aparecerá aqui.
              </p>
            </div>
          </Card>
        )}

        {/* Histórico */}
        {reviewed.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">
              Histórico
            </h3>
            <div className="space-y-2">
              {reviewed.map((approval: any) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between py-3 border-b border-dark-800/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-dark-500" />
                    <div>
                      <p className="text-sm text-white">
                        {formatPhone(approval.phone_number)}
                      </p>
                      <p className="text-xs text-dark-500">
                        {formatRelativeDate(
                          approval.reviewed_at || approval.requested_at
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={approval.status === "approved" ? "success" : "danger"}
                    dot
                  >
                    {approval.status === "approved" ? "Aprovado" : "Rejeitado"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
