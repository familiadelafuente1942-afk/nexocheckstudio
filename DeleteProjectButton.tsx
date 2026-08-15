"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2, Loader2 } from "lucide-react";

export default function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string; }) {
  const supabase = createClient();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(`¿Eliminar la obra "${projectName}" por completo? Se van a borrar todos sus documentos, hallazgos, RFIs y cómputo. Esta acción no se puede deshacer.`);
    if (!confirmed) return;
    setDeleting(true);
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) { alert("No se pudo eliminar la obra. Intentá de nuevo."); setDeleting(false); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <button onClick={handleDelete} disabled={deleting}
      className="flex items-center gap-1.5 text-graphite-500 hover:text-signal-critical disabled:opacity-50 text-xs font-medium px-2.5 py-1.5 rounded-md hover:bg-graphite-800 transition-colors" title="Eliminar obra">
      {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />}
      {deleting ? "Eliminando..." : "Eliminar obra"}
    </button>
  );
}
