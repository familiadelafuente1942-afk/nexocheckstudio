"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileQuestion, ChevronDown, ChevronUp, Copy, Check, Pencil, Save, X } from "lucide-react";

type Rfi = { id: string; code: string | null; subject: string; question: string; status: string; created_at: string; };

const STATUS_OPTIONS = [
  { value: "BORRADOR", label: "Borrador", color: "text-graphite-400", bg: "bg-graphite-800" },
  { value: "ENVIADO", label: "Enviado", color: "text-blueprint-400", bg: "bg-blueprint-500/10" },
  { value: "RESPONDIDO", label: "Respondido", color: "text-signal-medium", bg: "bg-signal-medium/10" },
  { value: "CERRADO", label: "Cerrado", color: "text-signal-ok", bg: "bg-signal-ok/10" },
];

function statusStyle(status: string) { return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0]; }

export default function RfisPanel({ projectId }: { projectId: string }) {
  const supabase = createClient();
  const [rfis, setRfis] = useState<Rfi[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editQuestion, setEditQuestion] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadRfis() {
    setLoading(true);
    const { data } = await supabase.from("rfis").select("id, code, subject, question, status, created_at")
      .eq("project_id", projectId).order("created_at", { ascending: false });
    setRfis(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadRfis(); }, [projectId]);

  async function handleStatusChange(rfiId: string, newStatus: string) {
    await supabase.from("rfis").update({ status: newStatus }).eq("id", rfiId);
    setRfis((prev) => prev.map((r) => (r.id === rfiId ? { ...r, status: newStatus } : r)));
  }

  async function handleCopy(rfi: Rfi) {
    const text = `${rfi.code ?? "RFI"}\n\nAsunto: ${rfi.subject}\n\n${rfi.question}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(rfi.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function startEditing(rfi: Rfi) { setEditingId(rfi.id); setEditSubject(rfi.subject); setEditQuestion(rfi.question); }
  function cancelEditing() { setEditingId(null); }

  async function saveEditing(rfiId: string) {
    setSaving(true);
    const { error } = await supabase.from("rfis").update({ subject: editSubject, question: editQuestion }).eq("id", rfiId);
    if (!error) {
      setRfis((prev) => prev.map((r) => (r.id === rfiId ? { ...r, subject: editSubject, question: editQuestion } : r)));
      setEditingId(null);
    }
    setSaving(false);
  }

  if (loading) return <p className="text-graphite-500 text-xs">Cargando RFIs...</p>;

  if (rfis.length === 0) {
    return (
      <div className="bg-graphite-900 border border-dashed border-graphite-600 rounded-lg p-8 text-center">
        <FileQuestion className="w-5 h-5 text-graphite-500 mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-graphite-400 text-sm">Todavía no generaste ningún RFI. Podés crear uno desde un hallazgo.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {rfis.map((rfi) => {
        const style = statusStyle(rfi.status);
        const isExpanded = expandedId === rfi.id;
        const isEditing = editingId === rfi.id;
        return (
          <div key={rfi.id} className="bg-graphite-900 border border-graphite-700 rounded-lg overflow-hidden">
            <button onClick={() => setExpandedId(isExpanded ? null : rfi.id)} className="w-full flex items-center justify-between p-3.5 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[11px] font-mono text-blueprint-400 shrink-0">{rfi.code ?? "RFI"}</span>
                <p className="text-graphite-100 text-sm truncate">{rfi.subject}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm ${style.color} ${style.bg}`}>{style.label}</span>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-graphite-500" strokeWidth={1.5} /> : <ChevronDown className="w-4 h-4 text-graphite-500" strokeWidth={1.5} />}
              </div>
            </button>
            {isExpanded && (
              <div className="px-3.5 pb-3.5 space-y-3 border-t border-graphite-800 pt-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide text-graphite-500 font-medium mb-1">Asunto</label>
                      <input type="text" value={editSubject} onChange={(e) => setEditSubject(e.target.value)}
                        className="w-full bg-graphite-800 border border-graphite-600 rounded-md px-2.5 py-1.5 text-sm text-graphite-100 outline-none focus:border-blueprint-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide text-graphite-500 font-medium mb-1">Consulta</label>
                      <textarea value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)} rows={6}
                        className="w-full bg-graphite-800 border border-graphite-600 rounded-md px-2.5 py-1.5 text-sm text-graphite-100 outline-none focus:border-blueprint-500 resize-y" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => saveEditing(rfi.id)} disabled={saving}
                        className="flex items-center gap-1.5 bg-blueprint-500 hover:bg-blueprint-400 disabled:opacity-50 text-graphite-950 text-xs font-medium px-3 py-1.5 rounded-md transition-colors">
                        <Save className="w-3.5 h-3.5" strokeWidth={2} /> {saving ? "Guardando..." : "Guardar cambios"}
                      </button>
                      <button onClick={cancelEditing} className="flex items-center gap-1.5 text-graphite-400 hover:text-graphite-200 text-xs px-3 py-1.5 transition-colors">
                        <X className="w-3.5 h-3.5" strokeWidth={1.5} /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-graphite-300 text-sm whitespace-pre-line">{rfi.question}</p>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <select value={rfi.status} onChange={(e) => handleStatusChange(rfi.id, e.target.value)}
                        className="bg-graphite-800 border border-graphite-600 rounded-md px-2.5 py-1.5 text-xs text-graphite-200 outline-none focus:border-blueprint-500">
                        {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <div className="flex items-center gap-3">
                        <button onClick={() => startEditing(rfi)} className="flex items-center gap-1.5 text-xs text-graphite-400 hover:text-blueprint-400 transition-colors">
                          <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} /> Editar
                        </button>
                        <button onClick={() => handleCopy(rfi)} className="flex items-center gap-1.5 text-xs text-graphite-400 hover:text-blueprint-400 transition-colors">
                          {copiedId === rfi.id ? <><Check className="w-3.5 h-3.5" strokeWidth={2} /> Copiado</> : <><Copy className="w-3.5 h-3.5" strokeWidth={1.5} /> Copiar texto</>}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
