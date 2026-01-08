import React from 'react';
import { Activity, Wifi } from 'lucide-react';

const SystemStatus: React.FC = () => {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col items-end gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500 pointer-events-none select-none">
      <div className="flex items-center gap-2">
        <span className="text-primary/80">Gemini 1.5 Flash</span>
        <Activity className="w-3 h-3 text-zinc-600" />
      </div>
      <div className="flex items-center gap-2">
        <span>Latency: 124ms</span>
        <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
      </div>
      <div className="flex items-center gap-2">
        <span>Region: europe-north1</span>
        <Wifi className="w-3 h-3 text-zinc-600" />
      </div>
    </div>
  );
};

export default SystemStatus;