import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatCPF } from "@/lib/utils";
import { Users, Shield, User } from "lucide-react";

export default async function UsuariosPage() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <Header title="Usuários" subtitle="Gerenciamento de usuários do sistema" />

      <div className="p-6">
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-dark-100">
              Todos os Usuários ({users?.length || 0})
            </h3>
          </div>

          {!users || users.length === 0 ? (
            <div className="py-10 text-center">
              <Users className="w-10 h-10 text-dark-700 mx-auto mb-3" />
              <p className="text-sm text-dark-500">Nenhum usuário cadastrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((u: any) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-4 bg-dark-800/40 rounded-xl border border-dark-700/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-dark-100">{u.full_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-dark-400">{formatCPF(u.cpf)}</p>
                        <span className="text-dark-600">•</span>
                        <p className="text-xs text-dark-400">{u.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={u.role === "admin" ? "primary" : "default"} dot>
                      {u.role === "admin" ? "Admin" : "Membro"}
                    </Badge>
                    <Badge variant={u.is_active ? "success" : "danger"} dot>
                      {u.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
