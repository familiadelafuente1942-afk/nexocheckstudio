"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Building2 } from "lucide-react";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name, slug, created_by: user.id })
      .select()
      .single();

    if (orgError || !org) {
      setError("No se pudo crear la organización. Intentá de nuevo.");
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabase.from("organization_members").insert({
      organization_id: org.id,
      profile_id: user.id,
      role: "ORGANIZATION_ADMIN",
    });

    if (memberError) {
      setError("La organización se creó pero hubo un error al asignarte como admin.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-graphite-950 bg-grid flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Building2 className="w-5 h-5 text-blueprint-400" strokeWidth={1.5} />
          <span className="font-display text-lg tracking-tight text-graphite-100">
            Creá tu organización
          </span>
        </div>

        <div className="bg-graphite-900 border border-graphite-700 rounded-lg p-8">
          <p className="text-graphite-400 text-sm mb-6">
            Es el espacio de trabajo donde vas a cargar tus obras y documentación.
            Podés invitar a tu equipo después.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-graphite-300 mb-1.5">
                Nombre de la organización
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-graphite-800 border border-graphite-600 rounded-md px-3 py-2 text-sm text-graphite-100 outline-none focus:border-blueprint-500 focus:ring-1 focus:ring-blueprint-500 transition-colors"
                placeholder="Ej: V+V Construcciones"
              />
            </div>

            {error && (
              <p className="text-signal-critical text-xs font-mono">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blueprint-500 hover:bg-blueprint-400 disabled:opacity-50 text-graphite-950 font-medium text-sm rounded-md py-2.5 transition-colors"
            >
              {loading ? "Creando..." : "Crear organización"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
