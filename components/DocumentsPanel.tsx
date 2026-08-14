"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, FileText, Eye, Trash2, Loader2, Sparkles, Layers, Calculator } from "lucide-react";

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
  const [calculatingQuantities, setCalculatingQuantities] = useState(false);
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
      setError("Error de
