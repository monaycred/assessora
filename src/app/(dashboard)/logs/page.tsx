import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { ScrollText, Shield, User, Settings } from "lucide-react";

const ACTION_ICONS: Record<string, typeof User> = {
  login: User,
  logout: User,
  create: Settings,
  update: Settings,
  delete: Settings,
  approve: Shield,
  reject: Shield,
};

const ACTION_VARIANTS: Record<string, "success" | "danger" | "info" | "warning" | "primary"> = {
  login: "success",
  logout: "default" as any,
  create: "primary",
  update: "info",
  delete: "danger",
  approve: "success",
  reject: "danger",
};

export default async function LogsPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <Header title="Logs de Auditoria" subtitle="Registro de todas as ações do sistema" />

      <div className="p-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <ScrollText className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-white">
              Auditoria ({logs?.length || 0} registros)
            </h3>
          </div>

          {!logs || logs.length === 0 ? (
            <div className="py-10 text-center">
              <ScrollText className="w-10 h-10 text-dark-700 mx-auto mb-3" />
              <p className="text-sm text-dark-500">Nenhum log registrado</p>
            </div>
          ) : (
            <div className="space-y-0">
              {logs.map((log) => {
                const actionKey = log.action?.split("_")[0] || "create";
                const Icon = ACTION_ICONS[actionKey] || Settings;
                const variant = ACTION_VARIANTS[actionKey] || "default";

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 py-3 border-b border-dark-800/50 last:border-0"
                  >
                    <div className="w-7 h-7 rounded-lg bg-dark-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-dark-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={variant} className="text-[10px]">
                          {log.action}
                        </Badge>
                        {log.entity_type && (
                          <span className="text-xs text-dark-400">
                            em <span className="text-dark-300">{log.entity_type}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-dark-500">
                          {formatDate(log.created_at, "dd/MM/yyyy HH:mm:ss")}
                        </p>
                        {log.ip_address && (
                          <p className="text-xs text-dark-600">
                            IP: {log.ip_address}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
