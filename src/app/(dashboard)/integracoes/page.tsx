import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { Calendar, HardDrive, Mail, FileText, BarChart3, ExternalLink, CheckCircle, XCircle } from "lucide-react";

const GOOGLE_SERVICES = [
  {
    key: "calendar",
    name: "Google Agenda",
    description: "Criar e gerenciar eventos diretamente na sua agenda",
    icon: Calendar,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    key: "drive",
    name: "Google Drive",
    description: "Salvar imagens, documentos e arquivos na nuvem",
    icon: HardDrive,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
  },
  {
    key: "gmail",
    name: "Gmail",
    description: "Ler anexos autorizados e comprovantes por e-mail",
    icon: Mail,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
  {
    key: "docs",
    name: "Google Docs",
    description: "Criar e salvar documentos de texto no Drive",
    icon: FileText,
    color: "text-blue-300",
    bg: "bg-blue-400/10 border-blue-400/20",
  },
  {
    key: "sheets",
    name: "Google Sheets",
    description: "Exportar despesas, listas e dados para planilhas",
    icon: BarChart3,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
  },
];

export default async function IntegracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: connections } = await supabase
    .from("google_connections")
    .select("service, is_active")
    .eq("user_id", user?.id || "");

  const connected = new Set(
    (connections || []).filter((c: any) => c.is_active).map((c: any) => c.service)
  );

  return (
    <div>
      <Header
        title="Integrações Google"
        subtitle="Conecte sua conta Google para expandir as funcionalidades da Iasmin"
      />

      <div className="p-6 space-y-5">
        <Card className="border-primary-500/20 bg-primary-500/5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
              <ExternalLink className="w-4 h-4 text-primary-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Integrações Google (em breve)
              </p>
              <p className="text-xs text-dark-400 mt-1">
                Cada integração requer autorização individual. Seus dados ficam
                seguros — a Iasmin só acessa o que você permitir.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GOOGLE_SERVICES.map((service) => {
            const Icon = service.icon;
            const isConnected = connected.has(service.key);

            return (
              <Card key={service.key}>
                <div className="flex items-start gap-4">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border ${service.bg}`}
                  >
                    <Icon className={`w-5 h-5 ${service.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-white">
                        {service.name}
                      </p>
                      {isConnected ? (
                        <Badge variant="success" dot>Conectado</Badge>
                      ) : (
                        <Badge variant="default" dot>Desconectado</Badge>
                      )}
                    </div>
                    <p className="text-xs text-dark-400 mb-3">
                      {service.description}
                    </p>
                    <Button
                      variant={isConnected ? "danger" : "outline"}
                      size="sm"
                      disabled
                      className="opacity-50 cursor-not-allowed"
                    >
                      {isConnected ? "Desconectar" : "Conectar"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-dark-600 text-center">
          As integrações Google serão habilitadas em breve. Configure as credenciais OAuth no painel do Google Console.
        </p>
      </div>
    </div>
  );
}
