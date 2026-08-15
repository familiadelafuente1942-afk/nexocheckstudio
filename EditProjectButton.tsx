"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Pencil, X, Save, Loader2 } from "lucide-react";

const STATUS_OPTIONS = ["ACTIVO", "PAUSADO", "FINALIZADO", "CANCELADO"];

type ProjectData = { id: string; name: string; client_name: string | null; location: string | null; status: string; };

export default function EditProjectButton({ project }: { project: ProjectData }) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [clientName, setClientName] = useState(project.client_name ?? "");
  const [location, setLocation] = useState(project.location ?? "");
  const [status, setStatus] = useState(project.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setName(project.name); setClientName(project.client_name ?? ""); setLocation(project.location ?? "");
    setStatus(project.status); setError(null); setOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) { setError("El nombre de la obra no puede estar vacío."); return; }
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.from("projects").update({
      name: name.trim(), client_name: clientName.trim() || null, location: location.trim() || null, status,
    }).eq("id", project.id);
    if (updateError) { setError("No se pudieron guardar los cambios. Intentá de nuevo."); setSaving(false); return; }
    setSaving(false); setOpen(false); router.refresh();
  }

  return (
    <>
      <button onClick={openModal} className="flex items-center gap-1.5 text-graphite-500 hover:text-blueprint-400 text-xs font-medium px-2.5 py-1.5 rounded-md hover:bg-graphite-800 transition-colors" title="Editar obra">
        <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} /> Editar
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-graphite-950/80 flex items-center justify-center px-6">
          <div className="w-full max-w-md bg-graphite-900 border border-graphite-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-base text-graphite-100">Editar obra</h3>
              <button onClick={() => setOpen(false)} className="text-graphite-500 hover:text-graphite-200 p-1"><X className="w-4 h-4" strokeWidth={1.5} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-graphite-300 mb-1.5">Nombre de la obra</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-graphite-800 border border-graphite-600 rounded-md px-3 py-2 text-sm text-graphite-100 outline-none focus:border-blueprint-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-graphite-300 mb-1.5">Cliente</label>
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-graphite-800 border border-graphite-600 rounded-md px-3 py-2 text-sm text-graphite-100 outline-none focus:border-blueprint-500" placeholder="Sin cliente asignado" />
              </div>
              <div>
                <label className="block text-xs font-medium text-graphite-300 mb-1.5">Ubicación</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-graphite-800 border border-graphite-600 rounded-md px-3 py-2 text-sm text-graphite-100 outline-none focus:border-blueprint-500" placeholder="Ej: Zona Sur, Buenos Aires" />
              </div>
              <div>
                <label className="block text-xs font-medium text-graphite-300 mb-1.5">Estado</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-graphite-800 border border-graphite-600 rounded-md px-3 py-2 text-sm text-graphite-100 outline-none focus:border-blueprint-500">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {error && <p className="text-signal-critical text-xs font-mono">{error}</p>}
              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 bg-blueprint-500 hover:bg-blueprint-400 disabled:opacity-50 text-graphite-950 font-medium text-sm rounded-md px-4 py-2 transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={2} />}
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
                <button onClick={() => setOpen(false)} className="text-graphite-400 hover:text-graphite-200 text-sm px-4 py-2 transition-colors">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
