import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import KpiCard from "@/components/KpiCard";
import { Plus, FolderKanban } from "lucide-react";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(name)")
    .eq("profile_id", user.id)
    .limit(1)
    .single();

  if (!membership) redirect("/onboarding");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, client_name, location, status, updated_at")
    .eq("organization_id", membership.organization_id)
    .order("updated_at", { ascending: false });

  const orgName = (membership.organizations as unknown as { name: string } | null)?.name ?? "Tu organización";

  return (
    <AppShell>
      <header className="h-16 border-b border-graphite-700 flex items-center justify-between px-6">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-graphite-400">{orgName}</p>
          <h1 className="font-display text-base text-graphite-100">Dashboard</h1>
        </div>
        <Link
          href="/proyectos/nuevo"
          className="flex items-center gap-1.5 bg-blueprint-500 hover:bg-blueprint-400 text-graphite-950 text-sm font-medium px-3.5 py-2 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Nueva obra
        </Link>
      </header>

      <div className="p-6 space-y-8">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Obras activas" value={projects?.length ?? 0} />
          <KpiCard label="Planos analizados" value={0} />
          <KpiCard label="Hallazgos críticos" value={0} />
          <KpiCard label="Confianza promedio" value="—" />
        </section>

        <section>
          <h2 className="font-display text-sm text-graphite-200 mb-3">Tus obras</h2>

          {!projects || projects.length === 0 ? (
            <div className="bg-graphite-900 border border-dashed border-graphite-600 rounded-lg p-10 text-center">
              <FolderKanban className="w-6 h-6 text-graphite-500 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-graphite-300 text-sm mb-1">Todavía no cargaste ninguna obra.</p>
              <p className="text-graphite-500 text-xs mb-4">
                Creá tu primer proyecto para empezar a organizar su documentación.
              </p>
              <Link
                href="/proyectos/nuevo"
                className="inline-flex items-center gap-1.5 bg-blueprint-500 hover:bg-blueprint-400 text-graphite-950 text-sm font-medium px-3.5 py-2 rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
                Crear primera obra
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/proyectos/${p.id}`}
                  className="bg-graphite-900 border border-graphite-700 rounded-lg p-4 flex items-center justify-between hover:border-blueprint-500/50 transition-colors"
                >
                  <div>
                    <p className="text-graphite-100 text-sm font-medium">{p.name}</p>
                    <p className="text-graphite-400 text-xs mt-0.5">
                      {p.client_name || "Sin cliente asignado"}
                      {p.location ? ` · ${p.location}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono uppercase text-blueprint-400 border border-blueprint-500/30 bg-blueprint-500/10 px-2 py-1 rounded-sm">
                    {p.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
