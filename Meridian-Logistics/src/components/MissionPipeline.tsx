import React from 'react';
import {
  Briefcase,
  Cpu,
  Bot,
  Plane,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Airport, MissionContextState, WorkspaceView } from '../types';

interface MissionPipelineProps {
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  mission: MissionContextState;
  airports: Airport[];
}

export const MissionPipeline: React.FC<MissionPipelineProps> = ({
  activeView,
  onSelectView,
  mission,
  airports,
}) => {
  const originHub = airports[mission.originAirportIndex] ?? airports[0];

  const stages: {
    id: WorkspaceView;
    step: string;
    title: string;
    detail: string;
    cleared: boolean;
    hold?: boolean;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'capital',
      step: '01',
      title: 'Capital & Cargo',
      detail: mission.capitalCleared
        ? `${mission.approvedProjectNames.length} items · ₹${mission.projectedValue}L value`
        : 'Pending approval',
      cleared: mission.capitalCleared,
      icon: <Briefcase className="w-3.5 h-3.5" />,
    },
    {
      id: 'pcb',
      step: '02',
      title: 'Avionics QA',
      detail:
        mission.pcbCertified === true
          ? 'Circuit verified'
          : mission.pcbCertified === false
          ? 'Continuity fault'
          : 'Awaiting QA test',
      cleared: mission.pcbCertified === true,
      hold: mission.pcbCertified === false,
      icon: <Cpu className="w-3.5 h-3.5" />,
    },
    {
      id: 'fleet',
      step: '03',
      title: `${originHub.code} Depot Robotics`,
      detail: mission.fleetCleared
        ? `8/8 safe at ${originHub.code}`
        : mission.fleetConflicts > 0
        ? `${mission.fleetConflicts} conflicts`
        : `${mission.fleetPlacedCount}/8 staged`,
      cleared: mission.fleetCleared,
      hold: mission.fleetConflicts > 0,
      icon: <Bot className="w-3.5 h-3.5" />,
    },
    {
      id: 'cargo',
      step: '04',
      title: 'Air Cargo Dispatch',
      detail: mission.cargoCleared
        ? `${mission.cargoOptimalCost} units · ${originHub.code} loop`
        : 'Route pending',
      cleared: mission.cargoCleared,
      icon: <Plane className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="border-b border-white/[0.08] bg-[#0B0E14] px-4 sm:px-6 py-2.5">
      <div className="flex flex-col xl:flex-row xl:items-center gap-2">
        {stages.map((stage, idx) => {
          const isCurrent = activeView === stage.id;
          return (
            <React.Fragment key={stage.id}>
              <button
                onClick={() => onSelectView(stage.id)}
                className={`flex-1 px-3 py-2 rounded-lg border text-left transition-all flex items-center justify-between gap-2 ${
                  isCurrent
                    ? 'bg-sky-500/12 border-sky-400/50 text-white'
                    : stage.hold
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-200 hover:bg-rose-500/15'
                    : stage.cleared
                    ? 'bg-[#111622] border-white/[0.07] hover:border-white/[0.16] text-slate-200'
                    : 'bg-[#090C10] border-white/[0.06] hover:border-white/[0.14] text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                      stage.hold
                        ? 'bg-rose-500/20 text-rose-400'
                        : stage.cleared
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : isCurrent
                        ? 'bg-sky-500/20 text-sky-400'
                        : 'bg-white/[0.06] text-slate-400'
                    }`}
                  >
                    {stage.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <span className="text-slate-500 font-mono text-[11px]">{stage.step}</span>
                      <span className="truncate">{stage.title}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate tabular-nums">
                      {stage.detail}
                    </div>
                  </div>
                </div>

                {stage.hold ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                ) : stage.cleared ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
              </button>

              {idx < stages.length - 1 && (
                <ArrowRight className="hidden xl:block w-3.5 h-3.5 text-slate-600 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
