import React from 'react';
import { ShieldCheck, RefreshCw, BarChart3, ArrowLeft } from 'lucide-react';
import { MissionContextState, WorkspaceView } from '../types';

interface EngineDiagnosticsViewProps {
  mission: MissionContextState;
  onSyncMission: () => void;
  onSelectView: (view: WorkspaceView) => void;
}

export const EngineDiagnosticsView: React.FC<EngineDiagnosticsViewProps> = ({
  mission,
  onSyncMission,
  onSelectView,
}) => {
  const efficiencyData = [
    {
      stage: 'Stage 1',
      name: '0/1 Knapsack Branch & Bound (Capital Allocation)',
      explored: mission.capitalExpanded || 10,
      pruned: mission.capitalPruned || 14,
      view: 'capital' as WorkspaceView,
    },
    {
      stage: 'Stage 2',
      name: 'Hamiltonian Cycle Backtracking (Avionics PCB)',
      explored: mission.pcbExplored || 24,
      pruned: mission.pcbRejected || 18,
      view: 'pcb' as WorkspaceView,
    },
    {
      stage: 'Stage 3',
      name: '8-Queens Backtracking (Hub Floor Robot Staging)',
      explored: mission.fleetExplored || 2056,
      pruned: mission.fleetRejected || 1964,
      view: 'fleet' as WorkspaceView,
    },
    {
      stage: 'Stage 4',
      name: 'Branch & Bound TSP (Air Cargo Dispatch)',
      explored: mission.cargoExpanded || 16,
      pruned: mission.cargoPruned || 22,
      view: 'cargo' as WorkspaceView,
    },
  ];

  const comparisonRows = [
    {
      stage: 'Stage 1',
      algorithm: '0/1 Knapsack',
      purpose: 'Mission R&D & Payload Portfolio Selection',
      paradigm: 'Branch & Bound (Best-First Max-PQ)',
      pruning: 'Fractional Knapsack Upper Bound ≤ current best profit',
      time: 'O(2ⁿ) worst-case + O(n log n)',
      space: 'O(2ⁿ) queue storage',
      color: 'text-amber-400',
    },
    {
      stage: 'Stage 2',
      algorithm: 'Hamiltonian Cycle',
      purpose: 'Avionics PCB Non-Overlapping Serial Bus QA',
      paradigm: 'Recursive Backtracking (DFS)',
      pruning: 'Missing copper trace edge or duplicate IC module visit',
      time: 'O(V!) worst-case',
      space: 'O(V) recursion stack',
      color: 'text-emerald-400',
    },
    {
      stage: 'Stage 3',
      algorithm: '8-Queens Placement',
      purpose: 'Origin Hub Warehouse Robot Collision Avoidance',
      paradigm: 'Recursive Backtracking (DFS)',
      pruning: 'Row, column, diagonal & maintenance obstacle checks',
      time: 'O(N!) worst-case',
      space: 'O(N) auxiliary board',
      color: 'text-cyan-400',
    },
    {
      stage: 'Stage 4',
      algorithm: 'Traveling Salesperson (TSP)',
      purpose: 'Multi-Hub Air Cargo Dispatch Minimization',
      paradigm: 'Branch & Bound (Best-First Min-PQ)',
      pruning: 'Admissible Prim MST Lower Bound ≥ current incumbent cost',
      time: 'O(n!) worst-case',
      space: 'O(n!) queue storage',
      color: 'text-blue-400',
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono font-semibold text-emerald-400">
              ADMINISTRATOR SYSTEM DIAGNOSTICS
            </div>
            <h1 className="text-xl font-bold text-white">
              Optimization Engines Telemetry &amp; Complexity Architecture
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectView('mission-control')}
            className="px-3 py-2 rounded-lg bg-[#0F1623] hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Mission Control</span>
          </button>
          <button
            onClick={onSyncMission}
            className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-Evaluate All Solvers</span>
          </button>
        </div>
      </div>

      {/* State-Space Search Pruning Efficiency */}
      <div className="p-5 rounded-xl bg-[#0F1623] border border-emerald-900/50 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800 text-xs">
          <span className="font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            State-Space Tree Pruning Ratio (Explored vs. Pruned / Rejected Nodes)
          </span>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500" /> Explored
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> Pruned / Rejected
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {efficiencyData.map((item) => {
            const total = Math.max(1, item.explored + item.pruned);
            const exploredPct = Math.round((item.explored / total) * 100);
            const prunedPct = 100 - exploredPct;
            return (
              <div key={item.name} className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => onSelectView(item.view)}
                    className="font-semibold text-slate-200 hover:text-cyan-300 transition-colors text-left"
                  >
                    <span className="font-mono text-slate-500 mr-2">{item.stage}</span>
                    {item.name}
                  </button>
                  <span className="font-mono text-slate-400 tabular-nums">
                    {item.pruned} Pruned ({prunedPct}%) · {item.explored} Explored
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden flex border border-slate-800">
                  <div className="h-full bg-cyan-500" style={{ width: `${exploredPct}%` }} />
                  <div className="h-full bg-rose-500" style={{ width: `${prunedPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Algorithmic Complexity Matrix */}
      <div className="rounded-xl border border-slate-800 bg-[#0F1623] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 text-xs font-semibold text-white">
          Mission Pipeline Algorithm Comparison Matrix
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090D16] text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Algorithm Engine</th>
                <th className="py-3 px-4">Mission Role</th>
                <th className="py-3 px-4">Search Paradigm</th>
                <th className="py-3 px-4">Pruning Mechanism</th>
                <th className="py-3 px-4 text-rose-400">Time Complexity</th>
                <th className="py-3 px-4 text-cyan-400">Space Complexity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {comparisonRows.map((row) => (
                <tr key={row.algorithm} className="hover:bg-slate-900/40">
                  <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                    {row.stage}
                  </td>
                  <td className={`py-3 px-4 font-bold ${row.color} whitespace-nowrap`}>
                    {row.algorithm}
                  </td>
                  <td className="py-3 px-4 text-slate-200">{row.purpose}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                    {row.paradigm}
                  </td>
                  <td className="py-3 px-4 text-slate-300">{row.pruning}</td>
                  <td className="py-3 px-4 font-mono font-bold text-rose-300 whitespace-nowrap">
                    {row.time}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-cyan-300 whitespace-nowrap">
                    {row.space}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
