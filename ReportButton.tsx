"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

type ProjectInfo = { name: string; clientName: string | null; location: string | null; orgName: string; };

const SEVERITY_LABELS: Record<string, string> = { CRITICA: "CRÍTICA", ALTA: "ALTA", MEDIA: "MEDIA", BAJA: "BAJA" };

export default function ReportButton({ projectId, project }: { projectId: string; project: ProjectInfo; }) {
  const supabase = createClient();
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);

    const { data: findings } = await supabase.from("findings")
      .select("finding_type, severity, title, description, recommendation, source_documents")
      .eq("project_id", projectId).order("severity", { ascending: true });

    const { data: rfis } = await supabase.from("rfis").select("code, subject, status").eq("project_id", projectId);

    const { data: documents } = await supabase.from("documents").select("name, discipline, revision").eq("project_id", projectId);

    const { data: quantityItems } = await supabase.from("quantity_items")
      .select("material, description, unit, quantity, waste_percent, confidence_score, source_documents")
      .eq("project_id", projectId).order("material", { ascending: true });

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 18;
    let y = 20;

    function addPageIfNeeded(spaceNeeded: number) { if (y + spaceNeeded > 280) { doc.addPage(); y = 20; } }

    doc.setFontSize(10); doc.setTextColor(120, 120, 120); doc.text("NEXOCHECKSTUDIO", marginX, y); y += 14;
    doc.setFontSize(20); doc.setTextColor(20, 20, 20); doc.text(project.name, marginX, y); y += 8;
    doc.setFontSize(11); doc.setTextColor(90, 90, 90); doc.text(`${project.orgName}`, marginX, y); y += 6;
    if (project.clientName || project.location) {
      doc.text(`${project.clientName ?? "Sin cliente"}${project.location ? " · " + project.location : ""}`, marginX, y); y += 6;
    }
    doc.text(`Generado el ${new Date().toLocaleDateString("es-AR")}`, marginX, y); y += 14;

    doc.setDrawColor(200, 200, 200); doc.line(marginX, y, pageWidth - marginX, y); y += 10;

    doc.setFontSize(13); doc.setTextColor(20, 20, 20); doc.text("Resumen ejecutivo", marginX, y); y += 8;
    doc.setFontSize(10); doc.setTextColor(70, 70, 70);
    const critCount = (findings ?? []).filter((f) => f.severity === "CRITICA").length;
    const altaCount = (findings ?? []).filter((f) => f.severity === "ALTA").length;
    doc.text(`Documentos analizados: ${documents?.length ?? 0}`, marginX, y); y += 6;
    doc.text(`Hallazgos totales: ${findings?.length ?? 0} (${critCount} críticos, ${altaCount} altos)`, marginX, y); y += 6;
    doc.text(`RFIs generados: ${rfis?.length ?? 0}`, marginX, y); y += 6;
    doc.text(`Ítems de cómputo: ${quantityItems?.length ?? 0}`, marginX, y); y += 14;

    if (documents && documents.length > 0) {
      addPageIfNeeded(20);
      doc.setFontSize(13); doc.setTextColor(20, 20, 20); doc.text("Documentación", marginX, y); y += 8;
      doc.setFontSize(9); doc.setTextColor(70, 70, 70);
      for (const d of documents) { addPageIfNeeded(6); doc.text(`• ${d.name} — ${d.discipline} (Rev. ${d.revision ?? "A"})`, marginX, y); y += 5.5; }
      y += 8;
    }

    if (findings && findings.length > 0) {
      addPageIfNeeded(20);
      doc.setFontSize(13); doc.setTextColor(20, 20, 20); doc.text("Hallazgos", marginX, y); y += 8;
      for (const f of findings) {
        addPageIfNeeded(24);
        doc.setFontSize(9); doc.setTextColor(150, 30, 30); doc.text(`[${SEVERITY_LABELS[f.severity] ?? f.severity}]`, marginX, y);
        doc.setFontSize(10); doc.setTextColor(20, 20, 20); doc.text(f.title, marginX + 22, y); y += 6;
        doc.setFontSize(9); doc.setTextColor(80, 80, 80);
        const descLines = doc.splitTextToSize(f.description, pageWidth - marginX * 2);
        doc.text(descLines, marginX, y); y += descLines.length * 4.5 + 2;
        if (f.recommendation) {
          const recLines = doc.splitTextToSize(`Recomendación: ${f.recommendation}`, pageWidth - marginX * 2);
          doc.setTextColor(100, 100, 100); doc.text(recLines, marginX, y); y += recLines.length * 4.5 + 2;
        }
        if (f.source_documents) {
          doc.setFontSize(8); doc.setTextColor(130, 130, 130); doc.text(`Documentos: ${f.source_documents}`, marginX, y); y += 5;
        }
        y += 4;
      }
      y += 6;
    }

    if (quantityItems && quantityItems.length > 0) {
      addPageIfNeeded(20);
      doc.setFontSize(13); doc.setTextColor(20, 20, 20); doc.text("Cómputo de materiales (preliminar)", marginX, y); y += 8;
      doc.setFontSize(8); doc.setTextColor(130, 130, 130);
      doc.text("Material", marginX, y); doc.text("Cantidad", marginX + 90, y); doc.text("Desp.", marginX + 130, y); doc.text("Confianza", marginX + 155, y);
      y += 5; doc.setDrawColor(220, 220, 220); doc.line(marginX, y, pageWidth - marginX, y); y += 5;
      for (const it of quantityItems) {
        addPageIfNeeded(10);
        doc.setFontSize(9); doc.setTextColor(30, 30, 30);
        const materialLines = doc.splitTextToSize(it.material, 85);
        doc.text(materialLines, marginX, y);
        doc.setTextColor(70, 70, 70);
        doc.text(`${it.quantity} ${it.unit}`, marginX + 90, y);
        doc.text(`${it.waste_percent}%`, marginX + 130, y);
        doc.text(`${it.confidence_score}%`, marginX + 155, y);
        y += materialLines.length * 4.5;
        if (it.source_documents) {
          doc.setFontSize(7.5); doc.setTextColor(140, 140, 140);
          const srcLines = doc.splitTextToSize(`Fuente: ${it.source_documents}`, pageWidth - marginX * 2);
          doc.text(srcLines, marginX, y); y += srcLines.length * 3.8;
        }
        y += 4;
      }
      y += 6;
    }

    if (rfis && rfis.length > 0) {
      addPageIfNeeded(20);
      doc.setFontSize(13); doc.setTextColor(20, 20, 20); doc.text("RFIs recomendados", marginX, y); y += 8;
      doc.setFontSize(9); doc.setTextColor(70, 70, 70);
      for (const r of rfis) { addPageIfNeeded(6); doc.text(`${r.code ?? "RFI"} — ${r.subject} (${r.status})`, marginX, y); y += 5.5; }
    }

    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7); doc.setTextColor(150, 150, 150);
      doc.text("Sistema inteligente de asistencia preventiva. No reemplaza al profesional responsable de la obra.", marginX, 290);
    }

    doc.save(`${project.name.replace(/[^a-zA-Z0-9]/g, "_")}_informe.pdf`);
    setGenerating(false);
  }

  return (
    <button onClick={handleGenerate} disabled={generating}
      className="flex items-center gap-1.5 bg-graphite-800 hover:bg-graphite-700 border border-graphite-600 disabled:opacity-50 text-graphite-200 text-xs font-medium px-3 py-1.5 rounded-md transition-colors">
      {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" strokeWidth={1.5} />}
      {generating ? "Generando..." : "Descargar informe"}
    </button>
  );
}
