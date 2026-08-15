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

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const projectMatch = pathname.match(/^\/proyectos\/([^/]+)$/);
  const projectId = projectMatch ? projectMatch[1] : null;

  const NAV_ITEMS = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, active: true },
    { label: "Planos", href: "/planos", icon: FileStack, active: false, etapa: "2" },
    { label: "Modelo BIM", href: "/bim", icon: Boxes, active: false, etapa: "5" },
    { label: "Interferencias", href: "/interferencias", icon: ShieldAlert, active: false },
    {
      label: "Hallazgos",
      href: projectId ? `/proyectos/${projectId}#hallazgos` : "/hallazgos",
      icon: ListChecks,
      active: !!projectId,
    },
    {
      label: "Materiales",
      href: projectId ? `/proyectos/${projectId}#computo` : "/materiales",
      icon: Package,
      active: !!projectId,
    },
    {
      label: "Cómputo",
      href: projectId ? `/proyectos/${projectId}#computo` : "/computo",
      icon: Calculator,
      active: !!projectId,
    },
    {
      label: "Documentación",
      href: projectId ? `/proyectos/${projectId}#documentos` : "/documentacion",
      icon: FileCheck2,
      active: !!projectId,
    },
    { label: "Comparador", href: "/comparador", icon: GitCompareArrows, active: false },
    {
      label: "RFIs",
      href: projectId ? `/proyectos/${projectId}#rfis` : "/rfis",
      icon: FileQuestion,
      active: !!projectId,
    },
    { label: "Asistente IA", href: "/asistente", icon: Bot, active: false },
    { label: "Informes", href: "/informes", icon: FileBarChart, active: false },
    { label: "Biblioteca Técnica", href: "/biblioteca", icon: BookMarked, active: false },
    { label: "Equipo", href: "/equipo", icon: Users, active: false },
    { label: "Configuración", href: "/configuracion", icon: Settings, active: false },
  ];

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
              key={item.label}
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
              {!item.active && item.etapa && (
                <span className="ml-auto text-[10px] font-mono text-graphite-600">
                  ETAPA {item.etapa}
                </span>
              )}
              {!item.active && !item.etapa && !projectId && (
                <span className="ml-auto text-[9px] font-mono text-graphite-600">
                  entrá a una obra
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
