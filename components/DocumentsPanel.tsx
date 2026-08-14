"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Upload,
  FileText,
  Eye,
  Trash2,
  Loader2,
  Sparkles,
  Layers,
  Calculator,
  X,
  ExternalLink,
} from "lucide-react";

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
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerName, setViewerName] = useState
