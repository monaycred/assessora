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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Usuários", href: "/usuarios", icon: Users },
  { name: "Aprovações", href: "/aprovacoes", icon: CheckCircle },
  { name: "WhatsApp", href: "/whatsapp", icon: MessageSquare },
  { type: "divider", label: "GESTÃO" },
  { name: "Financeiro", href: "/financeiro", icon: DollarSign },
  { name: "Lembretes", href: "/lembretes", icon: Bell },
  { name: "Agenda", href: "/agenda", icon: Calendar },
  { name: "Documentos", href: "/documentos", icon: FileText },
  { name: "Listas", href: "/listas", icon: ShoppingCart },
  { name: "Desejos", href: "/desejos", icon: Heart },
  { name: "Viagens", href: "/viagens", icon: Plane },
  { type: "divider", label: "SISTEMA" },
  { name: "Integrações", href: "/integracoes", icon: Puzzle },
  { name: "Tokens IA", href: "/tokens", icon: Cpu },
  { name: "Logs", href: "/logs", icon: ScrollText },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-dark-950 border-r border-dark-800/50 flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-dark-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Iasmin</p>
            <p className="text-[10px] text-dark-400 leading-tight">
              Sua assessora virtual
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {navigation.map((item, index) => {
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
                  : "text-dark-400 hover:text-white hover:bg-dark-800/60"
              )}
            >
              <navItem.icon
                className={cn(
                  "w-4 h-4 transition-colors",
                  isActive ? "text-primary-500" : "text-dark-500 group-hover:text-white"
                )}
              />
              <span className="font-medium">{navItem.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-dark-800/50">
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
