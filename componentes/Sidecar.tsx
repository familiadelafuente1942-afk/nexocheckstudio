"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  FileStack,
  Boxes,
  ShieldAlert,
  ListChecks,
  Package,
  Calculator,
  FileCheck2,
  GitCompareArrows,
  FileQuestion,
  Bot,
  FileBarChart,
  BookMarked,
  Users,
  Settings,
  ScanLine,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, active: true },
  { label: "Planos", href: "/planos", icon: FileStack, active: false },
  { label: "Modelo BIM", href: "/bim", icon: Boxes, active: false },
  { label: "Interferencias", href: "/interferencias", icon: ShieldAlert, active: false },
  { label: "Hallazgos", href: "/hallazgos", icon: ListChecks, active: false },
  { label: "Materiales", href: "/materiales", icon: Package, active: false },
  { label: "Cómputo", href: "/computo", icon: Calculator, active: false },
  { label: "Documentación", href: "/documentacion", icon: FileCheck2, active: false },
  { label: "Comparador", href: "/comparador", icon: GitCompareArrows, active: false },
  { label: "RFIs", href: "/rfis", icon: FileQuestion, active: false },
  { label: "Asistente IA", href: "/asistente", icon: Bot, active: false },
  { label: "Informes", href: "/informes", icon: FileBarChart, active: false },
  { label: "Biblioteca Técnica", href: "/biblioteca", icon: BookMarked, active: false },
  { label: "Equipo", href: "/equipo", icon: Users, active: false },
  { label: "Configuración", href: "/configuracion", icon: Settings, active: false },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 bg-graphite-900 border-r border-graphite-700 flex flex-col">
      <div className="h-16 flex items-center gap-2 px-5 border-b border-graphite-700">
        <ScanLine className="w-4.5 h-4.5 text-blueprint-400" strokeWidth={1.5} />
        <span className="font-display text-sm tracking-tight text-graphite-100">
          NEXOCHECKSTUDIO
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isCurrent = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.active ? item.href : "#"}
              aria-disabled={!item.active}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                isCurrent
                  ? "bg-graphite-800 text-graphite-100"
                  : item.active
                  ? "text-graphite-300 hover:bg-graphite-800 hover:text-graphite-100"
                  : "text-graphite-500 cursor-default"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span className="truncate">{item.label}</span>
              {!item.active && (
                <span className="ml-auto text-[10px] font-mono text-graphite-600">
                  ETAPA {item.href === "/planos" ? "2" : item.href === "/bim" ? "5" : ""}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-graphite-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-graphite-400 hover:bg-graphite-800 hover:text-graphite-100 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
