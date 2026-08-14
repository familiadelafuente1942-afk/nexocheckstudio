"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileQuestion, ChevronDown, ChevronUp, Copy, Check, Pencil, Save, X } from "lucide-react";

type Rfi = {
  id: string;
  code: string | null;
  subject: string;
  question: string;
  status: string;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: "BORRADOR", label: "Borrador", color: "text-graphite-400", bg: "bg-graphite-800" },
  { value: "ENVIADO", label: "Enviado", color: "text-blueprint-400", bg: "bg-blueprint-500/10" },
  { value: "RESPONDIDO", label: "Respondido", color: "text-signal-medium", bg: "bg-signal-medium/10" },
  { value: "CERRADO", label: "Cerrado", color: "text-signal-ok", bg: "bg-signal-ok/10" },
];

function statusStyle(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
}

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
    const { data } = await supabase
      .from("rfis")
      .select("id, code, subject, question, status, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    setRfis(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadRfis();
    // eslint-disable-next-line react-hoo
