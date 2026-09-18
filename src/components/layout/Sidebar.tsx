"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CheckCircle,
  MessageSquare,
  DollarSign,
  Bell,
  Calendar,
  FileText,
  ShoppingCart,
  Heart,
  Plane,
  Puzzle,
  Cpu,
  ScrollText,
  Settings,
  LogOut,
  Sparkles,
  Brain,
  FolderKanban,
  Target,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem =
  | { type: "divider"; label: string }
  | {
      name: string;
      href: string;
      icon: React.ComponentType<{ className?: string }>;
      adminOnly?: boolean;
      moduleKey?: string;
    };

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Usuários", href: "/usuarios", icon: Users, adminOnly: true },
  { name: "Aprovações", href: "/aprovacoes", icon: CheckCircle, adminOnly: true },
  { name: "WhatsApp", href: "/whatsapp", icon: MessageSquare, adminOnly: true },
  { type: "divider", label: "GESTÃO" },
  { name: "Controle de Vícios", href: "/addiction", icon: Target, moduleKey: "addiction" },
  { name: "Financeiro", href: "/financeiro", icon: DollarSign, moduleKey: "financeiro" },
  { name: "Lembretes", href: "/lembretes", icon: Bell, moduleKey: "lembretes" },
  { name: "Agenda", href: "/agenda", icon: Calendar, moduleKey: "agenda" },
  { name: "Projetos", href: "/projetos", icon: FolderKanban, moduleKey: "projetos" },
  { name: "Documentos", href: "/documentos", icon: FileText, moduleKey: "documentos" },
  { name: "Listas", href: "/listas", icon: ShoppingCart, moduleKey: "listas" },
  { name: "Desejos", href: "/desejos", icon: Heart, moduleKey: "desejos" },
  { name: "Viagens", href: "/viagens", icon: Plane, moduleKey: "viagens" },
  { type: "divider", label: "SISTEMA" },
  { name: "Integrações", href: "/integracoes", icon: Puzzle, moduleKey: "integracoes" },
  { name: "IA Config", href: "/ia-config", icon: Brain, adminOnly: true },
  { name: "Tokens IA", href: "/tokens", icon: Cpu, adminOnly: true },
  { name: "Logs", href: "/logs", icon: ScrollText, adminOnly: true },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id, role")
        .eq("user_id", user.id)
        .single();

      setIsAdmin(profile?.role === "admin");
      if (profile?.id) {
        const { data: access } = await supabase.from("user_module_access")
          .select("module_key, enabled, expires_at").eq("user_profile_id", profile.id);
        setEnabledModules((access || [])
          .filter((a: any) => a.enabled && (!a.expires_at || new Date(a.expires_at) > new Date()))
          .map((a: any) => a.module_key));
      }
    }
    checkRole();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Filter out admin-only items when user is not admin
  // Also remove dividers that only precede admin items
  const visibleNavigation = navigation.filter((item) => {
    if ("type" in item) return true; // keep dividers for now; we'll prune below
    if (item.adminOnly && !isAdmin) return false;
    if (item.moduleKey && item.moduleKey !== "addiction" && !isAdmin && !enabledModules.includes(item.moduleKey)) return false;
    if (item.href === "/dashboard" && !isAdmin && !enabledModules.some((key) => key !== "addiction")) return false;
    return true;
  });

  // Remove leading/consecutive/trailing dividers after filtering
  const cleanedNavigation = visibleNavigation.filter((item, index, arr) => {
    if (!("type" in item)) return true;
    const next = arr[index + 1];
    if (!next || "type" in next) return false; // divider followed by another divider or end
    return true;
  });

  return <>
    <div className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:hidden">
      <Link href="/addiction" className="flex items-center gap-2 font-bold text-slate-900"><span className="rounded-lg bg-emerald-100 p-2 text-emerald-700"><Sparkles className="h-5 w-5" /></span>Iasmin</Link>
      <button type="button" aria-label="Abrir menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-800"><Menu className="h-6 w-6" /></button>
    </div>
    {menuOpen && <button type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-slate-950/50 md:hidden" />}
    <aside className={cn("fixed left-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform md:z-40 md:w-60 md:translate-x-0 md:shadow-none", menuOpen ? "translate-x-0" : "-translate-x-full")}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-dark-100 leading-tight">Iasmin</p>
            <p className="text-[10px] text-dark-400 leading-tight">
              Sua assessora virtual
            </p>
          </div>
        </div>
        <button type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} className="rounded-lg p-2 text-slate-700 md:hidden"><X className="h-5 w-5" /></button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {cleanedNavigation.map((item, index) => {
          if ("type" in item && item.type === "divider") {
            return (
              <div key={index} className="px-2 pt-4 pb-1">
                <p className="text-[10px] font-semibold text-slate-500 tracking-widest uppercase">
                  {item.label}
                </p>
              </div>
            );
          }

          const navItem = item as {
            name: string;
            href: string;
            icon: React.ComponentType<{ className?: string }>;
          };
          const isActive = pathname === navItem.href || (navItem.href === '/addiction' && pathname.startsWith('/addiction/'));

          return (
            <Link
              key={navItem.href}
              href={navItem.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group mb-0.5",
                isActive
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "text-dark-400 hover:text-dark-200 hover:bg-dark-800/60"
              )}
            >
              <navItem.icon
                className={cn(
                  "w-4 h-4 transition-colors",
                  isActive ? "text-emerald-700" : "text-dark-500 group-hover:text-dark-200"
                )}
              />
              <span className="font-medium">{navItem.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-dark-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  </>;
}
