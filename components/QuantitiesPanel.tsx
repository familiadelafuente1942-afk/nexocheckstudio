"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calculator } from "lucide-react";

type QuantityItem = {
  id: string;
  material: string;
  description: string | null;
  unit: string;
  quantity: number;
  waste_percent: number;
  confidence_score: number;
  source_documents: string | null;
};

function formatNumber(n: number) {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

function confidenceColor(score: number) {
  if (score >= 90) return "text-signal-ok";
  if (score >= 70) return "text-signal-medium";
  return "text-signal-high";
}

export default function QuantitiesPanel({ projectId }: { projectId: string }) {
  const supabase = createClient();
  const [items, setItems] = useState<QuantityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("quantity_items")
        .select("id, material, description, unit, quantity, waste_percent, confidence_score, source_documents")
        .eq("project_id", projectId)
        .order("material", { ascending: true });

      setItems(data ?? []);
      setLoading(false);
    }
    load();
  }, [projectId]);

  if (loading) {
    return <p className="text-graphite-500 text-xs">Cargando cómputo...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="bg-graphite-900 border border-dashed border-graphite-600 rounded-lg p-8 text-center">
        <Calculator className="w-5 h-5 text-graphite-500 mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-graphite-400 text-sm">
          Todavía no hay cómputo calculado. Usá "Calcular cómputo" en Documentación.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-graphite-900 border border-graphite-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-graphite-700 text-left">
              <th className="px-3.5 py-2.5 text-[10px] uppercase tracking-wide text-graphite-500 font-medium">
                Material
              </th>
              <th className="px-3.5 py-2.5 text-[10px] uppercase tracking-wide text-graphite-500 font-medium text-right">
                Cantidad
              </th>
              <th className="px-3.5 py-2.5 text-[10px] uppercase tracking-wide text-graphite-500 font-medium text-right">
                Desperdicio
              </th>
              <th className="px-3.5 py-2.5 text-[10px] uppercase tracking-wide text-graphite-500 font-medium text-right">
                Confianza
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-graphite-800 last:border-0">
                <td className="px-3.5 py-3">
                  <p className="text-graphite-100">{item.material}</p>
                  {item.description && (
                    <p className="text-graphite-500 text-xs mt-0.5">{item.description}</p>
                  )}
                  {item.source_documents && (
                    <p className="text-graphite-600 text-[10px] font-mono mt-0.5">{item.source_documents}</p>
                  )}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-graphite-200 whitespace-nowrap">
                  {formatNumber(item.quantity)} {item.unit}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-graphite-400 whitespace-nowrap">
                  {item.waste_percent}%
                </td>
                <td className={`px-3.5 py-3 text-right font-mono whitespace-nowrap ${confidenceColor(item.confidence_score)}`}>
                  {item.confidence_score}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
