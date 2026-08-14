import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { documentId } = await request.json();

  if (!documentId) {
    return NextResponse.json({ error: "Falta documentId" }, { status: 400 });
  }

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, name, discipline, file_path, project_id, organization_id")
    .eq("id", documentId)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const { data: signedUrlData, error: signError } = await supabase.storage
    .from("documentos")
    .createSignedUrl(doc.file_path, 60);

  if (signError || !signedUrlData) {
    return NextResponse.json({ error: "No se pudo acceder al archivo" }, { status: 500 });
  }

  const fileResponse = await fetch(signedUrlData.signedUrl);
  const fileBuffer = await fileResponse.arrayBuffer();
  const base64 = Buffer.from(fileBuffer).toString("base64");

  const systemPrompt = `Sos un asistente técnico de auditoría de proyectos de construcción. Analizás un plano o documento técnico en PDF y devolvés observaciones útiles para arquitectos, ingenieros y constructores.

Reglas:
- NUNCA inventes información que no esté en el documento.
- Si no hay suficiente información para una observación, no la generes.
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
      "confidence_score": número entre 0 y 100
    }
  ]
}

Si el documento está en orden y no hay observaciones relevantes, devolvé { "findings": [] }.
Generá como máximo 8 observaciones, priorizando las más importantes.`;

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
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              },
              {
                type: "text",
                text: `Analizá este documento técnico. Nombre del archivo: "${doc.name}". Disciplina declarada: ${doc.discipline}.`,
              },
            ],
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
        project_id: doc.project_id,
        organization_id: doc.organization_id,
        document_id: doc.id,
        finding_type: f.finding_type ?? "OBSERVACION",
        severity: f.severity ?? "MEDIA",
        title: f.title ?? "Sin título",
        description: f.description ?? "",
        recommendation: f.recommendation ?? null,
        confidence_score: f.confidence_score ?? 70,
      }));

      const { error: insertError } = await supabase.from("findings").insert(rows);

      if (insertError) {
        return NextResponse.json(
          { error: "No se pudieron guardar los hallazgos", detail: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, count: findings.length });
  } catch (err) {
    return NextResponse.json(
      { error: "Error inesperado al analizar", detail: String(err) },
      { status: 500 }
    );
  }
}
