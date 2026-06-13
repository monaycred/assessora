"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatRelativeDate } from "@/lib/utils";
import { Bell, Check, Clock, Trash2, AlertCircle } from "lucide-react";

export default function LembretesPage() {
  const supabase = createClient();
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // reminders.user_id referencia user_profiles.id, não auth.users.id
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    const profileId = profile?.id || user.id;

    const { data } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", profileId)
      .order("remind_at", { ascending: true });

    setReminders(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDismiss = async (id: string) => {
    await supabase.from("reminders").update({ status: "dismissed" }).eq("id", id);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("reminders").delete().eq("id", id);
    load();
  };

  const pending = reminders.filter((r) => r.status === "pending");
  const past = reminders.filter((r) => r.status !== "pending");
  const overdue = pending.filter((r) => new Date(r.remind_at) < new Date());
  const upcoming = pending.filter((r) => new Date(r.remind_at) >= new Date());

  return (
    <div>
      <Header title="Lembretes" subtitle="Seus lembretes criados pela Iasmin" />

      <div className="p-6 space-y-5">
        {/* Atrasados */}
        {overdue.length > 0 && (
          <Card className="border-red-500/20">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-dark-100">
                Atrasados ({overdue.length})
              </h3>
            </div>
            <div className="space-y-2">
              {overdue.map((r) => (
                <ReminderItem
                  key={r.id}
                  reminder={r}
                  overdue
                  onDismiss={handleDismiss}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </Card>
        )}

        {/* Próximos */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-dark-100">
              Próximos ({upcoming.length})
            </h3>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="w-10 h-10 text-dark-700 mx-auto mb-3" />
              <p className="text-sm text-dark-500">Nenhum lembrete pendente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((r) => (
                <ReminderItem
                  key={r.id}
                  reminder={r}
                  onDismiss={handleDismiss}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Histórico */}
        {past.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-dark-400 mb-4">Histórico</h3>
            <div className="space-y-2">
              {past.slice(0, 10).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0 opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-dark-500" />
                    <div>
                      <p className="text-sm text-dark-300 line-through">{r.title}</p>
                      <p className="text-xs text-dark-500">{formatDate(r.remind_at)}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(r.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-dark-600 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ReminderItem({
  reminder,
  overdue,
  onDismiss,
  onDelete,
}: {
  reminder: any;
  overdue?: boolean;
  onDismiss: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border ${
        overdue
          ? "bg-red-500/5 border-red-500/20"
          : "bg-dark-800/40 border-dark-700/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center ${
            overdue
              ? "bg-red-500/10 border border-red-500/20"
              : "bg-primary-500/10 border border-primary-500/20"
          }`}
        >
          <Clock className={`w-4 h-4 ${overdue ? "text-red-400" : "text-primary-500"}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-dark-100">{reminder.title}</p>
          <p className={`text-xs ${overdue ? "text-red-400" : "text-dark-400"}`}>
            {formatDate(reminder.remind_at, "dd/MM/yyyy 'às' HH:mm")} •{" "}
            {formatRelativeDate(reminder.remind_at)}
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onDismiss(reminder.id)}
          className="p-2 rounded-lg text-dark-400 hover:text-green-400 hover:bg-green-500/10 transition-colors"
          title="Marcar como feito"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(reminder.id)}
          className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
