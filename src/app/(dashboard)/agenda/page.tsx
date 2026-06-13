import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { Calendar, Clock, MapPin } from "lucide-react";

export default async function AgendaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const now = new Date().toISOString();
  const { data: events } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", user?.id || "")
    .gte("start_at", now)
    .order("start_at", { ascending: true })
    .limit(30);

  return (
    <div>
      <Header title="Agenda" subtitle="Seus próximos compromissos" />

      <div className="p-6">
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-dark-100">Próximos Eventos</h3>
          </div>

          {!events || events.length === 0 ? (
            <div className="py-10 text-center">
              <Calendar className="w-10 h-10 text-dark-700 mx-auto mb-3" />
              <p className="text-sm text-dark-500">Nenhum evento agendado</p>
              <p className="text-xs text-dark-600 mt-1">
                Diga: "Iasmin, agenda consulta médica dia 25 às 14h"
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event: any) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 p-4 bg-dark-800/40 rounded-xl border border-dark-700/30"
                >
                  <div className="flex flex-col items-center bg-primary-500/10 border border-primary-500/20 rounded-lg p-2 min-w-[50px]">
                    <p className="text-xs text-primary-500 font-semibold">
                      {formatDate(event.start_at, "dd")}
                    </p>
                    <p className="text-[10px] text-primary-400 uppercase">
                      {formatDate(event.start_at, "MMM")}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-dark-100">{event.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-xs text-dark-400">
                        <Clock className="w-3 h-3" />
                        {formatDate(event.start_at, "HH:mm")}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1 text-xs text-dark-400">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </div>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-xs text-dark-500 mt-1">{event.description}</p>
                    )}
                  </div>
                  {event.event_type && (
                    <Badge variant="info">{event.event_type}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
