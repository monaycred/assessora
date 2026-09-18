import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createAdminClient } from "@/lib/supabase/server";
import ModuleAccessManager from "@/components/admin/ModuleAccessManager";
import UserRoleManager from "@/components/admin/UserRoleManager";
import UserAccessManager from "@/components/admin/UserAccessManager";
import { getAccessUser } from "@/lib/access";
import { redirect } from "next/navigation";
import { formatCPF } from "@/lib/utils";
import { Users, User } from "lucide-react";

export default async function UsuariosPage() {
  const admin = await getAccessUser();
  if (admin?.role !== "admin") redirect("/addiction");
  const supabase = createAdminClient();

  const { data: users } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  const { data: accesses } = await supabase.from("user_module_access")
    .select("user_profile_id, module_key, enabled, expires_at");
  const { data: contacts } = await supabase.from("contacts")
    .select("user_id, phone_number, status").eq("status", "aprovado");

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
                  className="flex flex-wrap items-start justify-between gap-3 p-4 bg-dark-800/40 rounded-xl border border-dark-700/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                        : <User className="w-4 h-4 text-primary-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-dark-100">{u.full_name}</p>
                      {u.nickname && <p className="text-xs text-primary-400">Apelido: {u.nickname}</p>}
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-dark-400">{formatCPF(u.cpf)}</p>
                        <span className="text-dark-600">•</span>
                        <p className="text-xs text-dark-400">{u.email}</p>
                      </div>
                      {u.role !== "admin" && <ModuleAccessManager
                        profileId={u.id}
                        initialEnabled={(accesses || [])
                          .filter((a: any) => a.user_profile_id === u.id && a.enabled && (!a.expires_at || new Date(a.expires_at) > new Date()))
                          .map((a: any) => a.module_key)}
                      />}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start justify-end gap-2">
                    <UserRoleManager profileId={u.id} currentAdminId={admin.id} initialRole={u.role} />
                    <Badge variant={u.is_active ? "success" : "danger"} dot>
                      {u.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <UserAccessManager
                      profileId={u.id} currentAdminId={admin.id} initialActive={u.is_active}
                      email={u.email || ""}
                      recoveryPhone={contacts?.find((contact: any) => contact.user_id === u.user_id)?.phone_number || null}
                      profilePhone={u.phone || null}
                    />
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
