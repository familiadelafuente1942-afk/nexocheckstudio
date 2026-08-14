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
    return NextResponse.json({ error: "No hay documentos para calcular el cómputo" }, { status: 400 });
  }

  if (docs.length > MAX_DOCUMENTS) {
    return NextResponse.json(
      { error: `Por ahora se pueden procesar hasta ${MAX_DOCUMENTS} documentos juntos. Esta obra tiene ${docs.length}.` },
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
    text: `Calculá el cómputo de materiales de esta obra: "${project.name}". Documentos incluidos:\n${docList}\n\nEstimá cantidades únicamente cuando exista información suficiente en los planos (medidas, superficies, cotas). Para cada ítem indicá en "source_documents" de qué documento(s) sale el dato.`,
  });

  const systemPrompt = `Sos un asistente técnico de cómputo y presupuesto de obras de construcción. Analizás planos técnicos para identificar y cuantificar materiales y elementos constructivos.

Reglas:
- NUNCA inventes cantidades que no puedas fundamentar en el documento (medidas, superficies, cantidades de elementos visibles).
- Si no hay información suficiente para calcular una cantidad con razonable certeza, NO la incluyas.
- Preferí categorías amplias y útiles: hormigón, mampostería, superficie de pisos, superficie de cielorrasos, pintura, puertas, ventanas, artefactos sanitarios, luminarias, tomas eléctricas, cañerías, etc. — solo las que puedas fundamentar.
- Este sistema es de asistencia preventiva, un cómputo PRELIMINAR. NO reemplaza el cómputo definitivo de un profesional.
- Devolvé SIEMPRE y ÚNICAMENTE un JSON válido, sin texto antes ni después, con este formato exacto:

{
  "items": [
    {
      "material": "nombre del material o elemento",
      "description": "breve aclaración si hace falta",
      "unit": "m2" | "m3" | "ml" | "un" | "kg",
      "quantity": número,
      "waste_percent": número (desperdicio recomendado, ej. 10),
      "confidence_score": número entre 0 y 100,
      "source_documents": ["nombre exacto del documento"]
    }
  ]
}

Si no hay información suficiente para ningún ítem, devolvé { "items": [] }.
Generá como máximo 20 ítems, priorizando los más significativos para el presupuesto de obra.`;

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
        { error: "Error al calcular el cómputo con IA", detail: errText },
        { status: 500 }
      );
    }

    const result = await anthropicResponse.json();
    const textBlock = result.content?.find((c: { type: string }) => c.type === "text");
    const rawText = textBlock?.text ?? "{}";
    const cleaned = rawText.replace(/```json|```/g, "").trim();

    let parsed: { items: Array<Record<string, unknown>> };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "La IA devolvió un formato inválido" }, { status: 500 });
    }

    const items = parsed.items ?? [];

    if (items.length > 0) {
      const rows = items.map((it) => ({
        project_id: project.id,
        organization_id: project.organization_id,
        document_id: null,
        material: it.material ?? "Sin especificar",
        description: it.description ?? null,
        unit: it.unit ?? "un",
        quantity: it.quantity ?? 0,
        waste_percent: it.waste_percent ?? 0,
        confidence_score: it.confidence_score ?? 70,
        source_documents: Array.isArray(it.source_documents)
          ? (it.source_documents as string[]).join(", ")
          : null,
      }));

      const { error: insertError } = await supabase.from("quantity_items").insert(rows);

      if (insertError) {
        return NextResponse.json(
          { error: "No se pudo guardar el cómputo", detail: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, count: items.length, documentsAnalyzed: docs.length });
  } catch (err) {
    return NextResponse.json(
      { error: "Error inesperado al calcular el cómputo", detail: String(err) },
      { status: 500 }
    );
  }
}
