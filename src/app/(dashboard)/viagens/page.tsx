import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { Plane, MapPin, Calendar } from "lucide-react";

const STATUS_VARIANTS: Record<string, "info" | "primary" | "success" | "default"> = {
  planned: "info",
  in_progress: "primary",
  completed: "success",
  cancelled: "default",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "Planejada",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export default async function ViagensPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", user?.id || "")
    .order("created_at", { ascending: false });

  return (
    <div>
      <Header title="Viagens" subtitle="Suas viagens registradas pela Iasmin" />

      <div className="p-6">
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Plane className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-white">
              Minhas Viagens ({trips?.length || 0})
            </h3>
          </div>

          {!trips || trips.length === 0 ? (
            <div className="py-10 text-center">
              <Plane className="w-10 h-10 text-dark-700 mx-auto mb-3" />
              <p className="text-sm text-dark-500">Nenhuma viagem registrada</p>
              <p className="text-xs text-dark-600 mt-1">
                Diga: "Iasmin, registra viagem para Ubatuba"
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trips.map((trip: any) => (
                <div
                  key={trip.id}
                  className="p-4 bg-dark-800/40 rounded-xl border border-dark-700/30"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{trip.title}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-dark-400" />
                        <p className="text-xs text-dark-400">{trip.destination}</p>
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANTS[trip.status] || "default"} dot>
                      {STATUS_LABELS[trip.status] || trip.status}
                    </Badge>
                  </div>
                  {(trip.start_date || trip.end_date) && (
                    <div className="flex items-center gap-1 text-xs text-dark-500">
                      <Calendar className="w-3 h-3" />
                      {trip.start_date && formatDate(trip.start_date)}
                      {trip.end_date && ` → ${formatDate(trip.end_date)}`}
                    </div>
                  )}
                  {trip.notes && (
                    <p className="text-xs text-dark-500 mt-2">{trip.notes}</p>
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
