"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, XCircle } from "lucide-react";

const DISCIPLINAS_CHECKLIST = [
  { value: "ARQUITECTURA", label: "Arquitectura" },
  { value: "ESTRUCTURA", label: "Estructura" },
  { value: "SANITARIA", label: "Sanitaria" },
  { value: "ELECTRICA", label: "Eléctrica" },
  { value: "HVAC", label: "HVAC / Climatización" },
  { value: "GAS", label: "Gas" },
  { value: "INCENDIO", label: "Incendio" },
  { value: "DETALLES", label: "Detalles constructivos" },
];

export default function DocumentCompletenessPanel({ projectId }: { projectId: string }) {
  const supabase = createClient();
  const [presentDisciplines, setPresentDisciplines] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase.from("documents").select("discipline").eq("project_id", projectId);
      setPresentDisciplines(new Set((data ?? []).map((d) => d.discipline)));
      setLoading(false);
    }
    load();
  }, [projectId]);

  if (loading) return <p className="text-graphite-500 text-xs">Cargando estado documental...</p>;

  const presentCount = DISCIPLINAS_CHECKLIST.filter((d) => presentDisciplines.has(d.value)).length;

  return (
    <div className="bg-graphite-900 border border-graphite-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wide text-graphite-400 font-medium">Estado documental</h3>
        <span className="text-[11px] font-mono text-graphite-500">{presentCount} / {DISCIPLINAS_CHECKLIST.length} disciplinas</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {DISCIPLINAS_CHECKLIST.map((d) => {
          const present = presentDisciplines.has(d.value);
          return (
            <div key={d.value} className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs ${present ? "text-graphite-300" : "text-graphite-500"}`}>
              {present ? <CheckCircle2 className="w-3.5 h-3.5 text-signal-ok shrink-0" strokeWidth={1.5} /> : <XCircle className="w-3.5 h-3.5 text-graphite-600 shrink-0" strokeWidth={1.5} />}
              <span className="truncate">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
