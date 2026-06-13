import Header from "@/components/layout/Header";
import StatsCard from "@/components/dashboard/StatsCard";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  DollarSign,
  Bell,
  Calendar,
  MessageSquare,
  Cpu,
  CheckCircle,
  TrendingUp,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // reminders/expenses/messages usam user_profiles.id, não auth.users.id
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", user?.id || "")
    .single();
  const profileId = userProfile?.id || user?.id || "";

  // Busca dados do dashboard
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { count: pendingApprovals },
    { count: pendingReminders },
    { data: recentExpenses },
    { data: recentMessages },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("status", "aguardando_aprovacao"),
    supabase
      .from("reminders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profileId)
      .eq("status", "pending"),
    supabase
      .from("expenses")
      .select("*")
      .eq("user_id", profileId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("messages")
      .select("*")
      .eq("user_id", profileId)
      .gte("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Total de despesas do mês
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data: monthExpenses } = await supabase
    .from("expenses")
    .select("amount")
    .eq("user_id", profileId)
    .gte("expense_date", firstDay);

  const totalMonth = (monthExpenses || []).reduce(
    (sum, e) => sum + (e.amount || 0),
    0
  );

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Visão geral da sua assessora"
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard
            title="Gastos do Mês"
            value={formatCurrency(totalMonth)}
            icon={DollarSign}
            color="primary"
          />
          <StatsCard
            title="Lembretes Pendentes"
            value={pendingReminders || 0}
            icon={Bell}
            color="orange"
          />
          <StatsCard
            title="Aprovações Pendentes"
            value={pendingApprovals || 0}
            icon={CheckCircle}
            color="blue"
          />
          <StatsCard
            title="Mensagens Hoje"
            value={recentMessages?.length || 0}
            icon={MessageSquare}
            color="purple"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Despesas Recentes */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary-500" />
                <h3 className="text-sm font-semibold text-dark-100">
                  Despesas Recentes
                </h3>
              </div>
              <a
                href="/financeiro"
                className="text-xs text-primary-500 hover:text-primary-400 transition-colors"
              >
                Ver todas
              </a>
            </div>

            {recentExpenses && recentExpenses.length > 0 ? (
              <div className="space-y-3">
                {recentExpenses.map((expense: any) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0"
                  >
                    <div>
                      <p className="text-sm text-dark-100">{expense.description}</p>
                      <p className="text-xs text-dark-400 mt-0.5">
                        {expense.payment_methods?.name || "Sem método"} •{" "}
                        {formatRelativeDate(expense.created_at)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-dark-100">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <DollarSign className="w-8 h-8 text-dark-700 mx-auto mb-2" />
                <p className="text-sm text-dark-500">Nenhuma despesa registrada</p>
                <p className="text-xs text-dark-600 mt-1">
                  Envie uma mensagem para a Iasmin no WhatsApp
                </p>
              </div>
            )}
          </Card>

          {/* Mensagens Recentes */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-dark-100">
                  Mensagens Recentes
                </h3>
              </div>
            </div>

            {recentMessages && recentMessages.length > 0 ? (
              <div className="space-y-3">
                {recentMessages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3 py-2 border-b border-dark-700 last:border-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageSquare className="w-3.5 h-3.5 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-dark-100 truncate">
                        {msg.content || "(mídia)"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-dark-400">
                          {formatRelativeDate(msg.created_at)}
                        </p>
                        {msg.action_taken && (
                          <Badge variant="primary" className="text-[10px]">
                            {msg.action_taken}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <MessageSquare className="w-8 h-8 text-dark-700 mx-auto mb-2" />
                <p className="text-sm text-dark-500">Nenhuma mensagem recebida</p>
              </div>
            )}
          </Card>
        </div>

        {/* Info Box */}
        <Card className="border-primary-500/20 bg-primary-500/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-dark-100">
                Iasmin está pronta para te ajudar
              </p>
              <p className="text-xs text-dark-400 mt-0.5">
                Mande uma mensagem no WhatsApp: &quot;Iasmin, registra mercado 150
                no débito&quot;
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
