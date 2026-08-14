import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

const MAX_DOCUMENTS = 15;

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { projectId } = await request.json();

  if (!projectId) {
    return NextResponse.json({ error: "Falta projectId" }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, organization_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Obra no encontrada" }, { status: 404 });
  }

  const { data: docs, error: docsError } = await supabase
    .from("documents")
    .select("id, name, discipline, file_path")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (docsError || !docs || docs.length === 0) {
    return NextResponse.json({ error: "No hay documentos para analizar" }, { status: 400 });
  }

  if (docs.length > MAX_DOCUMENTS) {
    return NextResponse.json(
      { error: `Por ahora se pueden analizar hasta ${MAX_DOCUMENTS} documentos juntos. Esta obra tiene ${docs.length}.` },
      { status: 400 }
    );
  }

  const contentBlocks: Array<Record<string, unknown>> = [];

  for (const doc of docs) {
    const { data: signedUrlData, error: signError } = await supabase.storage
      .from("documentos")
      .createSignedUrl(doc.file_path, 60);

    if (signError || !signedUrlData) continue;

    const fileResponse = await fetch(signedUrlData.signedUrl);
    const fileBuffer = await fileResponse.arrayBuffer();
    const base64 = Buffer.from(fileBuffer).toString("base64");

    contentBlocks.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: base64,
      },
      title: doc.name,
    });
  }

  if (contentBlocks.length === 0) {
    return NextResponse.json({ error: "No se pudo acceder a ningún documento" }, { status: 500 });
  }

  const docList = docs.map((d) => `- ${d.name} (${d.discipline})`).join("\n");

  contentBlocks.push({
    type: "text",
    text: `Analizá el conjunto completo de documentos de esta obra: "${project.name}". Documentos incluidos:\n${docList}\n\nBuscá especialmente contradicciones e interferencias ENTRE disciplinas distintas (por ejemplo: estructura vs. sanitaria, arquitectura vs. eléctrica), no solo errores dentro de un mismo plano. Para cada hallazgo, indicá en "source_documents" los nombres exactos de los documentos involucrados.`,
  });

  const systemPrompt = `Sos un asistente técnico de auditoría de proyectos de construcción. Analizás el conjunto completo de planos de una obra (varios documentos a la vez) para detectar contradicciones, interferencias entre disciplinas, e información faltante que solo se nota comparando varios planos entre sí.

Reglas:
- NUNCA inventes información que no esté en los documentos.
- Priorizá observaciones que crucen información entre distintos planos/disciplinas — ese es el valor de este análisis conjunto.
- Este sistema es de asistencia preventiva, NO reemplaza al profesional responsable.
- Devolvé SIEMPRE y ÚNICAMENTE un JSON válido, sin texto antes ni después, con este formato exacto:

{
  "findings": [
    {
      "finding_type": "INCONSISTENCIA" | "INFORMACION_FALTANTE" | "RIESGO_CONSTRUCTIVO" | "OBSERVACION",
      "severity": "CRITICA" | "ALTA" | "MEDIA" | "BAJA",
      "title": "string corto, máx 80 caracteres",
      "description": "explicación clara de la observación",
      "recommendation": "qué debería revisar o hacer el profesional",
      "confidence_score": número entre 0 y 100,
      "source_documents": ["nombre exacto del documento 1", "nombre exacto del documento 2"]
    }
  ]
}

Si no hay observaciones relevantes, devolvé { "findings": [] }.
Generá como máximo 15 observaciones, priorizando las más importantes y las que cruzan información entre documentos.`;

  try {
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 6000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: contentBlocks,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      return NextResponse.json(
        { error: "Error al analizar con IA", detail: errText },
        { status: 500 }
      );
    }

    const result = await anthropicResponse.json();
    const textBlock = result.content?.find((c: { type: string }) => c.type === "text");
    const rawText = textBlock?.text ?? "{}";
    const cleaned = rawText.replace(/```json|```/g, "").trim();

    let parsed: { findings: Array<Record<string, unknown>> };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "La IA devolvió un formato inválido" }, { status: 500 });
    }

    const findings = parsed.findings ?? [];

    if (findings.length > 0) {
      const rows = findings.map((f) => ({
        project_id: project.id,
        organization_id: project.organization_id,
        document_id: null,
        finding_type: f.finding_type ?? "OBSERVACION",
        severity: f.severity ?? "MEDIA",
        title: f.title ?? "Sin título",
        description: f.description ?? "",
        recommendation: f.recommendation ?? null,
        confidence_score: f.confidence_score ?? 70,
        source_documents: Array.isArray(f.source_documents)
          ? (f.source_documents as string[]).join(", ")
          : null,
      }));

      const { error: insertError } = await supabase.from("findings").insert(rows);

      if (insertError) {
        return NextResponse.json(
          { error: "No se pudieron guardar los hallazgos", detail: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, count: findings.length, documentsAnalyzed: docs.length });
  } catch (err) {
    return NextResponse.json(
      { error: "Error inesperado al analizar", detail: String(err) },
      { status: 500 }
    );
  }
}
