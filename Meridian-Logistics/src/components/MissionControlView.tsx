import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Cpu,
  Bot,
  Plane,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Lock,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Airport,
  MissionContextState,
  MissionScenarioId,
  WorkspaceView,
} from '../types';

interface MissionControlViewProps {
  mission: MissionContextState;
  airports: Airport[];
  isAdmin: boolean;
  onSelectView: (view: WorkspaceView) => void;
  onOriginChange: (index: number) => void;
  onSelectScenario: (scenario: MissionScenarioId) => void;
  onQuickBudgetChange: (budget: number) => void;
  onQuickTogglePcbFault: () => void;
  onQuickToggleObstacles: () => void;
  onRequestAdmin: () => void;
}

const PCB_COORDS = [
  { x: 90, y: 20, label: 'A' },
  { x: 148, y: 46, label: 'B' },
  { x: 148, y: 104, label: 'C' },
  { x: 90, y: 130, label: 'D' },
  { x: 32, y: 104, label: 'E' },
  { x: 32, y: 46, label: 'F' },
];

const TOUR_STEPS: {
  stageNum: number;
  view: WorkspaceView;
  title: string;
  headline: string;
  explanation: string;
}[] = [
  {
    stageNum: 1,
    view: 'capital',
    title: 'Step 1 · Fund the Mission Equipment',
    headline: 'Select high-value cargo & robotics upgrades without exceeding the budget ceiling.',
    explanation:
      'Before anything launches, Finance locks which R&D hardware modules (Rover, LiDAR, Co-Processor, Drone Arm) fit into the mission budget to maximize total operating value.',
  },
  {
    stageNum: 2,
    view: 'pcb',
    title: 'Step 2 · Certify Avionics Circuit Continuity',
    headline: 'Ensure a continuous, non-overlapping signal path across all 6 controller chips.',
    explanation:
      'Engineering verifies that the flight controller PCB connects all 6 modules in a clean closed loop back to power. If any copper link fails, departure enters Hold automatically.',
  },
  {
    stageNum: 3,
    view: 'fleet',
    title: 'Step 3 · Stage Robots Collision-Free at Origin Hub',
    headline: 'Place 8 autonomous loaders on the apron grid while avoiding maintenance bays.',
    explanation:
      'At the chosen departure airport, 8 cargo-loading robots are positioned so none share a row, column, or diagonal line-of-sight—preventing LiDAR cross-interference.',
  },
  {
    stageNum: 4,
    view: 'cargo',
    title: 'Step 4 · Dispatch the Minimum-Cost Freight Loop',
    headline: 'Visit all 5 regional hubs and return to base along the lowest-tariff route.',
    explanation:
      'Once cargo is funded, certified, and loaded, Dispatch sends the freighter from the exact same origin hub across HYD, BOM, DEL, BLR, and MAA with minimal fuel cost.',
  },
];

