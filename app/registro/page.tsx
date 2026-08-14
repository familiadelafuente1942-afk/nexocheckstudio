"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ScanLine } from "lucide-react";

export default function RegistroPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setCheckEmail(true);
    setLoading(false);
  }

  if (checkEmail) {
    return (
      <main className="min-h-screen bg-graphite-950 bg-grid flex items-center justify-center px-6">
        <div className="w-full max-w-sm bg-graphite-900 border border-graphite-700 rounded-lg p-8 text-center">
          <h1 className="font-display text-xl text-graphite-100 mb-2">
            Confirmá tu correo
          </h1>
          <p className="text-graphite-400 text-sm">
            Te enviamos un enlace de confirmación a <span className="text-graphite-200">{email}</span>.
            Una vez confirmado, iniciá sesión.
          </p>
          <Link
            href="/login"
            className="inline-block mt-6 text-blueprint-400 hover:text-blueprint-300 text-sm"
          >
            Ir a iniciar sesión →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-graphite-950 bg-grid flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10 justify-center">
          <ScanLine className="w-5 h-5 text-blueprint-400" strokeWidth={1.5} />
          <span className="font-display text-lg tracking-tight text-graphite-100">
            NEXOCHECKSTUDIO
          </span>
        </div>

        <div className="bg-graphite-900 border border-graphite-700 rounded-lg p-8">
          <h1 className="font-display text-xl text-graphite-100 mb-1">Crear cuenta</h1>
          <p className="text-graphite-400 text-sm mb-6">
            Empezá a auditar tus proyectos con IA.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-graphite-300 mb-1.5">
                Nombre completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-graphite-800 border border-graphite-600 rounded-md px-3 py-2 text-sm text-graphite-100 outline-none focus:border-blueprint-500 focus:ring-1 focus:ring-blueprint-500 transition-colors"
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-graphite-300 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-graphite-800 border border-graphite-600 rounded-md px-3 py-2 text-sm text-graphite-100 outline-none focus:border-blueprint-500 focus:ring-1 focus:ring-blueprint-500 transition-colors"
                placeholder="vos@empresa.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-graphite-300 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-graphite-800 border border-graphite-600 rounded-md px-3 py-2 text-sm text-graphite-100 outline-none focus:border-blueprint-500 focus:ring-1 focus:ring-blueprint-500 transition-colors"
                placeholder="Mínimo 6 caracteres"
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
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>
        </div>

        <p className="text-center text-graphite-400 text-sm mt-6">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-blueprint-400 hover:text-blueprint-300">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
