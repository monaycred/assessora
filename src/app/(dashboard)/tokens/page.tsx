import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";
import { Cpu, AlertCircle, TrendingUp, Zap } from "lucide-react";

export default async function TokensPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Busca uso do mês atual
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: usageLogs } = await supabase
    .from("ai_usage_logs")
    .select("*")
    .gte("created_at", firstDay)
    .order("created_at", { ascending: false });

  const { data: allLogs } = await supabase
    .from("ai_usage_logs")
    .select("*")
    .eq("user_id", user?.id || "")
    .order("created_at", { ascending: false })
    .limit(20);

  const totalTokens = (usageLogs || []).reduce(
    (sum, l) => sum + (l.total_tokens || 0),
    0
  );
  const totalCost = (usageLogs || []).reduce(
    (sum, l) => sum + (l.estimated_cost || 0),
    0
  );
  const totalMessages = (usageLogs || []).length;

  const MONTHLY_LIMIT = 100000; // tokens
  const usagePercent = Math.min((totalTokens / MONTHLY_LIMIT) * 100, 100);

  return (
    <div>
      <Header title="Uso de Tokens IA" subtitle="Controle de consumo da OpenAI" />

      <div className="p-6 space-y-5">
        {/* Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <p className="text-xs text-dark-400 mb-1">Total de Tokens</p>
            <p className="text-2xl font-bold text-dark-100">
              {totalTokens.toLocaleString("pt-BR")}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-dark-400 mb-1">Custo Estimado</p>
            <p className="text-2xl font-bold text-dark-100">
              {formatCurrency(totalCost)}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-dark-400 mb-1">Mensagens</p>
            <p className="text-2xl font-bold text-dark-100">{totalMessages}</p>
          </Card>
          <Card>
            <p className="text-xs text-dark-400 mb-1">Limite Mensal</p>
            <p className="text-2xl font-bold text-dark-100">
              {MONTHLY_LIMIT.toLocaleString("pt-BR")}
            </p>
          </Card>
        </div>

        {/* Progresso */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-500" />
              <h3 className="text-sm font-semibold text-dark-100">Uso do Mês</h3>
            </div>
            <Badge
              variant={
                usagePercent >= 90
                  ? "danger"
                  : usagePercent >= 70
                  ? "warning"
                  : "success"
              }
            >
              {usagePercent.toFixed(1)}%
            </Badge>
          </div>
          <div className="w-full bg-dark-800 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                usagePercent >= 90
                  ? "bg-red-500"
                  : usagePercent >= 70
                  ? "bg-yellow-500"
                  : "bg-primary-500"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <p className="text-xs text-dark-500">
              {totalTokens.toLocaleString("pt-BR")} usados
            </p>
            <p className="text-xs text-dark-500">
              {(MONTHLY_LIMIT - totalTokens).toLocaleString("pt-BR")} restantes
            </p>
          </div>
          {usagePercent >= 80 && (
            <div className="flex items-center gap-2 mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <p className="text-xs text-yellow-400">
                Você está próximo do limite mensal de tokens.
              </p>
            </div>
          )}
        </Card>

        {/* Logs */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-dark-100">Histórico de Uso</h3>
          </div>

          {!allLogs || allLogs.length === 0 ? (
            <div className="py-8 text-center">
              <Cpu className="w-10 h-10 text-dark-700 mx-auto mb-3" />
              <p className="text-sm text-dark-500">Nenhum uso registrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-dark-500 border-b border-dark-800">
                    <th className="text-left pb-3">Data</th>
                    <th className="text-left pb-3">Ação</th>
                    <th className="text-left pb-3">Modelo</th>
                    <th className="text-right pb-3">Tokens</th>
                    <th className="text-right pb-3">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {allLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-dark-700 last:border-0"
                    >
                      <td className="py-3 text-dark-400 text-xs">
                        {formatRelativeDate(log.created_at)}
                      </td>
                      <td className="py-3">
                        <Badge variant="primary" className="text-[10px]">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 text-dark-300 text-xs">{log.model}</td>
                      <td className="py-3 text-right text-dark-100">
                        {(log.total_tokens || 0).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 text-right text-dark-300">
                        ${(log.estimated_cost || 0).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
