import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Plane,
  TrendingDown,
  Info,
  Edit3,
  Lock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import {
  DEFAULT_AIRPORTS,
  DEFAULT_TSP_MATRIX,
  solveTSPBranchAndBound,
} from '../algorithms/tspBranchAndBound';
import { Airport, TSPStep, WorkspaceView } from '../types';

interface TSPSimulatorProps {
  isAdmin: boolean;
  onRequestAdmin: () => void;
  onSelectView: (view: WorkspaceView) => void;
  originAirportIndex: number;
  airports: Airport[];
  onOriginChange: (index: number) => void;
  syncToken: number;
  onUpdateStage: (stats: {
    optimalCost: number | null;
    baselineCost: number | null;
    pathIndices: number[];
    routeCodes: string[];
    expanded: number;
    pruned: number;
    cleared: boolean;
  }) => void;
}

export const TSPSimulator: React.FC<TSPSimulatorProps> = ({
  isAdmin,
  onRequestAdmin,
  onSelectView,
  originAirportIndex,
  airports = DEFAULT_AIRPORTS,
  onOriginChange,
  syncToken,
  onUpdateStage,
}) => {
  const [costMatrix, setCostMatrix] = useState<number[][]>(DEFAULT_TSP_MATRIX);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1200);
  const [steps, setSteps] = useState<TSPStep[]>([]);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [optimalCost, setOptimalCost] = useState<number | null>(() => {
    return solveTSPBranchAndBound(DEFAULT_TSP_MATRIX, originAirportIndex, airports).optimalCost;
  });
  const [optimalPath, setOptimalPath] = useState<number[]>(() => {
    return solveTSPBranchAndBound(DEFAULT_TSP_MATRIX, originAirportIndex, airports).optimalPath;
  });
  const [baselineCost, setBaselineCost] = useState<number | null>(() => {
    return solveTSPBranchAndBound(DEFAULT_TSP_MATRIX, originAirportIndex, airports).baselineCost;
  });
  const [expandedNodes, setExpandedNodes] = useState<number>(() => {
    return solveTSPBranchAndBound(DEFAULT_TSP_MATRIX, originAirportIndex, airports).expandedNodes;
  });
  const [prunedNodes, setPrunedNodes] = useState<number>(() => {
    return solveTSPBranchAndBound(DEFAULT_TSP_MATRIX, originAirportIndex, airports).prunedNodes;
  });
  const [statusMessage, setStatusMessage] = useState<string>(
    'Freighter route scheduled across all 5 metropolitan hubs. Adjust origin hub or corridor tariffs to re-optimize.'
  );
  const [editMatrixMode, setEditMatrixMode] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  const originHub = airports[originAirportIndex] ?? airports[0];

  // Auto-recompute tour cleanly whenever originAirportIndex changes or full sync runs
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsSolving(false);
    setIsPaused(false);
    setSteps([]);
    setStepIndex(0);
    const result = solveTSPBranchAndBound(costMatrix, originAirportIndex, airports);
    const routeCodes = result.optimalPath.map((idx) => airports[idx].code);
    setOptimalCost(result.optimalCost);
    setOptimalPath(result.optimalPath);
    setBaselineCost(result.baselineCost);
    setExpandedNodes(result.expandedNodes);
    setPrunedNodes(result.prunedNodes);
    setStatusMessage(
      `Freight route synced for ${originHub.code}: ${routeCodes.join(' → ')} (${result.optimalCost} Cost Units).`
    );
    onUpdateStage({
      optimalCost: result.optimalCost,
      baselineCost: result.baselineCost,
      pathIndices: result.optimalPath,
      routeCodes,
      expanded: result.expandedNodes,
      pruned: result.prunedNodes,
      cleared: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originAirportIndex, syncToken]);

  const handleReset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsSolving(false);
    setIsPaused(false);
    setSteps([]);
    setStepIndex(0);
    setOptimalCost(null);
    setOptimalPath([]);
    setBaselineCost(null);
    setExpandedNodes(0);
    setPrunedNodes(0);
    setStatusMessage('Air cargo dispatch schedule cleared. Click Schedule Flight Loop to compute route.');
    onUpdateStage({
      optimalCost: null,
      baselineCost: null,
      pathIndices: [],
      routeCodes: [],
      expanded: 0,
      pruned: 0,
      cleared: false,
    });
  };

  const handleRunDispatch = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSteps([]);
    setStepIndex(0);
    const result = solveTSPBranchAndBound(costMatrix, originAirportIndex, airports);

    setOptimalCost(result.optimalCost);
    setOptimalPath(result.optimalPath);
    setBaselineCost(result.baselineCost);
    setExpandedNodes(result.expandedNodes);
    setPrunedNodes(result.prunedNodes);

    const routeCodes = result.optimalPath.map((idx) => airports[idx].code);

    if (isAdmin) {
      setSteps(result.steps);
      setIsSolving(true);
      setIsPaused(false);
      setStepIndex(0);
      setStatusMessage('Running Branch & Bound TSP solver with MST lower-bound pruning...');
    } else {
      setStatusMessage(
        `Flight manifest locked from ${originHub.code}: ${routeCodes.join(' → ')} (${result.optimalCost} Units · saved ${
          result.baselineCost - result.optimalCost
        } units).`
      );
    }

    onUpdateStage({
      optimalCost: result.optimalCost,
      baselineCost: result.baselineCost,
      pathIndices: result.optimalPath,
      routeCodes,
      expanded: result.expandedNodes,
      pruned: result.prunedNodes,
      cleared: true,
    });
  };

  useEffect(() => {
    if (isSolving && !isPaused && steps.length > 0) {
      timerRef.current = window.setInterval(() => {
        setStepIndex((prev) => {
          if (prev >= steps.length - 1) {
            clearInterval(timerRef.current!);
            setIsSolving(false);
            return prev;
          }
          const next = prev + 1;
          setStatusMessage(steps[next].message);
          return next;
        });
      }, speed);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isSolving, isPaused, steps, speed]);

  const stepForward = () => {
    if (stepIndex < steps.length - 1) {
      const next = stepIndex + 1;
      setStepIndex(next);
      setStatusMessage(steps[next].message);
    }
  };

  const stepBackward = () => {
    if (stepIndex > 0) {
      const prev = stepIndex - 1;
      setStepIndex(prev);
      setStatusMessage(steps[prev].message);
    }
  };

  const updateMatrixCell = (i: number, j: number, value: string) => {
    const num = Math.max(1, parseInt(value, 10) || 1);
    const newM = costMatrix.map((row) => [...row]);
    newM[i][j] = num;
    newM[j][i] = num;
    setCostMatrix(newM);
    handleReset();
  };

  const currentStep = isAdmin ? steps[stepIndex] : undefined;
  const activePath = currentStep ? currentStep.activeNode.path : [];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Stage Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono font-semibold text-blue-400">
            STAGE 4 OF 4 · FINAL AIR CARGO DISPATCH ({originHub.code} ORIGIN LOOP)
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-white">
            Air Cargo Route Scheduler &amp; Freight Manifest
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-3xl">
            Dispatches the loaded cargo aircraft from {originHub.name} ({originHub.code}, staged in Stage 3) across all 5 regional freight hubs at minimum fuel and corridor expense.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAdmin && (
            <button
              onClick={onRequestAdmin}
              className="px-3 py-1.5 rounded-lg bg-[#0F1623] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>Admin Solver View</span>
            </button>
          )}
          <button
            onClick={() => onSelectView('mission-control')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
          >
            <span>Return to Mission Control</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-[#0F1623] border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">Origin Hub (Synced):</span>
          <select
            value={originAirportIndex}
            onChange={(e) => onOriginChange(Number(e.target.value))}
            disabled={isSolving}
            className="bg-[#090D16] border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5"
          >
            {airports.map((a, idx) => (
              <option key={a.id} value={idx}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>

          <button
            onClick={() => setEditMatrixMode(!editMatrixMode)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1.5 ${
              editMatrixMode
                ? 'bg-blue-950 text-blue-300 border-blue-700'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{editMatrixMode ? 'Hide Tariff Editor' : 'Adjust Route Tariffs'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunDispatch}
            disabled={isSolving && !isPaused}
            className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-blue-400 hover:bg-blue-300 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isAdmin ? 'Run Branch & Bound TSP' : 'Schedule Flight Loop'}</span>
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Clear Schedule"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editable Route Tariff Matrix */}
      {editMatrixMode && (
        <div className="p-4 rounded-xl bg-[#0F1623] border border-slate-800">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
            <span className="font-semibold text-white">
              Symmetric Hub-to-Hub Tariff Matrix (Fuel &amp; Corridor Cost Units)
            </span>
            <button
              onClick={() => {
                setCostMatrix(DEFAULT_TSP_MATRIX);
                handleReset();
              }}
              className="text-blue-400 hover:underline text-xs"
            >
              Restore Standard Tariffs
            </button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-center text-xs font-mono">
              <thead>
                <tr>
                  <th className="p-1"></th>
                  {airports.map((a) => (
                    <th key={a.code} className="p-1 text-blue-400 font-semibold">
                      {a.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {costMatrix.map((row, i) => (
                  <tr key={`cost-row-${i}`}>
                    <td className="p-1 text-blue-400 font-semibold">{airports[i].code}</td>
                    {row.map((val, j) => (
                      <td key={`cost-cell-${i}-${j}`} className="p-0.5">
                        <input
                          type="number"
                          min="1"
                          max="99"
                          disabled={i === j || isSolving}
                          value={val}
                          onChange={(e) => updateMatrixCell(i, j, e.target.value)}
                          className={`w-12 text-center py-1 rounded bg-[#090D16] border text-xs font-mono ${
                            i === j
                              ? 'text-slate-600 border-slate-900 cursor-not-allowed'
                              : 'text-slate-200 border-slate-800 focus:border-blue-400'
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Cargo Hub Map SVG (7 cols) */}
        <div className="lg:col-span-7">
          <div className="p-4 sm:p-5 rounded-xl bg-[#0F1623] border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Plane className="w-4 h-4 text-blue-400" />
                Regional Air Freight Network
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Origin: {originHub.code}
              </span>
            </div>

            <div className="mt-4 flex justify-center">
              <svg viewBox="0 0 360 400" className="w-full max-w-[380px] h-auto select-none">
                <defs>
                  <linearGradient id="mapBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#090D16" />
                  </linearGradient>
                  <filter id="blueGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                <path
                  d="M 120 40 Q 190 20 220 50 L 250 120 Q 280 180 260 270 L 200 370 L 150 330 Q 100 260 110 180 Z"
                  fill="url(#mapBgGrad)"
                  stroke="#1e293b"
                  strokeWidth="1.5"
                  opacity="0.8"
                />

                {airports.map((fromA, i) =>
                  airports.map((toA, j) => {
                    if (i >= j) return null;
                    const cost = costMatrix[i][j];

                    let isOptimal = false;
                    if ((!isAdmin || !isSolving) && optimalPath.length > 0) {
                      for (let p = 0; p < optimalPath.length - 1; p++) {
                        if (
                          (optimalPath[p] === i && optimalPath[p + 1] === j) ||
                          (optimalPath[p] === j && optimalPath[p + 1] === i)
                        ) {
                          isOptimal = true;
                          break;
                        }
                      }
                    }

                    let isActive = false;
                    for (let p = 0; p < activePath.length - 1; p++) {
                      if (
                        (activePath[p] === i && activePath[p + 1] === j) ||
                        (activePath[p] === j && activePath[p + 1] === i)
                      ) {
                        isActive = true;
                        break;
                      }
                    }

                    const strokeColor = isOptimal
                      ? '#10b981'
                      : isActive
                      ? '#38bdf8'
                      : '#1e293b';

                    const strokeWidth = isOptimal ? 3 : isActive ? 2.5 : 1;
                    const midX = (fromA.x + toA.x) / 2;
                    const midY = (fromA.y + toA.y) / 2;

                    return (
                      <g key={`corridor-${i}-${j}`}>
                        <line
                          x1={fromA.x}
                          y1={fromA.y}
                          x2={toA.x}
                          y2={toA.y}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          strokeDasharray={!isOptimal && !isActive ? '3 3' : undefined}
                          filter={isOptimal ? 'url(#blueGlow)' : undefined}
                        />
                        <rect
                          x={midX - 10}
                          y={midY - 7}
                          width="20"
                          height="14"
                          rx="3"
                          fill="#090D16"
                          stroke="#334155"
                          strokeWidth="0.5"
                        />
                        <text
                          x={midX}
                          y={midY + 3.5}
                          textAnchor="middle"
                          fill={isOptimal ? '#10b981' : '#94a3b8'}
                          fontSize="8"
                          fontWeight="bold"
                          className="font-mono"
                        >
                          {cost}
                        </text>
                      </g>
                    );
                  })
                )}

                {airports.map((airport, idx) => {
                  const isOrigin = idx === originAirportIndex;
                  const isInActivePath = activePath.includes(idx);
                  const isInOptimal = (!isAdmin || !isSolving) && optimalPath.includes(idx);

                  return (
                    <g key={airport.id}>
                      <circle
                        cx={airport.x}
                        cy={airport.y}
                        r={isOrigin ? 18 : 14}
                        fill="#0f172a"
                        stroke={
                          isOrigin
                            ? '#38bdf8'
                            : isInOptimal
                            ? '#10b981'
                            : isInActivePath
                            ? '#06b6d4'
                            : '#475569'
                        }
                        strokeWidth={isOrigin ? 3 : 2}
                      />
                      <text
                        x={airport.x}
                        y={airport.y + 3.5}
                        textAnchor="middle"
                        fill={isOrigin ? '#38bdf8' : isInOptimal ? '#10b981' : '#f8fafc'}
                        fontSize="8"
                        fontWeight="bold"
                        className="font-mono"
                      >
                        {airport.code}
                      </text>
                      <text
                        x={airport.x}
                        y={airport.y + 24}
                        textAnchor="middle"
                        fill="#cbd5e1"
                        fontSize="9"
                        fontWeight="500"
                      >
                        {airport.name.replace(' Airport', '')}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {isAdmin && steps.length > 0 && currentStep && (
              <div className="mt-4 p-2.5 rounded-xl border flex items-center justify-between text-xs bg-[#090D16] border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 text-[11px]">
                    Step {stepIndex + 1}/{steps.length}:
                  </span>
                  {currentStep.action === 'expand' && (
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-semibold border border-blue-500/30">
                      Expanding Branch · MST Bound: {currentStep.activeNode.bound}
                    </span>
                  )}
                  {currentStep.action === 'prune' && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 font-semibold border border-rose-500/30">
                      Subtree Pruned · Bound ≥ Best
                    </span>
                  )}
                  {currentStep.action === 'update_best' && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/30">
                      New Optimal Cargo Tour Found
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-blue-400">
                  Queue {currentStep.queueSize}
                </span>
              </div>
            )}

            <div className="mt-4 p-3 rounded-xl bg-[#090D16] border border-slate-800 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 font-mono leading-relaxed">{statusMessage}</p>
            </div>

            {isAdmin && steps.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={stepBackward}
                      disabled={stepIndex === 0}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                      title="Step Backward"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsPaused(!isPaused)}
                      className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-slate-950 font-semibold text-xs flex items-center gap-1"
                    >
                      {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      <span>{isPaused ? 'Resume' : 'Pause'}</span>
                    </button>
                    <button
                      onClick={stepForward}
                      disabled={stepIndex >= steps.length - 1}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                      title="Step Forward"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400 mr-1">Pace:</span>
                    <button
                      onClick={() => setSpeed(2200)}
                      className={`px-2 py-0.5 rounded border ${
                        speed >= 1800
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 font-semibold'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      Slow (2.2s)
                    </button>
                    <button
                      onClick={() => setSpeed(1200)}
                      className={`px-2 py-0.5 rounded border ${
                        speed >= 800 && speed < 1800
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 font-semibold'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      Demo (1.2s)
                    </button>
                    <button
                      onClick={() => setSpeed(400)}
                      className={`px-2 py-0.5 rounded border ${
                        speed < 800
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 font-semibold'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      Fast (0.4s)
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs text-slate-400 bg-[#090D16] p-2 rounded-lg border border-slate-800">
                  <span className="text-[11px]">Playback Interval:</span>
                  <input
                    type="range"
                    min="100"
                    max="3000"
                    step="50"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="flex-1 accent-blue-400 cursor-pointer"
                  />
                  <span className="font-mono text-blue-400 tabular-nums text-xs">
                    {speed >= 1000 ? `${(speed / 1000).toFixed(1)}s / step` : `${speed}ms / step`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Manifest & Admin Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-[#0F1623] border border-slate-800">
              <span className="text-xs text-slate-400">Optimal Flight Cost</span>
              <div className="mt-1 text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                {optimalCost !== null ? `${optimalCost} Units` : '—'}
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5 truncate font-mono">
                {optimalPath.length > 0
                  ? optimalPath.map((idx) => airports[idx].code).join(' → ')
                  : 'Pending schedule'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0F1623] border border-slate-800">
              <span className="text-xs text-slate-400">Standard Sequential Loop</span>
              <div className="mt-1 text-2xl font-bold font-mono text-slate-300 tabular-nums">
                {baselineCost !== null ? `${baselineCost} Units` : '—'}
              </div>
              {baselineCost !== null && optimalCost !== null && baselineCost > optimalCost && (
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5 tabular-nums">
                  <TrendingDown className="w-3 h-3" />
                  Saved {baselineCost - optimalCost} units (
                  {Math.round(((baselineCost - optimalCost) / baselineCost) * 100)}%)
                </span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F1623] border border-slate-800">
            <div className="text-xs font-semibold text-white pb-2 border-b border-slate-800">
              Scheduled Flight Manifest Legs
            </div>
            {optimalPath.length > 0 ? (
              <div className="mt-3 space-y-2 text-xs">
                {optimalPath.slice(0, -1).map((fromIdx, legIdx) => {
                  const toIdx = optimalPath[legIdx + 1];
                  return (
                    <div
                      key={`leg-${legIdx}`}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#090D16] border border-slate-800 font-mono"
                    >
                      <span className="text-slate-300">
                        Leg {legIdx + 1}: {airports[fromIdx].code} → {airports[toIdx].code}
                      </span>
                      <span className="text-blue-400 font-semibold tabular-nums">
                        {costMatrix[fromIdx][toIdx]} Units
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                Schedule the flight loop to inspect hub-to-hub manifest legs.
              </p>
            )}
          </div>

          {isAdmin ? (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/30">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>ADMIN INSPECTOR · Branch &amp; Bound TSP Engine</span>
                </div>
                <span className="text-xs font-mono text-blue-400 font-bold">O(n!)</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-[#090D16] border border-slate-800">
                  <span className="text-slate-400">Expanded Nodes</span>
                  <div className="text-lg font-bold font-mono text-blue-400 tabular-nums">
                    {expandedNodes}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#090D16] border border-slate-800">
                  <span className="text-slate-400">Pruned Subtrees</span>
                  <div className="text-lg font-bold font-mono text-rose-400 tabular-nums">
                    {prunedNodes}
                  </div>
                </div>
              </div>

              <pre className="p-3 rounded-lg bg-[#090D16] border border-slate-800 text-[11px] font-mono text-slate-300 leading-relaxed overflow-x-auto">
{`solveTSPBranchAndBound(matrix):
  PQueue.insert(rootNode)
  while PQueue not empty:
    node = PQueue.popSmallestBound()
    if node.bound >= bestCost: prune(node); continue
    for each unvisited hub u:
      child.bound = cost + MST(unvisited) + minLinks
      if child.isComplete(): updateBest(child)
      else if child.bound < bestCost: PQueue.insert(child)`}
              </pre>

              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-200">How it works:</strong> Uses Best-First search ordered by an admissible Minimum Spanning Tree (MST) lower bound, pruning suboptimal partial routes early.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-[#0F1623] border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-slate-400">
                <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Air dispatch optimization bounds and logs are Admin-only.</span>
              </div>
              <button
                onClick={onRequestAdmin}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 whitespace-nowrap"
              >
                Unlock
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
