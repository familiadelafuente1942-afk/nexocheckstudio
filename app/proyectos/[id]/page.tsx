import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import KpiCard from "@/components/KpiCard";
import DocumentsPanel from "@/components/DocumentsPanel";
import FindingsPanel from "@/components/FindingsPanel";

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

  const { count: documentCount } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);

  const { count: findingsCount } = await supabase
    .from("findings")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);

  return (
    <AppShell>
      
