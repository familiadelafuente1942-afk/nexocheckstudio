export default function KpiCard({ label, value, unit }: { label: string; value: string | number; unit?: string; }) {
  return (
    <div className="bg-graphite-900 border border-graphite-700 rounded-lg p-4">
      <p className="text-[11px] uppercase tracking-wide text-graphite-400 font-medium mb-2">{label}</p>
      <p className="font-mono text-2xl text-graphite-100">
        {value}{unit && <span className="text-sm text-graphite-400 ml-1">{unit}</span>}
      </p>
    </div>
  );
}
