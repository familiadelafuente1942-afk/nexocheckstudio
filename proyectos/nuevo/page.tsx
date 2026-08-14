"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";

export default function NuevaObraPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [location, setLocation] = useState("");
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

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("profile_id", user.id)
      .limit(1)
      .single();

    if (!membership) {
      setError("No se encontró tu organización.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("projects").insert({
      organization_id: membership.organization_id,
      name,
      client_name: clientName || null,
      location: location || null,
      created_by: user.id,
    });

    if (insertError) {
      setError("No se pudo crear la obra. Intentá de nuevo.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AppShell>
      <header className="h-16 border-b border-graphite-700 flex items-center px-6">
        <h1 className="font-display text-base text-graphite-100">Nueva obra</h1>
      </header>

      <div className="p-6 max-w-lg">
        <div className="bg-graphite-900 border border-graphite-700 rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-graphite-300 mb-1.5">
                Nombre de la obra
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-graphite-800 border border-graphite-600 rounded-md px-3 py-2 text-sm text-graphite-100 outline-none focus:border-blueprint-500 focus:ring-1 focus:ring-blueprint-500 transition-colors"
                placeholder="Ej: Castores 475"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-graphite-300 mb-1.5">
                Cliente (opcional)
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-graphite-800 border border-graphite-600 rounded-md px-3 py-2 text-sm text-graphite-100 outline-none focus:border-blueprint-500 focus:ring-1 focus:ring-blueprint-500 transition-colors"
                placeholder="Nombre del cliente"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-graphite-300 mb-1.5">
                Ubicación (opcional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-graphite-800 border border-graphite-600 rounded-md px-3 py-2 text-sm text-graphite-100 outline-none focus:border-blueprint-500 focus:ring-1 focus:ring-blueprint-500 transition-colors"
                placeholder="Ej: Zona Sur, Buenos Aires"
              />
            </div>

            {error && (
              <p className="text-signal-critical text-xs font-mono">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blueprint-500 hover:bg-blueprint-400 disabled:opacity-50 text-graphite-950 font-medium text-sm rounded-md px-4 py-2.5 transition-colors"
              >
                {loading ? "Creando..." : "Crear obra"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="text-graphite-400 hover:text-graphite-200 text-sm px-4 py-2.5 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
