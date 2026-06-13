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
    };

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Usuários", href: "/usuarios", icon: Users, adminOnly: true },
  { name: "Aprovações", href: "/aprovacoes", icon: CheckCircle, adminOnly: true },
  { name: "WhatsApp", href: "/whatsapp", icon: MessageSquare, adminOnly: true },
  { type: "divider", label: "GESTÃO" },
  { name: "Financeiro", href: "/financeiro", icon: DollarSign },
  { name: "Lembretes", href: "/lembretes", icon: Bell },
  { name: "Agenda", href: "/agenda", icon: Calendar },
  { name: "Projetos", href: "/projetos", icon: FolderKanban },
  { name: "Documentos", href: "/documentos", icon: FileText },
  { name: "Listas", href: "/listas", icon: ShoppingCart },
  { name: "Desejos", href: "/desejos", icon: Heart },
  { name: "Viagens", href: "/viagens", icon: Plane },
  { type: "divider", label: "SISTEMA" },
  { name: "Integrações", href: "/integracoes", icon: Puzzle },
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

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setIsAdmin(profile?.role === "admin");
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
    return true;
  });

  // Remove leading/consecutive/trailing dividers after filtering
  const cleanedNavigation = visibleNavigation.filter((item, index, arr) => {
    if (!("type" in item)) return true;
    const next = arr[index + 1];
    if (!next || "type" in next) return false; // divider followed by another divider or end
    return true;
  });

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-dark-950 border-r border-dark-700 flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-dark-100 leading-tight">Iasmin</p>
            <p className="text-[10px] text-dark-400 leading-tight">
              Sua assessora virtual
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {cleanedNavigation.map((item, index) => {
          if ("type" in item && item.type === "divider") {
            return (
              <div key={index} className="px-2 pt-4 pb-1">
                <p className="text-[9px] font-semibold text-dark-600 tracking-widest uppercase">
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
          const isActive = pathname === navItem.href;

          return (
            <Link
              key={navItem.href}
              href={navItem.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group mb-0.5",
                isActive
                  ? "bg-primary-500/10 text-primary-500 border border-primary-500/20"
                  : "text-dark-400 hover:text-dark-200 hover:bg-dark-800/60"
              )}
            >
              <navItem.icon
                className={cn(
                  "w-4 h-4 transition-colors",
                  isActive ? "text-primary-500" : "text-dark-500 group-hover:text-dark-200"
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
  );
}
