"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-graphite-950 flex">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0">
        <div className="md:hidden h-12 flex items-center px-4 border-b border-graphite-700 bg-graphite-900">
          <button onClick={() => setMobileOpen(true)} className="text-graphite-300 hover:text-graphite-100 p-1">
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
