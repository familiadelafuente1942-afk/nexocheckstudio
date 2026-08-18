import { NextRequest, NextResponse } from "next/server";

// Endpoint: POST /api/convertir-cad
// Recibe un archivo DWG/DXF (multipart/form-data, campo "file")
// Lo convierte a PDF usando CloudConvert y devuelve el PDF resultante
// para que el frontend lo reinyecte en el mismo flujo de subida/análisis
// que ya se usa para documentos PDF normales.

const CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT_API_KEY;
const CLOUDCONVERT_BASE = "https://api.cloudconvert.com/v2";

export async function POST(req: NextRequest) {
  try {
    if (!CLOUDCONVERT_API_KEY) {
      return NextResponse.json(
        { error: "CLOUDCONVERT_API_KEY no configurada en el servidor." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo." },
        { status: 400 }
      );
    }

    const fileName = file.name || "archivo.dwg";
    const ext = fileName.split(".").pop()?.toLowerCase();

    if (ext !== "dwg" && ext !== "dxf") {
      return NextResponse.json(
        { error: "Solo se aceptan archivos .dwg o .dxf" },
        { status: 400 }
      );
    }

    const jobRes = await fetch(`${CLOUDCONVERT_BASE}/jobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDCONVERT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          "import-file": {
            operation: "import/upload",
          },
          "convert-file": {
            operation: "convert",
            input: "import-file",
            input_format: ext,
            output_format: "pdf",
          },
          "export-file": {
            operation: "export/url",
            input: "convert-file",
          },
        },
      }),
    });

    if (!jobRes.ok) {
      const errText = await jobRes.text();
      return NextResponse.json(
        { error: "Error creando job en CloudConvert", detail: errText },
        { status: 502 }
      );
    }

    const job = await jobRes.json();
    const importTask = job.data.tasks.find(
      (t: any) => t.name === "import-file"
    );
    const uploadUrl = importTask.result.form.url;
    const uploadParams = importTask.result.form.parameters;

    const uploadForm = new FormData();
    Object.entries(uploadParams).forEach(([key, value]) => {
      uploadForm.append(key, value as string);
    });
    uploadForm.append("file", file, fileName);

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return NextResponse.json(
        { error: "Error subiendo archivo a CloudConvert", detail: errText },
        { status: 502 }
      );
    }

    const jobId = job.data.id;
    let finished = false;
    let attempts = 0;
    let exportUrl: string | null = null;

    while (!finished && attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;

      const statusRes = await fetch(`${CLOUDCONVERT_BASE}/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${CLOUDCONVERT_API_KEY}` },
      });
      const statusData = await statusRes.json();

      if (statusData.data.status === "error") {
        const failedTask = statusData.data.tasks.find(
          (t: any) => t.status === "error"
        );
        return NextResponse.json(
          {
            error: "CloudConvert no pudo convertir el archivo.",
            detail: failedTask?.message || "Error desconocido",
          },
          { status: 502 }
        );
      }

      if (statusData.data.status === "finished") {
        finished = true;
        const exportTask = statusData.data.tasks.find(
          (t: any) => t.name === "export-file"
        );
        exportUrl = exportTask?.result?.files?.[0]?.url;
      }
    }

    if (!finished || !exportUrl) {
      return NextResponse.json(
        { error: "Tiempo de espera agotado esperando la conversión." },
        { status: 504 }
      );
    }

    const pdfRes = await fetch(exportUrl);
    const pdfBuffer = await pdfRes.arrayBuffer();
    const newFileName = fileName.replace(/\.(dwg|dxf)$/i, ".pdf");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${newFileName}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Error interno en la conversión CAD.", detail: err?.message },
      { status: 500 }
    );
  }
}
