"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Upload, Camera, FileText, Image as ImageIcon, Eye, Trash2, Loader2,
  Sparkles, Layers, Calculator, X, ExternalLink,
} from "lucide-react";

type DocumentRow = {
  id: string; name: string; discipline: string; revision: string | null;
  file_path: string; file_size: number | null; mime_type: string | null; created_at: string;
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
function disciplineLabel(value: string) { return DISCIPLINAS.find((d) => d.value === value)?.label ?? value; }
function isImage(mimeType: string | null) { return !!mimeType && mimeType.startsWith("image/"); }

export default function DocumentsPanel({ projectId, organizationId }: { projectId: string; organizationId: string; }) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [discipline, setDiscipline] = useState("SIN_CLASIFICAR");
  const [error, setError] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analyzingProject, setAnalyzingProject] = useState(false);
  const [calculatingQuantities, setCalculatingQuantities] = useState(false);
  const [analyzeMessage, setAnalyzeMessage] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerName, setViewerName] = useState<string>("");
  const [viewerIsImage, setViewerIsImage] = useState(false);

  async function loadDocuments() {
    setLoading(true);
    const { data } = await supabase.from("documents")
      .select("id, name, discipline, revision, file_path, file_size, mime_type, created_at")
      .eq("project_id", projectId).order("created_at", { ascending: false });
    setDocuments(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadDocuments(); }, [projectId]);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);

    const isPdf = file.type === "application/pdf";
    const isImg = file.type.startsWith("image/");
    if (!isPdf && !isImg) { setError("Solo se aceptan archivos PDF o fotos (JPG/PNG)."); setUploading(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Tu sesión expiró. Volvé a iniciar sesión."); setUploading(false); return; }

    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${organizationId}/${projectId}/${Date.now()}_${cleanName}`;

    const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file);
    if (uploadError) { setError("No se pudo subir el archivo. Intentá de nuevo."); setUploading(false); return; }

    const { error: insertError } = await supabase.from("documents").insert({
      project_id: projectId, organization_id: organizationId, name: file.name, discipline,
      file_path: path, mime_type: file.type, file_size: file.size, uploaded_by: user.id,
    });

    if (insertError) { setError("El archivo se subió pero no se pudo registrar. Avisale a Claude."); setUploading(false); return; }

    setUploading(false);
    loadDocuments();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCameraChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  async function handleView(doc: DocumentRow) {
    const { data, error: signError } = await supabase.storage.from("documentos").createSignedUrl(doc.file_path, 60 * 10);
    if (signError || !data) { setError("No se pudo abrir el documento."); return; }
    setViewerUrl(data.signedUrl);
    setViewerName(doc.name);
    setViewerIsImage(isImage(doc.mime_type));
  }

  function closeViewer() { setViewerUrl(null); setViewerName(""); setViewerIsImage(false); }

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
      const res = await fetch("/api/analizar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: doc.id }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "No se pudo analizar el documento."); setAnalyzingId(null); return; }
      setAnalyzeMessage(data.count > 0 ? `Se encontraron ${data.count} hallazgo(s) en "${doc.name}".` : `No se encontraron observaciones en "${doc.name}".`);
      setAnalyzingId(null);
      window.location.reload();
    } catch { setError("Error de conexión al analizar el documento."); setAnalyzingId(null); }
  }

  async function handleAnalyzeProject() {
    setAnalyzingProject(true);
    setAnalyzeMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/analizar-proyecto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "No se pudo analizar el proyecto."); setAnalyzingProject(false); return; }
      setAnalyzeMessage(data.count > 0 ? `Análisis conjunto completo: ${data.count} hallazgo(s) cruzando ${data.documentsAnalyzed} documento(s).` : `Análisis conjunto completo: no se encontraron observaciones cruzando los ${data.documentsAnalyzed} documento(s).`);
      setAnalyzingProject(false);
      window.location.reload();
    } catch { setError("Error de conexión al analizar el proyecto."); setAnalyzingProject(false); }
  }

  async function handleCalculateQuantities() {
    setCalculatingQuantities(true);
    setAnalyzeMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/analizar-computo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "No se pudo calcular el cómputo."); setCalculatingQuantities(false); return; }
      setAnalyzeMessage(data.count > 0 ? `Cómputo calculado: ${data.count} ítem(s) de materiales sobre ${data.documentsAnalyzed} documento(s).` : `No se pudo estimar ningún ítem con la información disponible en los ${data.documentsAnalyzed} documento(s).`);
      setCalculatingQuantities(false);
      window.location.reload();
    } catch { setError("Error de conexión al calcular el cómputo."); setCalculatingQuantities(false); }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-sm text-graphite-200">Documentación</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={discipline} onChange={(e) => setDiscipline(e.target.value)}
            className="bg-graphite-800 border border-graphite-600 rounded-md px-2.5 py-1.5 text-xs text-graphite-200 outline-none focus:border-blueprint-500">
            {DISCIPLINAS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>

          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 bg-blueprint-500 hover:bg-blueprint-400 disabled:opacity-50 text-graphite-950 text-xs font-medium px-3 py-1.5 rounded-md transition-colors">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" strokeWidth={2} />}
            {uploading ? "Subiendo..." : "Subir PDF"}
          </button>
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />

          <button onClick={() => cameraInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 bg-graphite-800 hover:bg-graphite-700 border border-graphite-600 disabled:opacity-50 text-graphite-200 text-xs font-medium px-3 py-1.5 rounded-md transition-colors">
            <Camera className="w-3.5 h-3.5" strokeWidth={1.5} /> Escanear / Foto
          </button>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraChange} />

          {documents.length > 1 && (
            <>
              <button onClick={handleAnalyzeProject} disabled={analyzingProject}
                className="flex items-center gap-1.5 bg-graphite-800 hover:bg-graphite-700 border border-blueprint-500/40 disabled:opacity-50 text-blueprint-400 text-xs font-medium px-3 py-1.5 rounded-md transition-colors">
                {analyzingProject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" strokeWidth={1.5} />}
                {analyzingProject ? "Analizando proyecto..." : "Analizar proyecto completo"}
              </button>
              <button onClick={handleCalculateQuantities} disabled={calculatingQuantities}
                className="flex items-center gap-1.5 bg-graphite-800 hover:bg-graphite-700 border border-graphite-600 disabled:opacity-50 text-graphite-300 text-xs font-medium px-3 py-1.5 rounded-md transition-colors">
                {calculatingQuantities ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" strokeWidth={1.5} />}
                {calculatingQuantities ? "Calculando..." : "Calcular cómputo"}
              </button>
            </>
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
          <p className="text-graphite-500 text-xs">Elegí la disciplina y tocá "Subir PDF" o "Escanear / Foto" para cargar el primero.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {documents.map((doc) => {
            const docIsImage = isImage(doc.mime_type);
            return (
              <div key={doc.id} className="bg-graphite-900 border border-graphite-700 rounded-lg p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {docIsImage ? <ImageIcon className="w-4 h-4 text-blueprint-400 shrink-0" strokeWidth={1.5} /> : <FileText className="w-4 h-4 text-blueprint-400 shrink-0" strokeWidth={1.5} />}
                  <div className="min-w-0">
                    <p className="text-graphite-100 text-sm truncate">{doc.name}</p>
                    <p className="text-graphite-500 text-xs mt-0.5 font-mono">
                      {disciplineLabel(doc.discipline)} · Rev. {doc.revision ?? "A"} · {formatBytes(doc.file_size)}{docIsImage ? " · Foto" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!docIsImage && (
                    <button onClick={() => handleAnalyze(doc)} disabled={analyzingId === doc.id}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs text-blueprint-400 hover:bg-graphite-800 rounded-md transition-colors disabled:opacity-50" title="Analizar solo este documento">
                      {analyzingId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />}
                      {analyzingId === doc.id ? "Analizando..." : "Analizar"}
                    </button>
                  )}
                  <button onClick={() => handleView(doc)} className="p-1.5 text-graphite-400 hover:text-blueprint-400 hover:bg-graphite-800 rounded-md transition-colors" title="Ver documento">
                    <Eye className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button onClick={() => handleDelete(doc)} className="p-1.5 text-graphite-400 hover:text-signal-critical hover:bg-graphite-800 rounded-md transition-colors" title="Eliminar">
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewerUrl && (
        <div className="fixed inset-0 z-50 bg-graphite-950/95 flex flex-col">
          <div className="h-14 flex items-center justify-between px-4 border-b border-graphite-700 shrink-0">
            <p className="text-graphite-100 text-sm truncate pr-4">{viewerName}</p>
            <div className="flex items-center gap-2 shrink-0">
              <a href={viewerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-graphite-300 hover:text-blueprint-400 text-xs px-2.5 py-1.5 rounded-md hover:bg-graphite-800 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} /> Abrir aparte
              </a>
              <button onClick={closeViewer} className="p-1.5 text-graphite-300 hover:text-graphite-100 hover:bg-graphite-800 rounded-md transition-colors">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
          {viewerIsImage ? (
            <div className="flex-1 overflow-auto flex items-center justify-center bg-graphite-950">
              <img src={viewerUrl} alt={viewerName} className="max-w-full h-auto" />
            </div>
          ) : (
            <iframe src={viewerUrl} className="flex-1 w-full bg-graphite-100" title={viewerName} />
          )}
        </div>
      )}
    </section>
  );
}
