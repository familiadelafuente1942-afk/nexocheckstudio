"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, ChevronDown, ChevronUp, FileText, FileQuestion, Check } from "lucide-react";

type Finding = {
  id: string; finding_type: string; severity: string; title: string; description: string;
  recommendation: string | null; confidence_score: number; status: string;
  source_documents: string | null; created_at: string;
};

const SEVERITY_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  CRITICA: { label: "Crítica", color: "text-signal-critical", bg: "bg-signal-critical/10", border: "border-signal-critical/30" },
  ALTA: { label: "Alta", color: "text-signal-high", bg: "bg-signal-high/10", border: "border-signal-high/30" },
  MEDIA: { label: "Media", color: "text-signal-medium", bg: "bg-signal-medium/10", border: "border-signal-medium/30" },
  BAJA: { label: "Baja", color: "text-graphite-400", bg: "bg-graphite-800", border: "border-graphite-600" },
};

const TYPE_LABELS: Record<string, string> = {
  INCONSISTENCIA: "Inconsistencia", INFORMACION_FALTANTE: "Información faltante",
  RIESGO_CONSTRUCTIVO: "Riesgo constructivo", OBSERVACION: "Observación",
};

export default function FindingsPanel({ projectId, organizationId }: { projectId: string; organizationId: string; }) {
  const supabase = createClient();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rfiCreatedFor, setRfiCreatedFor] = useState<Set<string>>(new Set());
  const [creatingRfiFor, setCreatingRfiFor] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase.from("findings")
        .select("id, finding_type, severity, title, description, recommendation, confidence_score, status, source_documents, created_at")
        .eq("project_id", projectId).order("created_at", { ascending: false });
      setFindings(data ?? []);

      const { data: existingRfis } = await supabase.from("rfis").select("finding_id").eq("project_id", projectId);
      setRfiCreatedFor(new Set((existingRfis ?? []).map((r) => r.finding_id).filter(Boolean)));
      setLoading(false);
    }
    load();
  }, [projectId]);

  async function handleGenerateRfi(f: Finding) {
    setCreatingRfiFor(f.id);
    const { count } = await supabase.from("rfis").select("id", { count: "exact", head: true }).eq("project_id", projectId);
    const nextNumber = (count ?? 0) + 1;
    const code = `RFI-${String(nextNumber).padStart(3, "0")}`;
    const question = `${f.description}${f.recommendation ? `\n\nRecomendación técnica: ${f.recommendation}` : ""}\n\nFavor confirmar cómo proceder antes de continuar con la ejecución.`;

    const { error } = await supabase.from("rfis").insert({
      project_id: projectId, organization_id: organizationId, finding_id: f.id, code, subject: f.title, question,
    });

    if (!error) setRfiCreatedFor((prev) => new Set(prev).add(f.id));
    setCreatingRfiFor(null);
  }

  if (loading) return <p className="text-graphite-500 text-xs">Cargando hallazgos...</p>;

  if (findings.length === 0) {
    return (
      <div className="bg-graphite-900 border border-dashed border-graphite-600 rounded-lg p-8 text-center">
        <AlertTriangle className="w-5 h-5 text-graphite-500 mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-graphite-400 text-sm">Todavía no hay hallazgos. Analizá un documento o el proyecto completo para generarlos.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {findings.map((f) => {
        const style = SEVERITY_STYLES[f.severity] ?? SEVERITY_STYLES.MEDIA;
        const isExpanded = expandedId === f.id;
        const hasRfi = rfiCreatedFor.has(f.id);
        return (
          <div key={f.id} className={`bg-graphite-900 border ${style.border} rounded-lg overflow-hidden`}>
            <button onClick={() => setExpandedId(isExpanded ? null : f.id)} className="w-full flex items-center justify-between p-3.5 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm ${style.color} ${style.bg} shrink-0`}>{style.label}</span>
                <div className="min-w-0">
                  <p className="text-graphite-100 text-sm truncate">{f.title}</p>
                  <p className="text-graphite-500 text-xs font-mono mt-0.5">
                    {TYPE_LABELS[f.finding_type] ?? f.finding_type} · Confianza {f.confidence_score}%{f.source_documents ? " · Análisis conjunto" : ""}
                  </p>
                </div>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-graphite-500 shrink-0" strokeWidth={1.5} /> : <ChevronDown className="w-4 h-4 text-graphite-500 shrink-0" strokeWidth={1.5} />}
            </button>
            {isExpanded && (
              <div className="px-3.5 pb-3.5 space-y-2 border-t border-graphite-800 pt-3">
                <p className="text-graphite-300 text-sm">{f.description}</p>
                {f.source_documents && (
                  <div className="flex items-start gap-2 bg-graphite-800/50 rounded-md p-2.5">
                    <FileText className="w-3.5 h-3.5 text-blueprint-400 mt-0.5 shrink-0" strokeWidth={1.5} />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-graphite-500 font-medium mb-1">Documentos involucrados</p>
                      <p className="text-graphite-300 text-xs">{f.source_documents}</p>
                    </div>
                  </div>
                )}
                {f.recommendation && (
                  <div className="bg-graphite-800 rounded-md p-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-graphite-500 font-medium mb-1">Recomendación</p>
                    <p className="text-graphite-300 text-xs">{f.recommendation}</p>
                  </div>
                )}
                <div className="pt-1">
                  {hasRfi ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-signal-ok"><Check className="w-3.5 h-3.5" strokeWidth={2} /> RFI generado</span>
                  ) : (
                    <button onClick={() => handleGenerateRfi(f)} disabled={creatingRfiFor === f.id} className="flex items-center gap-1.5 text-xs text-blueprint-400 hover:text-blueprint-300 disabled:opacity-50">
                      <FileQuestion className="w-3.5 h-3.5" strokeWidth={1.5} /> {creatingRfiFor === f.id ? "Generando..." : "Generar RFI"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
