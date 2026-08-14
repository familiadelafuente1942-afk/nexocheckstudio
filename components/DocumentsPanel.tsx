"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, FileText, Eye, Trash2, Loader2, Sparkles, Layers } from "lucide-react";

type DocumentRow = {
  id: string;
  name: string;
  discipline: string;
  revision: string | null;
  file_path: string;
  file_size: number | null;
  created_at: string;
};

const DISCIPLINAS = [
  { value: "ARQUITECTURA", label: "Arquitectura" },
  { value: "ESTRUCTURA", label: "Estructura" },
  { value: "SANITARIA", label: "Sanitaria" },
  { value: "ELECTRICA", label: "Eléctrica" },
  { value: "HVAC", label: "HVAC / Climatización" },
  { value: "GAS", label: "Gas" },
  { value: "INCENDIO", label: "Incendio" },
  { value: "DETALLES", label: "Detalles constructivos" },
  { value: "SIN_CLASIFICAR", label: "Sin clasificar" },
];

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function disciplineLabel(value: string) {
  return DISCIPLINAS.find((d) => d.value === value)?.label ?? value;
}

export default function DocumentsPanel({
  projectId,
  organizationId,
}: {
  projectId: string;
  organizationId: string;
}) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [discipline, setDiscipline] = useState("SIN_CLASIFICAR");
  const [error, setError] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analyzingProject, setAnalyzingProject] = useState(false);
  const [analyzeMessage, setAnalyzeMessage] = useState<string | null>(null);

  async function loadDocuments() {
    setLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("id, name, discipline, revision, file_path, file_size, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    setDocuments(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    if (file.type !== "application/pdf") {
      setError("Por ahora solo se aceptan archivos PDF.");
      setUploading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Tu sesión expiró. Volvé a iniciar sesión.");
      setUploading(false);
      return;
    }

    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${organizationId}/${projectId}/${Date.now()}_${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from("documentos")
      .upload(path, file);

    if (uploadError) {
      setError("No se pudo subir el archivo. Intentá de nuevo.");
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from("documents").insert({
      project_id: projectId,
      organization_id: organizationId,
      name: file.name,
      discipline,
      file_path: path,
      mime_type: file.type,
      file_size: file.size,
      uploaded_by: user.id,
    });

    if (insertError) {
      setError("El archivo se subió pero no se pudo registrar. Avisale a Claude.");
      setUploading(false);
      return;
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    loadDocuments();
  }

  async function handleView(filePath: string) {
    const { data, error: signError } = await supabase.storage
      .from("documentos")
      .createSignedUrl(filePath, 60 * 5);

    if (signError || !data) {
      setError("No se pudo abrir el documento.");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function handleDelete(doc: DocumentRow) {
    const confirmed = window.confirm(`¿Eliminar "${doc.name}"? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    await supabase.storage.from("documentos").remove([doc.file_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    loadDocuments();
  }

  async function handleAnalyze(doc: DocumentRow) {
    setAnalyzingId(doc.id);
    setAnalyzeMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo analizar el documento.");
        setAnalyzingId(null);
        return;
      }

      setAnalyzeMessage(
        data.count > 0
          ? `Se encontraron ${data.count} hallazgo(s) en "${doc.name}".`
          : `No se encontraron observaciones en "${doc.name}".`
      );
      setAnalyzingId(null);
      window.location.reload();
    } catch {
      setError("Error de conexión al analizar el documento.");
      setAnalyzingId(null);
    }
  }

  async function handleAnalyzeProject() {
    setAnalyzingProject(true);
    setAnalyzeMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/analizar-proyecto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo analizar el proyecto.");
        setAnalyzingProject(false);
        return;
      }

      setAnalyzeMessage(
        data.count > 0
          ? `Análisis conjunto completo: ${data.count} hallazgo(s) cruzando ${data.documentsAnalyzed} documento(s).`
          : `Análisis conjunto completo: no se encontraron observaciones cruzando los ${data.documentsAnalyzed} documento(s).`
      );
      setAnalyzingProject(false);
      window.location.reload();
    } catch {
      setError("Error de conexión al analizar el proyecto.");
      setAnalyzingProject(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-sm text-graphite-200">Documentación</h2>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value)}
            className="bg-graphite-800 border border-graphite-600 rounded-md px-2.5 py-1.5 text-xs text-graphite-200 outline-none focus:border-blueprint-500"
          >
            {DISCIPLINAS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 bg-blueprint-500 hover:bg-blueprint-400 disabled:opacity-50 text-graphite-950 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" strokeWidth={2} />
            )}
            {uploading ? "Subiendo..." : "Subir PDF"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          {documents.length > 1 && (
            <button
              onClick={handleAnalyzeProject}
              disabled={analyzingProject}
              className="flex items-center gap-1.5 bg-graphite-800 hover:bg-graphite-700 border border-blueprint-500/40 disabled:opacity-50 text-blueprint-400 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
            >
              {analyzingProject ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Layers className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
              {analyzingProject ? "Analizando proyecto..." : "Analizar proyecto completo"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-signal-critical text-xs font-mono">{error}</p>}
      {analyzeMessage && <p className="text-signal-ok text-xs font-mono">{analyzeMessage}</p>}

      {loading ? (
        <p className="text-graphite-500 text-xs">Cargando documentos...</p>
      ) : documents.length === 0 ? (
        <div className="bg-graphite-900 border border-dashed border-graphite-600 rounded-lg p-10 text-center">
          <FileText className="w-6 h-6 text-graphite-500 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-graphite-300 text-sm mb-1">Todavía no subiste ningún plano.</p>
          <p className="text-graphite-500 text-xs">
            Elegí la disciplina y tocá "Subir PDF" para cargar el primero.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-graphite-900 border border-graphite-700 rounded-lg p-3.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-blueprint-400 shrink-0" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-graphite-100 text-sm truncate">{doc.name}</p>
                  <p className="text-graphite-500 text-xs mt-0.5 font-mono">
                    {disciplineLabel(doc.discipline)} · Rev. {doc.revision ?? "A"} ·{" "}
                    {formatBytes(doc.file_size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleAnalyze(doc)}
                  disabled={analyzingId === doc.id}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs text-blueprint-400 hover:bg-graphite-800 rounded-md transition-colors disabled:opacity-50"
                  title="Analizar solo este documento"
                >
                  {analyzingId === doc.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                  {analyzingId === doc.id ? "Analizando..." : "Analizar"}
                </button>
                <button
                  onClick={() => handleView(doc.file_path)}
                  className="p-1.5 text-graphite-400 hover:text-blueprint-400 hover:bg-graphite-800 rounded-md transition-colors"
                  title="Ver documento"
                >
                  <Eye className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => handleDelete(doc)}
                  className="p-1.5 text-graphite-400 hover:text-signal-critical hover:bg-graphite-800 rounded-md transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
