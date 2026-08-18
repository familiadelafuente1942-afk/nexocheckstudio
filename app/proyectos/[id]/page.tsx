import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import KpiCard from "@/components/KpiCard";
import DocumentsPanel from "@/components/DocumentsPanel";
import FindingsPanel from "@/components/FindingsPanel";
import RfisPanel from "@/components/RfisPanel";
import ReportButton from "@/components/ReportButton";
import QuantitiesPanel from "@/components/QuantitiesPanel";
import DeleteProjectButton from "@/components/DeleteProjectButton";
import EditProjectButton from "@/components/EditProjectButton";
import DocumentCompletenessPanel from "@/components/DocumentCompletenessPanel";
import RendersPanel from "@/components/RendersPanel";

export default async function ObraDetallePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, client_name, location, status, organization_id")
    .eq("id", params.id)
    .single();

  if (!project) notFound();

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", project.organization_id)
    .single();

  const { count: documentCount } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);

  const { count: findingsCount } = await supabase
    .from("findings")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);

  const { count: rfisCount } = await supabase
    .from("rfis")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);

  return (
    <AppShell>
      <header className="h-16 border-b border-graphite-700 flex items-center justify-between px-6">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-graphite-400">
            {project.client_name || "Sin cliente"} {project.location ? `· ${project.location}` : ""}
          </p>
          <h1 className="font-display text-base text-graphite-100">{project.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <ReportButton
            projectId={project.id}
            project={{
              name: project.name,
              clientName: project.client_name,
              location: project.location,
              orgName: org?.name ?? "NEXOCHECKSTUDIO",
            }}
          />
          <EditProjectButton project={project} />
          <DeleteProjectButton projectId={project.id} projectName={project.name} />
          <span className="text-[11px] font-mono uppercase text-blueprint-400 border border-blueprint-500/30 bg-blueprint-500/10 px-2 py-1 rounded-sm">
            {project.status}
          </span>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Documentos" value={documentCount ?? 0} />
          <KpiCard label="Hallazgos" value={findingsCount ?? 0} />
          <KpiCard label="RFIs" value={rfisCount ?? 0} />
          <KpiCard label="Confianza" value="—" />
        </section>

        <div id="documentos" className="space-y-4">
          <DocumentCompletenessPanel projectId={project.id} />
          <DocumentsPanel projectId={project.id} organizationId={project.organization_id} />
        </div>

        <section id="renders" className="space-y-3">
          <RendersPanel projectId={project.id} organizationId={project.organization_id} />
        </section>

        <section id="hallazgos" className="space-y-3">
          <h2 className="font-display text-sm text-graphite-200">Hallazgos</h2>
          <FindingsPanel projectId={project.id} organizationId={project.organization_id} />
        </section>

        <section id="rfis" className="space-y-3">
          <h2 className="font-display text-sm text-graphite-200">RFIs</h2>
          <RfisPanel projectId={project.id} />
        </section>

        <section id="computo" className="space-y-3">
          <h2 className="font-display text-sm text-graphite-200">Cómputo de materiales</h2>
          <QuantitiesPanel projectId={project.id} />
        </section>
      </div>
    </AppShell>
  );
}
