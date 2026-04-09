"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  TrendingUp,
  LayoutDashboard,
  Users,
  CheckSquare,
  BarChart3,
  LogOut,
  ChevronRight,
  Bell,
  RefreshCw,
} from "lucide-react";
import { PerfilUsuario } from "@prisma/client";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const NAV_VENDEDOR: NavItem[] = [
  { label: "Meu Dia",       href: "/dashboard/vendedor",       icon: LayoutDashboard },
  { label: "Minha Carteira",href: "/dashboard/leads",          icon: Users           },
  { label: "Follow-ups",    href: "/dashboard/follow-ups",     icon: CheckSquare     },
  { label: "Reativação",    href: "/dashboard/reativacao",     icon: RefreshCw       },
  { label: "Notificações",  href: "/dashboard/notificacoes",   icon: Bell            },
];

const NAV_GERENTE: NavItem[] = [
  { label: "Painel",        href: "/dashboard/gerente",        icon: LayoutDashboard },
  { label: "Leads",         href: "/dashboard/leads",          icon: Users           },
  { label: "Equipe",        href: "/dashboard/equipe",         icon: Users           },
  { label: "Relatórios",    href: "/dashboard/relatorios",     icon: BarChart3       },
  { label: "Notificações",  href: "/dashboard/notificacoes",   icon: Bell            },
];

interface SidebarProps {
  user: {
    name?:      string | null;
    email?:     string | null;
    perfil:     PerfilUsuario;
    unidadeId:  string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname  = usePathname();
  const isGerente = ["GERENTE", "ADMIN", "GESTOR"].includes(user.perfil);
  const navItems  = isGerente ? NAV_GERENTE : NAV_VENDEDOR;

  const perfilLabel: Record<PerfilUsuario, string> = {
    VENDEDOR: "Vendedor",
    SDR:      "SDR",
    GERENTE:  "Gerente",
    ADMIN:    "Admin",
    GESTOR:   "Gestor",
  };

  const initials = (user.name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-900 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div className="leading-tight">
            <span className="text-white font-bold text-sm">FlowLead</span>
            <span className="text-blue-400 font-semibold text-sm"> CRM</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-white" : "text-slate-500 group-hover:text-white")} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          {/* Avatar */}
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user.name}</p>
            <p className="text-slate-500 text-xs truncate">{perfilLabel[user.perfil]}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sair"
            className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
