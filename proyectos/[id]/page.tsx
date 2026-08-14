import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import KpiCard from "@/components/KpiCard";

export default async function ObraDetallePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, client_name, location, status")
    .eq("id", params.id)
    .single();

  if (!project) notFound();

  return (
    <AppShell>
      <header className="h-16 border-b border-graphite-700 flex items-center justify-between px-6">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-graphite-400">
            {project.client_name || "Sin cliente"} {project.location ? `· ${project.location}` : ""}
          </p>
          <h1 className="font-display text-base text-graphite-100">{project.name}</h1>
        </div>
        <span className="text-[11px] font-mono uppercase text-blueprint-400 border border-blueprint-500/30 bg-blueprint-500/10 px-2 py-1 rounded-sm">
          {project.status}
        </span>
      </header>

      <div className="p-6 space-y-6">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Documentos" value={0} />
          <KpiCard label="Hallazgos" value={0} />
          <KpiCard label="RFIs" value={0} />
          <KpiCard label="Confianza" value="—" />
        </section>

        <section className="bg-graphite-900 border border-dashed border-graphite-600 rounded-lg p-10 text-center">
          <p className="text-graphite-300 text-sm mb-1">
            La carga de documentación se habilita en Etapa 2.
          </p>
          <p className="text-graphite-500 text-xs">
            Por ahora esta obra ya está creada y lista dentro de tu organización.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
