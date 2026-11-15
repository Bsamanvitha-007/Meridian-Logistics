import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Cpu,
  CheckCircle2,
  XCircle,
  Info,
  Lock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import {
  DEFAULT_PCB_GRAPH,
  DISCONNECTED_PCB_GRAPH,
  findHamiltonianCycle,
} from '../algorithms/hamiltonian';
import { GraphNode, HamiltonianStep, WorkspaceView } from '../types';

interface HamiltonianSimulatorProps {
  isAdmin: boolean;
  onRequestAdmin: () => void;
  onSelectView: (view: WorkspaceView) => void;
  externalFaultMode: boolean;
  syncToken: number;
  onUpdateStage: (stats: {
    found: boolean | null;
    sequence: string;
    pathIndices: number[];
    matrix: number[][];
    activeLinks: number;
    explored: number;
    rejected: number;
  }) => void;
}

const PCB_NODES: GraphNode[] = [
  { id: '0', label: 'Module A (Power)', x: 200, y: 60 },
  { id: '1', label: 'Module B (MCU)', x: 330, y: 120 },
  { id: '2', label: 'Module C (Sensors)', x: 330, y: 260 },
  { id: '3', label: 'Module D (RF Link)', x: 200, y: 320 },
  { id: '4', label: 'Module E (Servo)', x: 70, y: 260 },
  { id: '5', label: 'Module F (Bus)', x: 70, y: 120 },
];

const SHORT_CODES = ['A', 'B', 'C', 'D', 'E', 'F'];

