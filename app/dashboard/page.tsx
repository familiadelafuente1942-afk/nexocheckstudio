              {projects.map((p) => (
                <div
                  key={p.id}
                  className="bg-graphite-900 border border-graphite-700 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-graphite-100 text-sm font-medium">{p.name}</p>
                    <p className="text-graphite-400 text-xs mt-0.5">
                      {p.client_name || "Sin cliente asignado"}
                      {p.location ? ` · ${p.location}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono uppercase text-blueprint-400 border border-blueprint-500/30 bg-blueprint-500/10 px-2 py-1 rounded-sm">
                    {p.status}
                  </span>
                </div>
              ))}
