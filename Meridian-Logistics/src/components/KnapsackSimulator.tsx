import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  CheckCircle2,
  Plus,
  Trash2,
  Info,
  Sparkles,
  Lock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import {
  DEFAULT_PROJECTS,
  DEFAULT_BUDGET,
  solveKnapsackBranchAndBound,
} from '../algorithms/knapsackBranchAndBound';
import { KnapsackStep, ProjectItem, WorkspaceView } from '../types';

interface KnapsackSimulatorProps {
  isAdmin: boolean;
  onRequestAdmin: () => void;
  onSelectView: (view: WorkspaceView) => void;
  externalBudget: number;
  syncToken: number;
  onUpdateStage: (stats: {
    budget: number;
    invested: number;
    approvedNames: string[];
    optimalReturn: number;
    baselineReturn: number;
    expanded: number;
    pruned: number;
    cleared: boolean;
  }) => void;
}

export const KnapsackSimulator: React.FC<KnapsackSimulatorProps> = ({
  isAdmin,
  onRequestAdmin,
  onSelectView,
  externalBudget,
  syncToken,
  onUpdateStage,
}) => {
  const [projects, setProjects] = useState<ProjectItem[]>(DEFAULT_PROJECTS);
  const [budget, setBudget] = useState<number>(DEFAULT_BUDGET);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1200);
  const [steps, setSteps] = useState<KnapsackStep[]>([]);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [optimalSelection, setOptimalSelection] = useState<boolean[]>(() => {
    return solveKnapsackBranchAndBound(DEFAULT_PROJECTS, DEFAULT_BUDGET).optimalSelection;
  });
  const [optimalCost, setOptimalCost] = useState<number>(() => {
    return solveKnapsackBranchAndBound(DEFAULT_PROJECTS, DEFAULT_BUDGET).optimalCost;
  });
  const [optimalReturn, setOptimalReturn] = useState<number>(() => {
    return solveKnapsackBranchAndBound(DEFAULT_PROJECTS, DEFAULT_BUDGET).optimalReturn;
  });
  const [baselineReturn, setBaselineReturn] = useState<number>(() => {
    return solveKnapsackBranchAndBound(DEFAULT_PROJECTS, DEFAULT_BUDGET).baselineReturn;
  });
  const [expandedNodes, setExpandedNodes] = useState<number>(() => {
    return solveKnapsackBranchAndBound(DEFAULT_PROJECTS, DEFAULT_BUDGET).expandedNodes;
  });
  const [prunedNodes, setPrunedNodes] = useState<number>(() => {
    return solveKnapsackBranchAndBound(DEFAULT_PROJECTS, DEFAULT_BUDGET).prunedNodes;
  });
  const [statusMessage, setStatusMessage] = useState<string>(
    'Mission equipment slate funded for Stage 2 hardware QA. Adjust capital caps or payload items to recalculate.'
  );

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsSolving(false);
    setIsPaused(false);
    setSteps([]);
    setStepIndex(0);
    setBudget(externalBudget);
    const result = solveKnapsackBranchAndBound(projects, externalBudget);
    setOptimalSelection(result.optimalSelection);
    setOptimalCost(result.optimalCost);
    setOptimalReturn(result.optimalReturn);
    setBaselineReturn(result.baselineReturn);
    setExpandedNodes(result.expandedNodes);
    setPrunedNodes(result.prunedNodes);
    const selectedNames = projects
      .filter((_, i) => result.optimalSelection[i])
      .map((p) => p.name.split(' (')[0]);
    setStatusMessage(
      selectedNames.length > 0
        ? `Stage 1 synced: Approved ${selectedNames.join(', ')} (₹${result.optimalReturn}L value within ₹${externalBudget}L cap).`
        : `Budget cap ₹${externalBudget}L updated.`
    );
    onUpdateStage({
      budget: externalBudget,
      invested: result.optimalCost,
      approvedNames: selectedNames,
      optimalReturn: result.optimalReturn,
      baselineReturn: result.baselineReturn,
      expanded: result.expandedNodes,
      pruned: result.prunedNodes,
      cleared: result.optimalReturn > 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncToken, externalBudget]);

  const handleReset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsSolving(false);
    setIsPaused(false);
    setSteps([]);
    setStepIndex(0);
    setOptimalSelection([]);
    setOptimalCost(0);
    setOptimalReturn(0);
    setBaselineReturn(0);
    setExpandedNodes(0);
    setPrunedNodes(0);
    setStatusMessage('Capital allocation slate cleared. Click Approve Mission Budget to recalculate.');
    onUpdateStage({
      budget,
      invested: 0,
      approvedNames: [],
      optimalReturn: 0,
      baselineReturn: 0,
      expanded: 0,
      pruned: 0,
      cleared: false,
    });
  };

  const handleRunOptimizer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const result = solveKnapsackBranchAndBound(projects, budget);

    setOptimalSelection(result.optimalSelection);
    setOptimalCost(result.optimalCost);
    setOptimalReturn(result.optimalReturn);
    setBaselineReturn(result.baselineReturn);
    setExpandedNodes(result.expandedNodes);
    setPrunedNodes(result.prunedNodes);

    const selectedNames = projects
      .filter((_, i) => result.optimalSelection[i])
      .map((p) => p.name.split(' (')[0]);

    if (isAdmin) {
      setSteps(result.steps);
      setIsSolving(true);
      setIsPaused(false);
      setStepIndex(0);
      setStatusMessage(
        'Running 0/1 Knapsack Branch & Bound with Fractional Relaxation upper-bound pruning...'
      );
    } else {
      setStatusMessage(
        result.optimalReturn > 0
          ? `Mission payload budget locked: ${selectedNames.join(', ')} — ₹${result.optimalReturn}L value using ₹${result.optimalCost}L of ₹${budget}L ceiling.`
          : 'No hardware module fits within the current budget ceiling.'
      );
    }

    onUpdateStage({
      budget,
      invested: result.optimalCost,
      approvedNames: selectedNames,
      optimalReturn: result.optimalReturn,
      baselineReturn: result.baselineReturn,
      expanded: result.expandedNodes,
      pruned: result.prunedNodes,
      cleared: result.optimalReturn > 0,
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

  const updateProject = (id: string, field: 'cost' | 'expectedReturn', val: number) => {
    const updated = projects.map((p) => {
      if (p.id === id) {
        const nextVal = Math.max(1, val);
        const cost = field === 'cost' ? nextVal : p.cost;
        const expectedReturn = field === 'expectedReturn' ? nextVal : p.expectedReturn;
        return {
          ...p,
          [field]: nextVal,
          ratio: Math.round((expectedReturn / cost) * 100) / 100,
        };
      }
      return p;
    });
    setProjects(updated);
    handleReset();
  };

  const addProject = () => {
    if (projects.length >= 8) return;
    const nextChar = String.fromCharCode(65 + projects.length);
    const newP: ProjectItem = {
      id: `proj-${nextChar}`,
      name: `Project ${nextChar} (Cargo Telemetry Module)`,
      cost: 4,
      expectedReturn: 60,
      ratio: 15.0,
    };
    setProjects([...projects, newP]);
    handleReset();
  };

  const removeProject = (id: string) => {
    if (projects.length <= 3) return;
    setProjects(projects.filter((p) => p.id !== id));
    handleReset();
  };

  const currentStep = isAdmin ? steps[stepIndex] : undefined;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Stage Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono font-semibold text-amber-400">
            STAGE 1 OF 4 · MISSION CAPITAL &amp; PAYLOAD APPROVAL
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-white">
            Capital Allocation &amp; Hardware Payload Manifest
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-3xl">
            Select which robotic and avionics systems receive funding under the mission budget cap. Approved modules advance to Stage 2 Avionics Board QA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAdmin && (
            <button
              onClick={onRequestAdmin}
              className="px-3 py-1.5 rounded-lg bg-[#0F1623] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Solver View</span>
            </button>
          )}
          <button
            onClick={() => onSelectView('pcb')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
          >
            <span>Next: Stage 2 QA</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-[#0F1623] border border-slate-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <span className="font-semibold text-amber-400">Mission Budget Cap:</span>
            <input
              type="range"
              min="6"
              max="24"
              step="1"
              value={budget}
              onChange={(e) => {
                setBudget(Number(e.target.value));
                handleReset();
              }}
              disabled={isSolving}
              className="w-28 accent-amber-400 cursor-pointer"
            />
            <span className="font-mono text-amber-300 font-bold tabular-nums">
              ₹{budget} Lakhs
            </span>
          </div>

          <button
            onClick={addProject}
            disabled={projects.length >= 8 || isSolving}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1 disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Payload Item</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunOptimizer}
            disabled={isSolving && !isPaused}
            className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>
              {isAdmin ? 'Run Knapsack Branch & Bound' : 'Approve Mission Budget'}
            </span>
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Clear Selection"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Candidate Initiatives Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {projects.map((proj, idx) => {
              const isSelected = (!isAdmin || !isSolving) && optimalSelection[idx] === true;

              return (
                <div
                  key={proj.id}
                  className={`p-3.5 rounded-xl border transition-colors ${
                    isSelected
                      ? 'bg-amber-950/20 border-amber-500/60'
                      : 'bg-[#0F1623] border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <span className="text-xs font-semibold text-white truncate">
                      {proj.name}
                    </span>
                    {projects.length > 3 && (
                      <button
                        onClick={() => removeProject(proj.id)}
                        disabled={isSolving}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                        title="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400">Allocation Cost:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={proj.cost}
                          disabled={isSolving}
                          onChange={(e) => updateProject(proj.id, 'cost', Number(e.target.value))}
                          className="w-14 py-1 px-1.5 bg-[#090D16] border border-slate-800 rounded text-amber-300 font-mono text-xs tabular-nums"
                        />
                        <span className="text-slate-400 text-[11px]">L</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400">Mission ROI:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number"
                          min="5"
                          max="300"
                          step="5"
                          value={proj.expectedReturn}
                          disabled={isSolving}
                          onChange={(e) =>
                            updateProject(proj.id, 'expectedReturn', Number(e.target.value))
                          }
                          className="w-16 py-1 px-1.5 bg-[#090D16] border border-slate-800 rounded text-emerald-300 font-mono text-xs tabular-nums"
                        />
                        <span className="text-slate-400 text-[11px]">L</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Yield Multiplier:</span>
                    <span className="font-mono text-cyan-400 font-semibold tabular-nums">
                      {proj.ratio.toFixed(2)}x
                    </span>
                  </div>

                  {isSelected && (
                    <div className="mt-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Funded for Mission Payload</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Admin-only Step Banner */}
          {isAdmin && steps.length > 0 && currentStep && (
            <div className="p-2.5 rounded-xl border flex items-center justify-between text-xs bg-[#090D16] border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-400 text-[11px]">
                  Step {stepIndex + 1}/{steps.length}:
                </span>
                {currentStep.action === 'expand' && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/30">
                    Evaluating Node · Upper Bound: ₹{currentStep.activeNode.bound}L
                  </span>
                )}
                {currentStep.action === 'prune' && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 font-semibold border border-rose-500/30">
                    Subtree Pruned · Bound ≤ Best (₹{currentStep.bestProfit}L)
                  </span>
                )}
                {currentStep.action === 'infeasible' && (
                  <span className="px-2 py-0.5 rounded bg-rose-600/20 text-rose-300 font-semibold border border-rose-500/40">
                    Infeasible · Exceeds Budget Cap
                  </span>
                )}
                {currentStep.action === 'update_best' && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/30">
                    New Incumbent Found (₹{currentStep.bestProfit}L)
                  </span>
                )}
              </div>
              <span className="text-[11px] font-mono text-amber-400">
                Level {currentStep.activeNode.level}/{projects.length}
              </span>
            </div>
          )}

          {/* Status Message */}
          <div className="p-3 rounded-xl bg-[#090D16] border border-slate-800 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 font-mono leading-relaxed">{statusMessage}</p>
          </div>

          {/* Admin-only Slow-Motion Playback Controls */}
          {isAdmin && steps.length > 0 && (
            <div className="p-3 rounded-xl bg-[#0F1623] border border-slate-800 space-y-3">
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
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1"
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
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    Slow (2.2s)
                  </button>
                  <button
                    onClick={() => setSpeed(1200)}
                    className={`px-2 py-0.5 rounded border ${
                      speed >= 800 && speed < 1800
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    Demo (1.2s)
                  </button>
                  <button
                    onClick={() => setSpeed(400)}
                    className={`px-2 py-0.5 rounded border ${
                      speed < 800
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
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
                  className="flex-1 accent-amber-400 cursor-pointer"
                />
                <span className="font-mono text-amber-400 tabular-nums text-xs">
                  {speed >= 1000 ? `${(speed / 1000).toFixed(1)}s / step` : `${speed}ms / step`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: KPI Summary & Admin Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-[#0F1623] border border-slate-800">
              <span className="text-xs text-slate-400">Approved Payload Value</span>
              <div className="mt-1 text-2xl font-bold font-mono text-amber-400 tabular-nums">
                {optimalReturn > 0 ? `₹${optimalReturn}L` : '—'}
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                ₹{optimalCost}L of ₹{budget}L used
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0F1623] border border-slate-800">
              <span className="text-xs text-slate-400">Standard Unoptimized Slate</span>
              <div className="mt-1 text-2xl font-bold font-mono text-slate-300 tabular-nums">
                {baselineReturn > 0 ? `₹${baselineReturn}L` : '—'}
              </div>
              {optimalReturn > baselineReturn && (
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3" />
                  +₹{optimalReturn - baselineReturn}L net gain
                </span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F1623] border border-slate-800">
            <div className="flex justify-between text-xs text-slate-300 pb-2">
              <span>Mission Budget Utilization</span>
              <span className="font-mono font-semibold text-amber-400 tabular-nums">
                ₹{optimalCost}L / ₹{budget}L ({Math.round((optimalCost / budget) * 100 || 0)}%)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#090D16] overflow-hidden border border-slate-800">
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${Math.min(100, (optimalCost / budget) * 100 || 0)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-400 font-mono">
              <span>Reserve Remaining: ₹{Math.max(0, budget - optimalCost)} Lakhs</span>
              <span>Whole-Module Funding</span>
            </div>
          </div>

          {/* ADMIN-ONLY INSPECTOR */}
          {isAdmin ? (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/30">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>ADMIN INSPECTOR · 0/1 Knapsack Branch &amp; Bound</span>
                </div>
                <span className="text-xs font-mono text-amber-400 font-bold">O(2ⁿ)</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-[#090D16] border border-slate-800">
                  <span className="text-slate-400">Expanded Nodes</span>
                  <div className="text-lg font-bold font-mono text-amber-400 tabular-nums">
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
{`solveKnapsackBranchAndBound(items, budget):
  sort(items, by: return / cost descending)
  PQueue.insert(rootNode)
  while PQueue not empty:
    node = PQueue.popHighestBound()
    if node.bound <= bestReturn: prune(node); continue
    if node.cost + item.cost <= budget:
      updateBest(includeChild); PQueue.insert(includeChild)
    if excludeChild.bound > bestReturn:
      PQueue.insert(excludeChild)`}
              </pre>

              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-200">How it works:</strong> Orders items by yield ratio and computes a continuous Fractional Knapsack upper bound at each state. Subtrees whose optimistic bound cannot beat the best integer manifest are pruned immediately.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-[#0F1623] border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-slate-400">
                <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Capital allocation solver bounds and pruning logs are Admin-only.</span>
              </div>
              <button
                onClick={onRequestAdmin}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 whitespace-nowrap"
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