export const HamiltonianSimulator: React.FC<HamiltonianSimulatorProps> = ({
  isAdmin,
  onRequestAdmin,
  onSelectView,
  externalFaultMode,
  syncToken,
  onUpdateStage,
}) => {
  const [adjMatrix, setAdjMatrix] = useState<number[][]>(DEFAULT_PCB_GRAPH);
  const [startVertex, setStartVertex] = useState<number>(0);
  const [selectedNodeForEdge, setSelectedNodeForEdge] = useState<number | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [steps, setSteps] = useState<HamiltonianStep[]>([]);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1000);
  const [cycleFound, setCycleFound] = useState<boolean | null>(() => {
    return findHamiltonianCycle(DEFAULT_PCB_GRAPH, 0, SHORT_CODES).cycleFound;
  });
  const [finalCycle, setFinalCycle] = useState<number[]>(() => {
    return findHamiltonianCycle(DEFAULT_PCB_GRAPH, 0, SHORT_CODES).cycle;
  });
  const [cycleSequence, setCycleSequence] = useState<string>(() => {
    const res = findHamiltonianCycle(DEFAULT_PCB_GRAPH, 0, SHORT_CODES);
    return res.cycleFound ? res.cycle.map((v) => SHORT_CODES[v]).join(' → ') : 'None';
  });
  const [exploredCount, setExploredCount] = useState<number>(() => {
    return findHamiltonianCycle(DEFAULT_PCB_GRAPH, 0, SHORT_CODES).exploredStates;
  });
  const [rejectedCount, setRejectedCount] = useState<number>(() => {
    return findHamiltonianCycle(DEFAULT_PCB_GRAPH, 0, SHORT_CODES).rejectedStates;
  });
  const [statusMessage, setStatusMessage] = useState<string>(
    'Avionics flight-controller bus certified. Toggle any two IC pads or test fault scenarios.'
  );

  const timerRef = useRef<number | null>(null);
  const isFirstMount = useRef<boolean>(true);

  const countLinks = (m: number[][]) => m.flat().reduce((acc, v) => acc + v, 0) / 2;

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsSolving(false);
    setIsPaused(false);
    setSteps([]);
    setStepIndex(0);
    const targetGraph = externalFaultMode ? DISCONNECTED_PCB_GRAPH : DEFAULT_PCB_GRAPH;
    setAdjMatrix(targetGraph);
    const result = findHamiltonianCycle(targetGraph, startVertex, SHORT_CODES);
    const seq = result.cycleFound
      ? result.cycle.map((v) => SHORT_CODES[v]).join(' → ')
      : 'Disconnected Bus';
    setCycleFound(result.cycleFound);
    setFinalCycle(result.cycle);
    setCycleSequence(seq);
    setExploredCount(result.exploredStates);
    setRejectedCount(result.rejectedStates);
    setStatusMessage(
      result.cycleFound
        ? `Stage 2 synced: Flight-controller bus continuity certified (${seq}).`
        : 'QA Hold: Isolated IC cluster detected. Repair broken traces to clear.'
    );
    onUpdateStage({
      found: result.cycleFound,
      sequence: seq,
      pathIndices: result.cycle,
      matrix: targetGraph,
      activeLinks: countLinks(targetGraph),
      explored: result.exploredStates,
      rejected: result.rejectedStates,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncToken, externalFaultMode]);

  const handleReset = (matrixOverride?: number[][]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const activeMatrix = matrixOverride ?? adjMatrix;
    setIsSolving(false);
    setIsPaused(false);
    setSteps([]);
    setStepIndex(0);
    setCycleFound(null);
    setFinalCycle([]);
    setCycleSequence('');
    setExploredCount(0);
    setRejectedCount(0);
    setSelectedNodeForEdge(null);
    setStatusMessage('Board layout modified. Click Certify Avionics Bus to re-verify continuity.');
    onUpdateStage({
      found: null,
      sequence: 'Awaiting QA check',
      pathIndices: [],
      matrix: activeMatrix,
      activeLinks: countLinks(activeMatrix),
      explored: 0,
      rejected: 0,
    });
  };

  const handleRunRouter = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSteps([]);
    setStepIndex(0);
    const result = findHamiltonianCycle(adjMatrix, startVertex, SHORT_CODES);

    setExploredCount(result.exploredStates);
    setRejectedCount(result.rejectedStates);
    setCycleFound(result.cycleFound);
    setFinalCycle(result.cycle);

    const seq = result.cycleFound
      ? result.cycle.map((v) => SHORT_CODES[v]).join(' → ')
      : 'No Continuous Loop Possible';
    setCycleSequence(seq);

    if (isAdmin) {
      setSteps(result.steps);
      setIsSolving(true);
      setIsPaused(false);
      setStepIndex(0);
      setStatusMessage('Running Hamiltonian Cycle backtracking verification...');
    } else {
      setStatusMessage(
        result.cycleFound
          ? `Hardware QA Passed: Non-overlapping bus verified (${seq}). Cleared for Stage 3 depot loading.`
          : 'QA Hold: Isolated IC cluster detected. Add bridging copper traces between modules.'
      );
    }

    onUpdateStage({
      found: result.cycleFound,
      sequence: seq,
      pathIndices: result.cycle,
      matrix: adjMatrix,
      activeLinks: countLinks(adjMatrix),
      explored: result.exploredStates,
      rejected: result.rejectedStates,
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

  const toggleMatrixEdge = (i: number, j: number) => {
    if (i === j) return;
    const newMatrix = adjMatrix.map((row) => [...row]);
    const newVal = newMatrix[i][j] === 1 ? 0 : 1;
    newMatrix[i][j] = newVal;
    newMatrix[j][i] = newVal;
    setAdjMatrix(newMatrix);
    handleReset(newMatrix);
  };

  const handleNodeClick = (nodeIdx: number) => {
    if (isSolving) return;
    if (selectedNodeForEdge === null) {
      setSelectedNodeForEdge(nodeIdx);
      setStatusMessage(
        `Selected ${PCB_NODES[nodeIdx].label}. Click a second module to add/remove a copper link.`
      );
    } else {
      if (selectedNodeForEdge !== nodeIdx) {
        toggleMatrixEdge(selectedNodeForEdge, nodeIdx);
        setStatusMessage(
          `Updated trace between ${PCB_NODES[selectedNodeForEdge].label} and ${PCB_NODES[nodeIdx].label}.`
        );
      }
      setSelectedNodeForEdge(null);
    }
  };

  const activePath =
    isAdmin && steps.length > 0 && steps[stepIndex]
      ? steps[stepIndex].currentPath.filter((v) => v !== -1)
      : cycleFound === true
      ? finalCycle
      : [];

  const rejectedEdge =
    isAdmin && steps.length > 0 && steps[stepIndex] ? steps[stepIndex].rejectedEdge : undefined;
  const isCompleteCycle =
    (isAdmin && steps.length > 0 && steps[stepIndex]?.action === 'complete') ||
    (!isAdmin && cycleFound === true);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Stage Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono font-semibold text-emerald-400">
            STAGE 2 OF 4 · HARDWARE QA &amp; AVIONICS CERTIFICATION
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-white">
            Avionics Controller PCB Continuity Verification
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-3xl">
            Certifies that all 6 controller ICs on funded mission hardware share a closed, non-overlapping serial bus loop before warehouse robots load the craft in Stage 3.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAdmin && (
            <button
              onClick={onRequestAdmin}
              className="px-3 py-1.5 rounded-lg bg-[#0F1623] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Admin Solver View</span>
            </button>
          )}
          <button
            onClick={() => onSelectView('fleet')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
          >
            <span>Next: Stage 3 Staging</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-[#0F1623] border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Board Profiles:</span>
          <button
            onClick={() => {
              setAdjMatrix(DEFAULT_PCB_GRAPH);
              handleReset(DEFAULT_PCB_GRAPH);
            }}
            className="px-3 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Standard Flight Board
          </button>
          <button
            onClick={() => {
              setAdjMatrix(DISCONNECTED_PCB_GRAPH);
              handleReset(DISCONNECTED_PCB_GRAPH);
            }}
            className="px-3 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Broken Trace Simulation
          </button>
          <button
            onClick={() => {
              const full = Array.from({ length: 6 }, (_, i) =>
                Array.from({ length: 6 }, (_, j) => (i === j ? 0 : 1))
              );
              setAdjMatrix(full);
              handleReset(full);
            }}
            className="px-3 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Redundant Mesh
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Bus Origin:</span>
            <select
              value={startVertex}
              onChange={(e) => {
                setStartVertex(Number(e.target.value));
                handleReset();
              }}
              disabled={isSolving}
              className="bg-[#090D16] border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5"
            >
              {PCB_NODES.map((n, idx) => (
                <option key={n.id} value={idx}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRunRouter}
            disabled={isSolving && !isPaused}
            className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isAdmin ? 'Run Hamiltonian Solver' : 'Certify Avionics Bus'}</span>
          </button>
          <button
            onClick={() => handleReset()}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Clear Certification"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: PCB Schematic SVG (7 cols) */}
        <div className="lg:col-span-7">
          <div className="p-4 sm:p-5 rounded-xl bg-[#0F1623] border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-400" />
                6-Module Flight Controller Schematic
              </span>
              <span className="text-[11px] text-slate-400">
                Click any 2 pads to toggle trace
              </span>
            </div>

            <div className="mt-4 flex justify-center">
              <svg viewBox="0 0 400 380" className="w-full max-w-[400px] h-auto select-none">
                <defs>
                  <pattern id="pcbGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                  </pattern>
                  <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <rect
                  x="10"
                  y="10"
                  width="380"
                  height="360"
                  rx="14"
                  fill="#090D16"
                  stroke="#1e293b"
                  strokeWidth="1.5"
                />
                <rect x="10" y="10" width="380" height="360" fill="url(#pcbGrid)" opacity="0.6" />

                {PCB_NODES.map((fromNode, i) =>
                  PCB_NODES.map((toNode, j) => {
                    if (i >= j || adjMatrix[i][j] === 0) return null;

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

                    const isRejected =
                      rejectedEdge &&
                      ((rejectedEdge[0] === i && rejectedEdge[1] === j) ||
                        (rejectedEdge[0] === j && rejectedEdge[1] === i));

                    const strokeColor =
                      isCompleteCycle && isActive
                        ? '#10b981'
                        : isActive
                        ? '#06b6d4'
                        : isRejected
                        ? '#f43f5e'
                        : '#334155';

                    return (
                      <line
                        key={`edge-${i}-${j}`}
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        stroke={strokeColor}
                        strokeWidth={isActive || isRejected ? 3.5 : 1.5}
                        strokeDasharray={isRejected ? '4 4' : undefined}
                        filter={isActive && isCompleteCycle ? 'url(#emeraldGlow)' : undefined}
                      />
                    );
                  })
                )}

                {PCB_NODES.map((node, idx) => {
                  const isInPath = activePath.includes(idx);
                  const isStart = idx === startVertex;
                  const isSelected = selectedNodeForEdge === idx;
                  const isCurrentHead =
                    activePath.length > 0 && activePath[activePath.length - 1] === idx;

                  return (
                    <g
                      key={node.id}
                      onClick={() => handleNodeClick(idx)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="22"
                        fill="#0f172a"
                        stroke={
                          isSelected
                            ? '#f59e0b'
                            : isCompleteCycle && isInPath
                            ? '#10b981'
                            : isCurrentHead
                            ? '#06b6d4'
                            : isInPath
                            ? '#0284c7'
                            : '#334155'
                        }
                        strokeWidth={isCurrentHead || isSelected ? 3 : 2}
                        filter={isInPath ? 'url(#emeraldGlow)' : undefined}
                      />
                      <rect
                        x={node.x - 12}
                        y={node.y - 12}
                        width="24"
                        height="24"
                        rx="4"
                        fill={isStart ? '#10b981' : '#1e293b'}
                        stroke="#475569"
                        strokeWidth="1"
                      />
                      <text
                        x={node.x}
                        y={node.y + 4}
                        textAnchor="middle"
                        fill={isStart ? '#020617' : '#f8fafc'}
                        fontSize="11"
                        fontWeight="bold"
                        className="font-mono"
                      >
                        {SHORT_CODES[idx]}
                      </text>
                      <text
                        x={node.x}
                        y={node.y + 36}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="9"
                        fontWeight="500"
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {isAdmin && steps.length > 0 && steps[stepIndex] && (
              <div className="mt-4 p-2.5 rounded-xl border flex items-center justify-between text-xs bg-[#090D16] border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 text-[11px]">
                    Step {stepIndex + 1}/{steps.length}:
                  </span>
                  {steps[stepIndex].action === 'visit' && (
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/30">
                      Trace Extended to {SHORT_CODES[steps[stepIndex].vertex]}
                    </span>
                  )}
                  {steps[stepIndex].action === 'reject' && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 font-semibold border border-rose-500/30">
                      Rejected Move · No Trace or Already Visited
                    </span>
                  )}
                  {steps[stepIndex].action === 'backtrack' && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/30">
                      Dead-End · Backtracking
                    </span>
                  )}
                  {steps[stepIndex].action === 'complete' && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/30">
                      Hamiltonian Cycle Closed
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-emerald-400">
                  Visited {activePath.length}/6
                </span>
              </div>
            )}

            <div className="mt-4 p-3 rounded-xl bg-[#090D16] border border-slate-800 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
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
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-1"
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
                      onClick={() => setSpeed(2000)}
                      className={`px-2 py-0.5 rounded border ${
                        speed >= 1600
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      Slow (2.0s)
                    </button>
                    <button
                      onClick={() => setSpeed(1000)}
                      className={`px-2 py-0.5 rounded border ${
                        speed >= 700 && speed < 1600
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      Demo (1.0s)
                    </button>
                    <button
                      onClick={() => setSpeed(350)}
                      className={`px-2 py-0.5 rounded border ${
                        speed < 700
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      Fast (0.35s)
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
                    className="flex-1 accent-emerald-400 cursor-pointer"
                  />
                  <span className="font-mono text-emerald-400 tabular-nums text-xs">
                    {speed >= 1000 ? `${(speed / 1000).toFixed(1)}s / step` : `${speed}ms / step`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Board Matrix & Admin Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-[#0F1623] border border-slate-800">
              <span className="text-xs text-slate-400">QA Certification</span>
              <div className="mt-1 flex items-center gap-1.5">
                {cycleFound === true ? (
                  <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Closed Loop
                  </span>
                ) : cycleFound === false ? (
                  <span className="text-sm font-bold text-rose-400 flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> Continuity Fault
                  </span>
                ) : (
                  <span className="text-sm font-mono text-slate-400">Pending</span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5 truncate font-mono">
                {cycleSequence || 'Awaiting verification'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0F1623] border border-slate-800">
              <span className="text-xs text-slate-400">Active Copper Links</span>
              <div className="mt-1 text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                {countLinks(adjMatrix)}
              </div>
              <span className="text-[11px] text-slate-500">Board Interconnects</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F1623] border border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <span className="font-semibold text-white">Board Interconnect Matrix</span>
              <span className="text-emerald-400 font-mono text-[11px]">Click 0/1 to toggle</span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-center text-xs font-mono">
                <thead>
                  <tr>
                    <th className="p-1"></th>
                    {SHORT_CODES.map((c) => (
                      <th key={c} className="p-1 text-cyan-400 font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {adjMatrix.map((row, i) => (
                    <tr key={`m-row-${i}`}>
                      <td className="p-1 text-cyan-400 font-semibold">{SHORT_CODES[i]}</td>
                      {row.map((val, j) => (
                        <td key={`m-cell-${i}-${j}`} className="p-0.5">
                          <button
                            onClick={() => toggleMatrixEdge(i, j)}
                            disabled={i === j || isSolving}
                            className={`w-7 h-7 rounded text-xs transition-colors font-mono ${
                              i === j
                                ? 'bg-[#090D16] text-slate-600 cursor-not-allowed'
                                : val === 1
                                ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-[#090D16] text-slate-500 border border-slate-800 hover:bg-slate-800'
                            }`}
                          >
                            {val}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {isAdmin ? (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/30">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>ADMIN INSPECTOR · Hamiltonian Cycle Backtracking</span>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold">O(V!)</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-[#090D16] border border-slate-800">
                  <span className="text-slate-400">Explored Moves</span>
                  <div className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
                    {exploredCount}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#090D16] border border-slate-800">
                  <span className="text-slate-400">Rejected Edges</span>
                  <div className="text-lg font-bold font-mono text-rose-400 tabular-nums">
                    {rejectedCount}
                  </div>
                </div>
              </div>

              <pre className="p-3 rounded-lg bg-[#090D16] border border-slate-800 text-[11px] font-mono text-slate-300 leading-relaxed overflow-x-auto">
{`findHamiltonianCycle(path, pos):
  if pos == V:
    return adjMatrix[path[V-1]][path[0]] == 1
  for v = 0 to V-1:
    if isValidMove(v, adjMatrix, path, pos):
      path[pos] = v
      if findHamiltonianCycle(path, pos + 1): return true
      path[pos] = -1            // Backtrack
  return false`}
              </pre>

              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-200">How it works:</strong> Traverses each PCB module once along available copper links and checks closure back to the origin module, backtracking upon dead ends or duplicate nodes.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-[#0F1623] border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-slate-400">
                <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Board continuity solver traces are Admin-only.</span>
              </div>
              <button
                onClick={onRequestAdmin}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 whitespace-nowrap"
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
