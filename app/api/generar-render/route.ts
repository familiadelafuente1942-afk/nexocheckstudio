import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY no configurada en el servidor." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      projectId,
      organizationId,
      sourceType,
      sourceDocumentId,
      prompt,
      style,
    } = body;

    if (!projectId || !organizationId || !sourceType || !prompt) {
      return NextResponse.json(
        { error: "Faltan campos requeridos (projectId, organizationId, sourceType, prompt)." },
        { status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let contextoDocumento = "";
    if (sourceDocumentId) {
      const { data: doc } = await supabase
        .from("documents")
        .select("name, discipline, mime_type")
        .eq("id", sourceDocumentId)
        .single();
      if (doc) {
        contextoDocumento = `Referencia: documento "${doc.name}" (disciplina: ${doc.discipline}). `;
      }
    }

    const promptFinal = [
      "Render arquitectónico fotorrealista, alta calidad, iluminación natural.",
      contextoDocumento,
      prompt,
      style ? `Estilo: ${style}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: promptFinal,
        size: "1536x1024",
        quality: "high",
        n: 1,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return NextResponse.json(
        { error: "Error generando el render con OpenAI.", detail: errText },
        { status: 502 }
      );
    }

    const openaiData = await openaiRes.json();
    const base64Image = openaiData.data?.[0]?.b64_json;

    if (!base64Image) {
      return NextResponse.json(
        { error: "OpenAI no devolvió ninguna imagen." },
        { status: 502 }
      );
    }

    const imageBuffer = Buffer.from(base64Image, "base64");

    const fileName = `render_${Date.now()}.png`;
    const filePath = `${organizationId}/${projectId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("renders")
      .upload(filePath, imageBuffer, { contentType: "image/png" });

    if (uploadError) {
      return NextResponse.json(
        { error: "No se pudo guardar el render generado.", detail: uploadError.message },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData?.user?.id ?? null;
    }

    const { data: renderRow, error: insertError } = await supabase
      .from("renders")
      .insert({
        project_id: projectId,
        organization_id: organizationId,
        source_type: sourceType,
        source_document_id: sourceDocumentId ?? null,
        prompt: promptFinal,
        style: style ?? null,
        file_path: filePath,
        status: "completado",
        created_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "El render se generó pero no se pudo registrar.", detail: insertError.message },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage.from("renders").getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      render: renderRow,
      url: publicUrlData.publicUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Error interno generando el render.", detail: err?.message },
      { status: 500 }
    );
  }
}
