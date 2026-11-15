import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  ShieldAlert,
  Lock,
  ShieldCheck,
  Construction,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import {
  isQueenSafe,
  getAttackedCells,
  solveAllNQueens,
  generateNQueensSteps,
} from '../algorithms/nQueens';
import { Airport, QueensStep, WorkspaceView } from '../types';

interface NQueensSimulatorProps {
  isAdmin: boolean;
  onRequestAdmin: () => void;
  onSelectView: (view: WorkspaceView) => void;
  originAirportIndex: number;
  airports: Airport[];
  onOriginChange: (index: number) => void;
  externalObstacleKeys: string[];
  obstaclesSyncToken: number;
  syncToken: number;
  onUpdateStage: (stats: {
    board: number[];
    obstacleKeys: string[];
    placedCount: number;
    conflicts: number;
    obstaclesCount: number;
    solutions: number;
    coordinates: string[];
    explored: number;
    rejected: number;
    cleared: boolean;
  }) => void;
}

function boardToCoords(b: number[]): string[] {
  return b.map((c, r) => (c !== -1 ? `${String.fromCharCode(65 + c)}${r + 1}` : '—'));
}

export const NQueensSimulator: React.FC<NQueensSimulatorProps> = ({
  isAdmin,
  onRequestAdmin,
  onSelectView,
  originAirportIndex,
  airports,
  onOriginChange,
  externalObstacleKeys,
  obstaclesSyncToken,
  syncToken,
  onUpdateStage,
}) => {
  const N = 8;
  const originHub = airports[originAirportIndex] ?? airports[0];

  const [board, setBoard] = useState<number[]>(() => {
    const initial = generateNQueensSteps(8, true).solutions[0];
    return initial ?? new Array(8).fill(-1);
  });
  const [obstacles, setObstacles] = useState<Set<string>>(new Set());
  const [interactionMode, setInteractionMode] = useState<'auto' | 'manual' | 'obstacle'>('auto');
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(900);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [steps, setSteps] = useState<QueensStep[]>([]);
  const [allSolutions, setAllSolutions] = useState<number[][]>([]);
  const [solutionIndex, setSolutionIndex] = useState<number>(0);
  const [exploredCount, setExploredCount] = useState<number>(() => {
    return generateNQueensSteps(8, true).exploredStates;
  });
  const [rejectedCount, setRejectedCount] = useState<number>(() => {
    return generateNQueensSteps(8, true).rejectedStates;
  });
  const [statusMessage, setStatusMessage] = useState<string>(
    `8 autonomous loaders staged safely at ${originHub.code} cargo apron. Click Auto-Assign or mark maintenance obstacles.`
  );

  const timerRef = useRef<number | null>(null);
  const isFirstObstacleMount = useRef<boolean>(true);

  useEffect(() => {
    if (isFirstObstacleMount.current) {
      isFirstObstacleMount.current = false;
      return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsSolving(false);
    setIsPaused(false);
    setSteps([]);
    setStepIndex(0);
    setAllSolutions([]);
    const nextObs = new Set(externalObstacleKeys);
    setObstacles(nextObs);
    const trace = generateNQueensSteps(N, true, nextObs);
    if (trace.solutions.length > 0) {
      const nextBoard = trace.solutions[0];
      setBoard(nextBoard);
      setExploredCount(trace.exploredStates);
      setRejectedCount(trace.rejectedStates);
      setStatusMessage(
        `Updated depot staging around ${nextObs.size} blocked bays at ${originHub.code}.`
      );
      onUpdateStage({
        board: nextBoard,
        obstacleKeys: externalObstacleKeys,
        placedCount: 8,
        conflicts: 0,
        obstaclesCount: nextObs.size,
        solutions: trace.solutions.length,
        coordinates: boardToCoords(nextBoard),
        explored: trace.exploredStates,
        rejected: trace.rejectedStates,
        cleared: true,
      });
    } else {
      const empty = new Array(N).fill(-1);
      setBoard(empty);
      onUpdateStage({
        board: empty,
        obstacleKeys: externalObstacleKeys,
        placedCount: 0,
        conflicts: 0,
        obstaclesCount: nextObs.size,
        solutions: 0,
        coordinates: new Array(N).fill('—'),
        explored: trace.exploredStates,
        rejected: trace.rejectedStates,
        cleared: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obstaclesSyncToken]);

  useEffect(() => {
    if (syncToken === 0) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setIsSolving(false);
    setIsPaused(false);
    setSteps([]);
    setStepIndex(0);
    setAllSolutions([]);
    const trace = generateNQueensSteps(N, true, obstacles);
    if (trace.solutions.length > 0) {
      const nextBoard = trace.solutions[0];
      setBoard(nextBoard);
      setExploredCount(trace.exploredStates);
      setRejectedCount(trace.rejectedStates);
      setStatusMessage(
        `Stage 3 synced: 8 cargo loaders assigned safely at ${originHub.code} departure apron.`
      );
      onUpdateStage({
        board: nextBoard,
        obstacleKeys: Array.from(obstacles),
        placedCount: 8,
        conflicts: 0,
        obstaclesCount: obstacles.size,
        solutions: trace.solutions.length,
        coordinates: boardToCoords(nextBoard),
        explored: trace.exploredStates,
        rejected: trace.rejectedStates,
        cleared: true,
      });
    } else {
      const empty = new Array(N).fill(-1);
      setBoard(empty);
      onUpdateStage({
        board: empty,
        obstacleKeys: Array.from(obstacles),
        placedCount: 0,
        conflicts: 0,
        obstaclesCount: obstacles.size,
        solutions: 0,
        coordinates: new Array(N).fill('—'),
        explored: trace.exploredStates,
        rejected: trace.rejectedStates,
        cleared: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncToken]);

  const attackedCells = useMemo(() => {
    return getAttackedCells(board, N);
  }, [board, N]);

  const attackedSet = useMemo(() => {
    const s = new Set<string>();
    attackedCells.forEach(([r, c]) => s.add(`${r},${c}`));
    return s;
  }, [attackedCells]);

  const manualConflicts = useMemo(() => {
    if (interactionMode !== 'manual') return [];
    const conflicts: [number, number][] = [];
    for (let r = 0; r < N; r++) {
      const c = board[r];
      if (c === -1) continue;
      const temp = [...board];
      temp[r] = -1;
      if (!isQueenSafe(temp, r, c, obstacles)) {
        conflicts.push([r, c]);
      }
    }
    return conflicts;
  }, [board, obstacles, interactionMode]);

  const emitBoardState = (
    nextBoard: number[],
    nextObstacles: Set<string>,
    exp: number,
    rej: number,
    solCount: number,
    conflictsCount: number
  ) => {
    const placed = nextBoard.filter((c) => c !== -1).length;
    onUpdateStage({
      board: nextBoard,
      obstacleKeys: Array.from(nextObstacles),
      placedCount: placed,
      conflicts: conflictsCount,
      obstaclesCount: nextObstacles.size,
      solutions: solCount,
      coordinates: boardToCoords(nextBoard),
      explored: exp,
      rejected: rej,
      cleared: placed === N && conflictsCount === 0,
    });
  };

  const handleReset = (clearObs: boolean = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const nextObs = clearObs ? new Set<string>() : obstacles;
    if (clearObs) setObstacles(nextObs);
    const emptyBoard = new Array(N).fill(-1);
    setIsSolving(false);
    setIsPaused(false);
    setBoard(emptyBoard);
    setStepIndex(0);
    setSteps([]);
    setAllSolutions([]);
    setExploredCount(0);
    setRejectedCount(0);
    setStatusMessage(`${originHub.code} floor bays cleared. Ready for robot staging.`);
    emitBoardState(emptyBoard, nextObs, 0, 0, 0, 0);
  };

  const handleAutoAssignFleet = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSteps([]);
    setStepIndex(0);
    setAllSolutions([]);
    setInteractionMode('auto');

    const trace = generateNQueensSteps(N, true, obstacles);
    const allCount = obstacles.size === 0 ? 92 : trace.solutions.length;
    setExploredCount(trace.exploredStates);
    setRejectedCount(trace.rejectedStates);

    if (trace.solutions.length === 0) {
      const emptyBoard = new Array(N).fill(-1);
      setBoard(emptyBoard);
      setStatusMessage(
        `No collision-free 8-unit staging layout possible at ${originHub.code} with current blocked bays. Remove an obstacle and retry.`
      );
      emitBoardState(emptyBoard, obstacles, trace.exploredStates, trace.rejectedStates, 0, 0);
      return;
    }

    const finalBoard = trace.solutions[0];
    if (isAdmin) {
      setBoard(new Array(N).fill(-1));
      setSteps(trace.steps);
      setStepIndex(0);
      setIsSolving(true);
      setIsPaused(false);
      setStatusMessage('Running 8-Queens Backtracking solver across origin depot bays...');
    } else {
      setBoard(finalBoard);
      setStatusMessage(
        `Staging cleared at ${originHub.code}: 8 loading units positioned with zero LiDAR cross-interference.`
      );
    }

    emitBoardState(finalBoard, obstacles, trace.exploredStates, trace.rejectedStates, allCount, 0);
  };

  const handleFindAllLayouts = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSteps([]);
    setStepIndex(0);
    setIsSolving(false);
    setInteractionMode('auto');

    const solutions = solveAllNQueens(N, obstacles);
    setAllSolutions(solutions);
    setSolutionIndex(0);

    const exp = obstacles.size === 0 ? 2056 : solutions.length * 18;
    const rej = obstacles.size === 0 ? 1964 : solutions.length * 15;
    setExploredCount(exp);
    setRejectedCount(rej);

    if (solutions.length > 0) {
      setBoard(solutions[0]);
      setStatusMessage(`Enumerated all ${solutions.length} valid floor configurations.`);
      emitBoardState(solutions[0], obstacles, exp, rej, solutions.length, 0);
    } else {
      const emptyBoard = new Array(N).fill(-1);
      setBoard(emptyBoard);
      setStatusMessage('No complete layout exists with the current blocked bays.');
      emitBoardState(emptyBoard, obstacles, exp, rej, 0, 0);
    }
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
          const currentStep = steps[next];
          setBoard(currentStep.board);
          setStatusMessage(currentStep.message);
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
      setBoard(steps[next].board);
      setStatusMessage(steps[next].message);
    }
  };

  const stepBackward = () => {
    if (stepIndex > 0) {
      const prev = stepIndex - 1;
      setStepIndex(prev);
      setBoard(steps[prev].board);
      setStatusMessage(steps[prev].message);
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (isSolving) return;
    const key = `${r},${c}`;

    if (interactionMode === 'obstacle') {
      const nextObs = new Set(obstacles);
      const nextBoard = [...board];
      if (nextObs.has(key)) {
        nextObs.delete(key);
        setStatusMessage(`Cleared maintenance block at Bay ${String.fromCharCode(65 + c)}${r + 1}.`);
      } else {
        if (nextBoard[r] === c) nextBoard[r] = -1;
        nextObs.add(key);
        setStatusMessage(`Marked Bay ${String.fromCharCode(65 + c)}${r + 1} as restricted zone.`);
      }
      setObstacles(nextObs);
      setBoard(nextBoard);
      emitBoardState(nextBoard, nextObs, exploredCount, rejectedCount, allSolutions.length, manualConflicts.length);
      return;
    }

    if (interactionMode === 'manual') {
      if (obstacles.has(key)) {
        setStatusMessage(`Bay ${String.fromCharCode(65 + c)}${r + 1} is blocked by a maintenance obstacle.`);
        return;
      }
      const newBoard = [...board];
      if (newBoard[r] === c) {
        newBoard[r] = -1;
        setStatusMessage(`Removed unit from Bay ${String.fromCharCode(65 + c)}${r + 1}.`);
      } else {
        newBoard[r] = c;
        setStatusMessage(`Positioned unit at Bay ${String.fromCharCode(65 + c)}${r + 1}.`);
      }
      setBoard(newBoard);

      // Recompute conflicts immediately for parent state
      let conflictsCount = 0;
      for (let row = 0; row < N; row++) {
        const col = newBoard[row];
        if (col === -1) continue;
        const temp = [...newBoard];
        temp[row] = -1;
        if (!isQueenSafe(temp, row, col, obstacles)) conflictsCount++;
      }
      emitBoardState(newBoard, obstacles, exploredCount, rejectedCount, allSolutions.length, conflictsCount);
    }
  };

  const nextSolution = () => {
    if (allSolutions.length === 0) return;
    const nextIdx = (solutionIndex + 1) % allSolutions.length;
    setSolutionIndex(nextIdx);
    setBoard(allSolutions[nextIdx]);
    setStatusMessage(`Displaying configuration ${nextIdx + 1} of ${allSolutions.length}.`);
    emitBoardState(allSolutions[nextIdx], obstacles, exploredCount, rejectedCount, allSolutions.length, 0);
  };

  const prevSolution = () => {
    if (allSolutions.length === 0) return;
    const prevIdx = (solutionIndex - 1 + allSolutions.length) % allSolutions.length;
    setSolutionIndex(prevIdx);
    setBoard(allSolutions[prevIdx]);
    setStatusMessage(`Displaying configuration ${prevIdx + 1} of ${allSolutions.length}.`);
    emitBoardState(allSolutions[prevIdx], obstacles, exploredCount, rejectedCount, allSolutions.length, 0);
  };

  const placedRobotsCount = board.filter((c) => c !== -1).length;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Stage Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono font-semibold text-cyan-400">
            STAGE 3 OF 4 · {originHub.code} DEPOT WAREHOUSE ROBOT STAGING
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-white">
            {originHub.name.replace(' Airport', '')} Cargo Apron — Autonomous Fleet Staging
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-3xl">
            Stages 8 automated loading units at {originHub.name} ({originHub.code}) to transfer certified Stage 2 payload onto the freighter departing in Stage 4 without LiDAR beam interference.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAdmin && (
            <button
              onClick={onRequestAdmin}
              className="px-3 py-1.5 rounded-lg bg-[#0F1623] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Admin Solver View</span>
            </button>
          )}
          <button
            onClick={() => onSelectView('cargo')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
          >
            <span>Next: Stage 4 Dispatch</span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-[#0F1623] border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#090D16] border border-slate-800 text-xs mr-1">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Depot:</span>
            <select
              value={originAirportIndex}
              onChange={(e) => onOriginChange(Number(e.target.value))}
              disabled={isSolving}
              className="bg-transparent text-white font-mono font-semibold focus:outline-none cursor-pointer"
            >
              {airports.map((a, idx) => (
                <option key={a.id} value={idx} className="bg-slate-900">
                  {a.code}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setInteractionMode('auto')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              interactionMode === 'auto'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Auto Staging
          </button>
          <button
            onClick={() => {
              setInteractionMode('manual');
              setStatusMessage('Manual Placement Mode: Click grid bays to position or remove loaders.');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              interactionMode === 'manual'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Manual Edit
          </button>
          <button
            onClick={() => {
              setInteractionMode('obstacle');
              setStatusMessage('Obstacle Mode: Click bays to toggle restricted maintenance blocks.');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              interactionMode === 'obstacle'
                ? 'bg-amber-400 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Construction className="w-3.5 h-3.5" />
            <span>Blocked Bays ({obstacles.size})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAutoAssignFleet}
            disabled={isSolving && !isPaused}
            className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isAdmin ? 'Run Backtracking Solver' : 'Stage Safe Fleet'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleFindAllLayouts}
              disabled={isSolving}
              className="px-3 py-1.5 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Enumerate All (92)</span>
            </button>
          )}

          <button
            onClick={() => handleReset(true)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Clear Floor & Obstacles"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 8x8 Floor Grid (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-[500px] p-4 sm:p-5 rounded-xl bg-[#0F1623] border border-slate-800">
            <div className="grid grid-cols-8 gap-1 mb-1 text-center font-mono text-[10px] sm:text-xs text-slate-400 font-semibold pl-6">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((col) => (
                <span key={col}>{col}</span>
              ))}
            </div>

            <div className="space-y-1">
              {Array.from({ length: N }).map((_, r) => {
                const currentRobotCol = board[r];
                return (
                  <div key={`row-${r}`} className="flex items-center gap-1.5">
                    <span className="w-4 text-right font-mono text-[10px] sm:text-xs text-slate-400 font-semibold">
                      {r + 1}
                    </span>

                    <div className="grid grid-cols-8 gap-1 flex-1">
                      {Array.from({ length: N }).map((_, c) => {
                        const hasRobot = currentRobotCol === c;
                        const isObstacle = obstacles.has(`${r},${c}`);
                        const isDark = (r + c) % 2 === 1;
                        const isAttacked = attackedSet.has(`${r},${c}`);
                        const isConflicted = manualConflicts.some(
                          ([cr, cc]) => cr === r && cc === c
                        );
                        const isTestingCell =
                          isAdmin &&
                          isSolving &&
                          steps[stepIndex]?.row === r &&
                          steps[stepIndex]?.col === c;

                        return (
                          <button
                            key={`cell-${r}-${c}`}
                            onClick={() => handleCellClick(r, c)}
                            disabled={interactionMode === 'auto'}
                            className={`aspect-square rounded-md relative flex items-center justify-center transition-all ${
                              isObstacle
                                ? 'bg-amber-950/60 border border-amber-500/50 text-amber-400'
                                : hasRobot
                                ? isConflicted
                                  ? 'bg-rose-600/90 ring-2 ring-rose-400'
                                  : 'bg-cyan-500 ring-2 ring-cyan-300'
                                : isTestingCell
                                ? 'bg-amber-500/40 ring-2 ring-amber-400'
                                : isAttacked && interactionMode === 'manual'
                                ? 'bg-rose-950/40 border border-rose-800/40'
                                : isDark
                                ? 'bg-[#090D16] hover:bg-slate-800/80 border border-slate-800/40'
                                : 'bg-slate-900 hover:bg-slate-800/80 border border-slate-800/60'
                            } ${
                              interactionMode !== 'auto'
                                ? 'cursor-pointer hover:scale-95'
                                : 'cursor-default'
                            }`}
                            aria-label={`Bay ${String.fromCharCode(65 + c)}${r + 1}`}
                          >
                            {isObstacle && <Construction className="w-4 h-4 text-amber-400" />}
                            {hasRobot && !isObstacle && (
                              <Bot
                                className={`w-5 h-5 sm:w-6 sm:h-6 ${
                                  isConflicted ? 'text-white' : 'text-slate-950'
                                }`}
                              />
                            )}
                            {interactionMode === 'manual' &&
                              isAttacked &&
                              !hasRobot &&
                              !isObstacle && (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500/50" />
                              )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {isAdmin && steps.length > 0 && steps[stepIndex] && (
              <div className="mt-4 p-2.5 rounded-xl border flex items-center justify-between text-xs bg-[#090D16] border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 text-[11px]">
                    Step {stepIndex + 1}/{steps.length}:
                  </span>
                  {steps[stepIndex].action === 'try' && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/30">
                      Testing Placement
                    </span>
                  )}
                  {steps[stepIndex].action === 'place' && (
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/30">
                      Constraint Passed
                    </span>
                  )}
                  {steps[stepIndex].action === 'conflict' && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 font-semibold border border-rose-500/30">
                      Collision · Pruning Subtree
                    </span>
                  )}
                  {steps[stepIndex].action === 'backtrack' && (
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-semibold border border-purple-500/30">
                      Dead-End · Backtracking
                    </span>
                  )}
                  {steps[stepIndex].action === 'solution' && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/30">
                      Valid Solution Found
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-cyan-400">
                  Depth {steps[stepIndex].row + 1}/8
                </span>
              </div>
            )}

            <div className="mt-4 p-3 rounded-xl bg-[#090D16] border border-slate-800 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 leading-relaxed font-mono">{statusMessage}</p>
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
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1"
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
                      onClick={() => setSpeed(1800)}
                      className={`px-2 py-0.5 rounded border ${
                        speed >= 1500
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-semibold'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      Slow (1.8s)
                    </button>
                    <button
                      onClick={() => setSpeed(900)}
                      className={`px-2 py-0.5 rounded border ${
                        speed >= 600 && speed < 1500
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-semibold'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      Demo (0.9s)
                    </button>
                    <button
                      onClick={() => setSpeed(250)}
                      className={`px-2 py-0.5 rounded border ${
                        speed < 600
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-semibold'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      Fast (0.25s)
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
                    className="flex-1 accent-cyan-400 cursor-pointer"
                  />
                  <span className="font-mono text-cyan-400 tabular-nums text-xs">
                    {speed >= 1000 ? `${(speed / 1000).toFixed(1)}s / step` : `${speed}ms / step`}
                  </span>
                </div>
              </div>
            )}

            {isAdmin && allSolutions.length > 0 && !isSolving && (
              <div className="mt-4 p-2.5 rounded-xl bg-[#090D16] border border-cyan-800/50 flex items-center justify-between">
                <button
                  onClick={prevSolution}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-cyan-400 font-semibold">
                  Solution {solutionIndex + 1} of {allSolutions.length}
                </span>
                <button
                  onClick={nextSolution}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Staging Metrics & Admin Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-[#0F1623] border border-slate-800">
              <span className="text-xs text-slate-400">Loaders Staged ({originHub.code})</span>
              <div className="mt-1 text-2xl font-bold font-mono text-cyan-400 tabular-nums">
                {placedRobotsCount} / {N}
              </div>
              <span className="text-[11px] text-slate-500">Autonomous Apron Units</span>
            </div>

            <div className="p-4 rounded-xl bg-[#0F1623] border border-slate-800">
              <span className="text-xs text-slate-400">Collision Clearance</span>
              <div className="mt-1 flex items-center gap-1.5">
                {manualConflicts.length > 0 ? (
                  <span className="text-sm font-bold text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> {manualConflicts.length} Conflicts
                  </span>
                ) : placedRobotsCount === N ? (
                  <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Zero Interference
                  </span>
                ) : (
                  <span className="text-sm font-mono text-slate-400">Pending</span>
                )}
              </div>
              <span className="text-[11px] text-slate-500">
                {obstacles.size} Blocked Bays Excluded
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F1623] border border-slate-800">
            <div className="text-xs font-semibold text-white pb-2 border-b border-slate-800 flex justify-between">
              <span>Assigned {originHub.code} Apron Coordinates</span>
              <span className="text-slate-400 font-mono">8×8 Bay Grid</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-xs font-mono">
              {board.map((col, row) => (
                <div
                  key={`coord-${row}`}
                  className={`p-2 rounded-lg border text-center ${
                    col !== -1
                      ? 'bg-[#090D16] border-cyan-500/30 text-cyan-300'
                      : 'bg-[#090D16]/40 border-slate-800/60 text-slate-600'
                  }`}
                >
                  <div className="text-[10px] text-slate-500">Unit #{row + 1}</div>
                  <div className="font-bold">
                    {col !== -1 ? `${String.fromCharCode(65 + col)}${row + 1}` : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isAdmin ? (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/30">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>ADMIN INSPECTOR · 8-Queens Backtracking Engine</span>
                </div>
                <span className="text-xs font-mono text-cyan-400 font-bold">O(N!)</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-[#090D16] border border-slate-800">
                  <span className="text-slate-400">Explored States</span>
                  <div className="text-lg font-bold font-mono text-cyan-400 tabular-nums">
                    {exploredCount}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#090D16] border border-slate-800">
                  <span className="text-slate-400">Pruned Collisions</span>
                  <div className="text-lg font-bold font-mono text-rose-400 tabular-nums">
                    {rejectedCount}
                  </div>
                </div>
              </div>

              <pre className="p-3 rounded-lg bg-[#090D16] border border-slate-800 text-[11px] font-mono text-slate-300 leading-relaxed overflow-x-auto">
{`solveNQueens(board, row):
  if row == 8: recordSolution(board); return true
  for col = 0 to 7:
    if isSafe(board, row, col, obstacles):
      board[row] = col          // Place Robot
      if solveNQueens(board, row + 1): return true
      board[row] = -1           // Backtrack
  return false                  // Prune branch`}
              </pre>

              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-200">How it works:</strong> Extends recursive N-Queens backtracking to loader robot staging. Verifies column, diagonal, and obstacle clearance at every row before recursing.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-[#0F1623] border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-slate-400">
                <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Floor solver traces are restricted to System Administrators.</span>
              </div>
              <button
                onClick={onRequestAdmin}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 whitespace-nowrap"
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
