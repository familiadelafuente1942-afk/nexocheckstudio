"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, Loader2, Image as ImageIcon, Trash2, X, ExternalLink } from "lucide-react";

type DocumentRow = {
  id: string;
  name: string;
  discipline: string;
  mime_type: string | null;
};

type RenderRow = {
  id: string;
  source_type: string;
  prompt: string;
  style: string | null;
  file_path: string;
  status: string;
  created_at: string;
};

const SOURCE_TYPES = [
  { value: "texto", label: "Solo descripción de texto" },
  { value: "plano", label: "A partir de un plano" },
  { value: "foto", label: "A partir de una foto de obra" },
  { value: "combinado", label: "Plano/foto + descripción de estilo" },
];

export default function RendersPanel({ projectId, organizationId }: { projectId: string; organizationId: string; }) {
  const supabase = createClient();

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [renders, setRenders] = useState<RenderRow[]>([]);
  const [renderUrls, setRenderUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourceType, setSourceType] = useState("texto");
  const [sourceDocumentId, setSourceDocumentId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");

  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);

    const { data: docs } = await supabase
      .from("documents")
      .select("id, name, discipline, mime_type")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setDocuments(docs ?? []);

    const { data: rendersData } = await supabase
      .from("renders")
      .select("id, source_type, prompt, style, file_path, status, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setRenders(rendersData ?? []);

    if (rendersData) {
      const urls: Record<string, string> = {};
      for (const r of rendersData) {
        const { data } = supabase.storage.from("renders").getPublicUrl(r.file_path);
        urls[r.id] = data.publicUrl;
      }
      setRenderUrls(urls);
    }

    setLoading(false);
  }

  useEffect(() => { loadData(); }, [projectId]);

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError("Escribí una descripción de lo que querés generar.");
      return;
    }
    if ((sourceType === "plano" || sourceType === "foto" || sourceType === "combinado") && !sourceDocumentId) {
      setError("Elegí un documento de referencia para este tipo de render.");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/generar-render", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          projectId,
          organizationId,
          sourceType,
          sourceDocumentId: sourceDocumentId || undefined,
          prompt,
          style: style || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const base = data.error || "No se pudo generar el render.";
        setError(data.detail ? `${base}: ${data.detail}` : base);
        setGenerating(false);
        return;
      }

      setPrompt("");
      setStyle("");
      setSourceDocumentId("");
      setGenerating(false);
      loadData();
    } catch {
      setError("Error de conexión al generar el render.");
      setGenerating(false);
    }
  }

  async function handleDelete(render: RenderRow) {
    const confirmed = window.confirm("¿Eliminar este render? Esta acción no se puede deshacer.");
    if (!confirmed) return;
    await supabase.storage.from("renders").remove([render.file_path]);
    await supabase.from("renders").delete().eq("id", render.id);
    loadData();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-sm text-graphite-200">Renders fotorrealistas</h2>
      </div>

      <div className="bg-graphite-900 border border-graphite-700 rounded-lg p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-graphite-400 mb-1 block">Origen del render</label>
            <select
              value={sourceType}
              onChange={(e) => { setSourceType(e.target.value); setSourceDocumentId(""); }}
              className="w-full bg-graphite-800 border border-graphite-600 rounded-md px-2.5 py-1.5 text-xs text-graphite-200 outline-none focus:border-blueprint-500"
            >
              {SOURCE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {sourceType !== "texto" && (
            <div>
              <label className="text-xs text-graphite-400 mb-1 block">Documento de referencia</label>
              <select
                value={sourceDocumentId}
                onChange={(e) => setSourceDocumentId(e.target.value)}
                className="w-full bg-graphite-800 border border-graphite-600 rounded-md px-2.5 py-1.5 text-xs text-graphite-200 outline-none focus:border-blueprint-500"
              >
                <option value="">Elegir documento...</option>
                {documents.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-graphite-400 mb-1 block">Descripción del render</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Ej: "Fachada frontal terminada, revoque gris claro, aberturas de aluminio negro, jardín con césped y palmeras"'
            rows={3}
            className="w-full bg-graphite-800 border border-graphite-600 rounded-md px-2.5 py-2 text-xs text-graphite-200 outline-none focus:border-blueprint-500 resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-graphite-400 mb-1 block">Estilo (opcional)</label>
          <input
            type="text"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder='Ej: "atardecer, luz cálida, fotografía profesional"'
            className="w-full bg-graphite-800 border border-graphite-600 rounded-md px-2.5 py-1.5 text-xs text-graphite-200 outline-none focus:border-blueprint-500"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 bg-blueprint-500 hover:bg-blueprint-400 disabled:opacity-50 text-graphite-950 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />}
          {generating ? "Generando render..." : "Generar render"}
        </button>
      </div>

      {error && <p className="text-signal-critical text-xs font-mono">{error}</p>}

      {loading ? (
        <p className="text-graphite-500 text-xs">Cargando renders...</p>
      ) : renders.length === 0 ? (
        <div className="bg-graphite-900 border border-dashed border-graphite-600 rounded-lg p-10 text-center">
          <ImageIcon className="w-6 h-6 text-graphite-500 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-graphite-300 text-sm mb-1">Todavía no generaste ningún render.</p>
          <p className="text-graphite-500 text-xs">Completá el formulario de arriba y tocá "Generar render".</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {renders.map((r) => (
            <div key={r.id} className="bg-graphite-900 border border-graphite-700 rounded-lg overflow-hidden">
              <button onClick={() => setViewerUrl(renderUrls[r.id])} className="block w-full aspect-video bg-graphite-800">
                {renderUrls[r.id] && <img src={renderUrls[r.id]} alt={r.prompt} className="w-full h-full object-cover" />}
              </button>
              <div className="p-2.5 space-y-1.5">
                <p className="text-graphite-300 text-xs line-clamp-2">{r.prompt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-graphite-500 text-[10px] font-mono">{new Date(r.created_at).toLocaleDateString("es-AR")}</span>
                  <button onClick={() => handleDelete(r)} className="p-1 text-graphite-400 hover:text-signal-critical hover:bg-graphite-800 rounded-md transition-colors">
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewerUrl && (
        <div className="fixed inset-0 z-50 bg-graphite-950/95 flex flex-col">
          <div className="h-14 flex items-center justify-between px-4 border-b border-graphite-700 shrink-0">
            <p className="text-graphite-100 text-sm">Render</p>
            <div className="flex items-center gap-2">
              <a href={viewerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-graphite-300 hover:text-blueprint-400 text-xs px-2.5 py-1.5 rounded-md hover:bg-graphite-800 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} /> Abrir aparte
              </a>
              <button onClick={() => setViewerUrl(null)} className="p-1.5 text-graphite-300 hover:text-graphite-100 hover:bg-graphite-800 rounded-md transition-colors">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center bg-graphite-950 p-4">
            <img src={viewerUrl} alt="Render" className="max-w-full max-h-full object-contain" />
          </div>
        </div>
      )}
    </section>
  );
}