export const MissionControlView: React.FC<MissionControlViewProps> = ({
  mission,
  airports,
  isAdmin,
  onSelectView,
  onOriginChange,
  onSelectScenario,
  onQuickBudgetChange,
  onQuickTogglePcbFault,
  onQuickToggleObstacles,
  onRequestAdmin,
}) => {
  const [tourStep, setTourStep] = useState<number>(0);
  const [isAutoTour, setIsAutoTour] = useState<boolean>(false);

  useEffect(() => {
    if (!isAutoTour) return;
    const id = window.setInterval(() => {
      setTourStep((prev) => (prev + 1) % TOUR_STEPS.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [isAutoTour]);

  const originHub = airports[mission.originAirportIndex] ?? airports[0];
  const clearedCount = [
    mission.capitalCleared,
    mission.pcbCertified === true,
    mission.fleetCleared,
    mission.cargoCleared,
  ].filter(Boolean).length;

  const hasHold = mission.pcbCertified === false || mission.fleetConflicts > 0;
  const cargoCost = mission.cargoOptimalCost ?? 0;
  const netMissionContribution = Math.max(0, mission.projectedValue - cargoCost);
  const cargoSavings =
    mission.cargoBaselineCost !== null && mission.cargoOptimalCost !== null
      ? Math.max(0, mission.cargoBaselineCost - mission.cargoOptimalCost)
      : 0;

  const activeTour = TOUR_STEPS[tourStep];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Top Hero Operational Summary + Interactive Scenario Presets */}
      <div className="p-5 sm:p-6 rounded-xl bg-[#10141C] border border-white/[0.08] space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-sky-400">Meridian Logistics Operations</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-300">{mission.missionCode}</span>
              <span aria-hidden="true">·</span>
              <span>
                Origin Base: <strong className="text-white">{originHub.code}</strong> ({originHub.name.replace(' Airport', '')})
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              National Robotics &amp; Air Cargo Mission Control
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
              Four live operational modules working toward one goal: fund hardware upgrades, certify the flight controller board, stage depot loaders at {originHub.code}, and dispatch the cargo aircraft across 5 hubs.
            </p>
          </div>

          {/* Live Release Readiness Summary */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-lg bg-[#090C10] border border-white/[0.08]">
              <div className="text-[11px] text-slate-400">Net Mission Value</div>
              <div className="font-mono text-xl font-bold text-emerald-400 tabular-nums">
                ₹{netMissionContribution}L
              </div>
            </div>

            <div
              className={`px-4 py-2.5 rounded-lg border flex items-center gap-2.5 ${
                hasHold
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                  : clearedCount === 4
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
              }`}
            >
              {hasHold ? (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : clearedCount === 4 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <Clock className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <div>
                <div className="text-[11px] opacity-80">Release Gate</div>
                <div className="text-sm font-bold whitespace-nowrap">
                  {hasHold
                    ? 'Operational Hold'
                    : clearedCount === 4
                    ? 'Ready for Takeoff'
                    : `${clearedCount}/4 Cleared`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* One-Click Interactive Demo Scenarios */}
        <div className="pt-4 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-medium text-slate-300">Test Live Scenarios:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'standard', label: 'Normal Launch (HYD)' },
                { id: 'tight-budget', label: 'Tight Budget (₹8L)' },
                { id: 'pcb-fault', label: 'Avionics Fault Hold' },
                { id: 'blocked-apron', label: 'Blocked Apron Bays' },
              ] as { id: MissionScenarioId; label: string }[]
            ).map((preset) => {
              const isSelected = mission.activeScenario === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => onSelectScenario(preset.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    isSelected
                      ? 'bg-sky-500 text-slate-950 border-sky-400 font-semibold'
                      : 'bg-[#090C10] hover:bg-[#161C28] text-slate-300 border-white/[0.08]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Guided Walkthrough Bar (Makes Explaining Effortless) */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#10141C] border border-sky-500/25 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
            <span>{activeTour.title}</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-400 font-normal">
              Interactive Walkthrough ({tourStep + 1} of 4)
            </span>
          </div>
          <div className="text-sm sm:text-base font-bold text-white">{activeTour.headline}</div>
          <p className="text-xs text-slate-400 leading-relaxed">{activeTour.explanation}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setTourStep((prev) => (prev - 1 + 4) % 4)}
            className="px-2.5 py-2 rounded-lg bg-[#090C10] hover:bg-[#171E2C] border border-white/[0.08] text-xs font-medium text-slate-300 flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <button
            onClick={() => setIsAutoTour(!isAutoTour)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
              isAutoTour
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-[#090C10] hover:bg-[#171E2C] border-white/[0.08] text-slate-200'
            }`}
          >
            {isAutoTour ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoTour ? 'Pause Tour' : 'Auto Tour'}</span>
          </button>

          <button
            onClick={() => setTourStep((prev) => (prev + 1) % 4)}
            className="px-2.5 py-2 rounded-lg bg-[#090C10] hover:bg-[#171E2C] border border-white/[0.08] text-xs font-medium text-slate-300 flex items-center gap-1 transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onSelectView(activeTour.view)}
            className="px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>Inspect Stage {activeTour.stageNum}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 Live Interactive Stage Preview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* STAGE 1 CARD: Interactive Budget Slider + Funded Modules */}
        <div
          className={`p-5 rounded-xl bg-[#10141C] border transition-colors flex flex-col justify-between gap-4 ${
            tourStep === 0 ? 'border-sky-400/60' : 'border-white/[0.08]'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/12 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-mono text-amber-400 font-semibold">
                    01 · CAPITAL &amp; PAYLOAD FUNDING
                  </div>
                  <h2 className="font-display text-base font-bold text-white">
                    Budget Allocation Slate
                  </h2>
                </div>
              </div>
              <span
                className={`text-xs font-mono font-semibold ${
                  mission.capitalCleared ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {mission.capitalCleared ? 'Funded' : 'Pending'}
              </span>
            </div>

            {/* Live Budget Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Adjust Mission Budget Cap:</span>
                <span className="font-mono font-bold text-amber-300 tabular-nums">
                  ₹{mission.capitalBudget} Lakhs
                </span>
              </div>
              <input
                type="range"
                min="6"
                max="20"
                step="1"
                value={mission.capitalBudget}
                onChange={(e) => onQuickBudgetChange(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
                aria-label="Quick Mission Budget Slider"
              />
            </div>

            {/* Budget Bar + Funded Metrics */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono tabular-nums">
                <span className="text-slate-300">
                  Spent: ₹{mission.capitalInvested}L / ₹{mission.capitalBudget}L
                </span>
                <span className="text-emerald-400 font-semibold">
                  Value: ₹{mission.projectedValue}L
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#090C10] overflow-hidden border border-white/[0.06]">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((mission.capitalInvested / mission.capitalBudget) * 100)
                    )}%`,
                  }}
                />
              </div>
              <div className="text-xs text-slate-400 truncate">
                Approved:{' '}
                <span className="text-slate-200 font-medium">
                  {mission.approvedProjectNames.length > 0
                    ? mission.approvedProjectNames.join(', ')
                    : 'None within cap'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectView('capital')}
            className="w-full py-2 px-3.5 rounded-lg bg-[#161C28] hover:bg-[#1E2636] border border-white/[0.06] text-xs font-semibold text-white flex items-center justify-between transition-colors"
          >
            <span>Open Full Capital Planner</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>

        {/* STAGE 2 CARD: Live Mini 6-Node Avionics Ring + Quick Fault Switch */}
        <div
          className={`p-5 rounded-xl bg-[#10141C] border transition-colors flex flex-col justify-between gap-4 ${
            tourStep === 1 ? 'border-sky-400/60' : 'border-white/[0.08]'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/12 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-mono text-emerald-400 font-semibold">
                    02 · AVIONICS HARDWARE QA
                  </div>
                  <h2 className="font-display text-base font-bold text-white">
                    Flight Controller PCB Bus
                  </h2>
                </div>
              </div>
              <button
                onClick={onQuickTogglePcbFault}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
                  mission.pcbCertified
                    ? 'bg-[#090C10] hover:bg-rose-500/15 text-slate-300 hover:text-rose-300 border-white/[0.08]'
                    : 'bg-emerald-500 text-slate-950 border-emerald-400'
                }`}
              >
                {mission.pcbCertified ? 'Test Fault' : 'Repair Bus'}
              </button>
            </div>

            <div className="flex items-center gap-4">
              {/* Live Mini SVG of PCB Loop */}
              <svg
                viewBox="0 0 180 150"
                className="w-40 h-32 shrink-0 rounded-lg bg-[#090C10] border border-white/[0.06]"
              >
                {PCB_COORDS.map((from, i) =>
                  PCB_COORDS.map((to, j) => {
                    if (i >= j || !mission.pcbMatrix[i]?.[j]) return null;
                    let onCycle = false;
                    for (let k = 0; k < mission.pcbPathIndices.length - 1; k++) {
                      if (
                        (mission.pcbPathIndices[k] === i && mission.pcbPathIndices[k + 1] === j) ||
                        (mission.pcbPathIndices[k] === j && mission.pcbPathIndices[k + 1] === i)
                      ) {
                        onCycle = true;
                        break;
                      }
                    }
                    return (
                      <line
                        key={`mini-pcb-${i}-${j}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={onCycle && mission.pcbCertified ? '#10B981' : '#334155'}
                        strokeWidth={onCycle && mission.pcbCertified ? 2.5 : 1}
                      />
                    );
                  })
                )}
                {PCB_COORDS.map((pt, idx) => (
                  <g key={`mini-node-${pt.label}`}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="9"
                      fill="#111622"
                      stroke={mission.pcbCertified ? '#10B981' : idx >= 3 ? '#F43F5E' : '#38BDF8'}
                      strokeWidth="1.5"
                    />
                    <text
                      x={pt.x}
                      y={pt.y + 3}
                      textAnchor="middle"
                      fill="#F8FAFC"
                      fontSize="8"
                      className="font-mono font-bold"
                    >
                      {pt.label}
                    </text>
                  </g>
                ))}
              </svg>

              <div className="space-y-1.5 text-xs min-w-0">
                <div
                  className={`font-semibold ${
                    mission.pcbCertified ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {mission.pcbCertified ? 'Closed Loop Verified' : 'Signal Break Detected'}
                </div>
                <div className="font-mono text-[11px] text-slate-300 truncate">
                  {mission.pcbSequence}
                </div>
                <div className="text-[11px] text-slate-400">
                  {mission.pcbActiveLinks} active interconnects across 6 board chips.
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectView('pcb')}
            className="w-full py-2 px-3.5 rounded-lg bg-[#161C28] hover:bg-[#1E2636] border border-white/[0.06] text-xs font-semibold text-white flex items-center justify-between transition-colors"
          >
            <span>Open Full Avionics Inspector</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>

        {/* STAGE 3 CARD: Live Mini 8x8 Robot Grid at Origin Hub */}
        <div
          className={`p-5 rounded-xl bg-[#10141C] border transition-colors flex flex-col justify-between gap-4 ${
            tourStep === 2 ? 'border-sky-400/60' : 'border-white/[0.08]'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/12 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-mono text-sky-400 font-semibold">
                    03 · {originHub.code} DEPOT FLOOR STAGING
                  </div>
                  <h2 className="font-display text-base font-bold text-white">
                    8-Unit Robot Apron Grid
                  </h2>
                </div>
              </div>

              <button
                onClick={onQuickToggleObstacles}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#090C10] hover:bg-[#171E2C] text-slate-300 border border-white/[0.08] transition-colors"
              >
                {mission.fleetObstaclesCount > 0 ? 'Clear Obstacles' : 'Add 3 Obstacles'}
              </button>
            </div>

            <div className="flex items-center gap-4">
              {/* Mini 8x8 Live Apron Visual */}
              <div className="w-32 h-32 shrink-0 p-1.5 rounded-lg bg-[#090C10] border border-white/[0.06] grid grid-cols-8 gap-0.5">
                {Array.from({ length: 64 }).map((_, cellIdx) => {
                  const r = Math.floor(cellIdx / 8);
                  const c = cellIdx % 8;
                  const hasRobot = mission.fleetBoard[r] === c;
                  const isObstacle = mission.fleetObstacleKeys.includes(`${r},${c}`);
                  return (
                    <div
                      key={`mini-grid-${r}-${c}`}
                      className={`rounded-[2px] ${
                        isObstacle
                          ? 'bg-amber-500'
                          : hasRobot
                          ? 'bg-sky-400'
                          : (r + c) % 2 === 1
                          ? 'bg-[#121722]'
                          : 'bg-[#181F2D]'
                      }`}
                    />
                  );
                })}
              </div>

              <div className="space-y-1.5 text-xs min-w-0">
                <div className="font-semibold text-white">
                  {mission.fleetPlacedCount}/8 Loaders Safe at {originHub.code}
                </div>
                <div className="font-mono text-[11px] text-sky-300 truncate tabular-nums">
                  {mission.fleetCoordinates.filter((c) => c !== '—').join(' · ') || 'None'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {mission.fleetObstaclesCount} blocked maintenance bays avoided cleanly.
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectView('fleet')}
            className="w-full py-2 px-3.5 rounded-lg bg-[#161C28] hover:bg-[#1E2636] border border-white/[0.06] text-xs font-semibold text-white flex items-center justify-between transition-colors"
          >
            <span>Open Full Depot Floor Grid</span>
            <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
          </button>
        </div>

        {/* STAGE 4 CARD: Live Mini 5-Hub Cargo Map + Hub Selector */}
        <div
          className={`p-5 rounded-xl bg-[#10141C] border transition-colors flex flex-col justify-between gap-4 ${
            tourStep === 3 ? 'border-sky-400/60' : 'border-white/[0.08]'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/12 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Plane className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-mono text-blue-400 font-semibold">
                    04 · AIR CARGO DISPATCH
                  </div>
                  <h2 className="font-display text-base font-bold text-white">
                    5-Hub Return Flight Loop
                  </h2>
                </div>
              </div>

              <select
                value={mission.originAirportIndex}
                onChange={(e) => onOriginChange(Number(e.target.value))}
                className="px-2.5 py-1 rounded-md bg-[#090C10] border border-white/[0.08] text-xs font-mono font-semibold text-white cursor-pointer focus:outline-none"
                aria-label="Origin Hub Selector"
              >
                {airports.map((a, idx) => (
                  <option key={a.id} value={idx} className="bg-[#10141C]">
                    Origin: {a.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4">
              {/* Live Mini 5-Airport Route SVG */}
              <svg
                viewBox="80 50 200 300"
                className="w-32 h-32 shrink-0 rounded-lg bg-[#090C10] border border-white/[0.06]"
              >
                {mission.cargoPathIndices.slice(0, -1).map((fromIdx, leg) => {
                  const toIdx = mission.cargoPathIndices[leg + 1];
                  const from = airports[fromIdx];
                  const to = airports[toIdx];
                  if (!from || !to) return null;
                  return (
                    <line
                      key={`mini-leg-${leg}`}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="#10B981"
                      strokeWidth="3.5"
                    />
                  );
                })}
                {airports.map((ap, idx) => {
                  const isOrig = idx === mission.originAirportIndex;
                  return (
                    <g key={`mini-ap-${ap.code}`}>
                      <circle
                        cx={ap.x}
                        cy={ap.y}
                        r={isOrig ? 11 : 7}
                        fill="#10141C"
                        stroke={isOrig ? '#38BDF8' : '#10B981'}
                        strokeWidth={isOrig ? 3 : 2}
                      />
                      <text
                        x={ap.x + 13}
                        y={ap.y + 3}
                        fill="#CBD5E1"
                        fontSize="12"
                        className="font-mono font-bold"
                      >
                        {ap.code}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="space-y-1.5 text-xs min-w-0">
                <div className="font-mono font-bold text-emerald-400 text-base tabular-nums">
                  {mission.cargoOptimalCost !== null ? `${mission.cargoOptimalCost} Cost Units` : '—'}
                </div>
                <div className="font-mono text-[11px] text-slate-200 truncate">
                  {mission.cargoRouteCodes.join(' → ')}
                </div>
                <div className="text-[11px] text-slate-400">
                  {cargoSavings > 0
                    ? `Saves ${cargoSavings} cost units compared to sequential loop.`
                    : 'Departs and returns to selected origin base.'}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectView('cargo')}
            className="w-full py-2 px-3.5 rounded-lg bg-[#161C28] hover:bg-[#1E2636] border border-white/[0.06] text-xs font-semibold text-white flex items-center justify-between transition-colors"
          >
            <span>Open Full Route Scheduler</span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
          </button>
        </div>
      </div>

      {/* Role Notice for Non-Admins vs Quick Jump for Admins */}
      {isAdmin ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-emerald-300">
                Administrator Solver Mode Active
              </div>
              <div className="text-xs text-slate-400">
                Slow-motion step-by-step solver playback, search pruning logs, and complexity comparison tables are unlocked across every stage.
              </div>
            </div>
          </div>
          <button
            onClick={() => onSelectView('engine-diagnostics')}
            className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors"
          >
            Open Engine Diagnostics
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-[#10141C] border border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              Technical solver diagnostics and step-by-step playback controls require System Administrator sign-in.
            </span>
          </div>
          <button
            onClick={onRequestAdmin}
            className="px-3.5 py-1.5 rounded-lg bg-[#161C28] hover:bg-[#1E2636] border border-white/[0.08] text-xs font-semibold text-sky-300 transition-colors"
          >
            Admin Sign In
          </button>
        </div>
      )}
    </div>
  );
};
