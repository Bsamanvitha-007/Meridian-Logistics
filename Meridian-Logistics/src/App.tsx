import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MissionPipeline } from './components/MissionPipeline';
import { MissionControlView } from './components/MissionControlView';
import { EngineDiagnosticsView } from './components/EngineDiagnosticsView';
import { KnapsackSimulator } from './components/KnapsackSimulator';
import { HamiltonianSimulator } from './components/HamiltonianSimulator';
import { NQueensSimulator } from './components/NQueensSimulator';
import { TSPSimulator } from './components/TSPSimulator';
import { AuthModal, AuthTab } from './components/AuthModal';
import {
  AuthUser,
  MissionContextState,
  MissionScenarioId,
  WorkspaceView,
} from './types';
import { generateNQueensSteps } from './algorithms/nQueens';
import { DEFAULT_PCB_GRAPH, findHamiltonianCycle } from './algorithms/hamiltonian';
import {
  DEFAULT_AIRPORTS,
  DEFAULT_TSP_MATRIX,
  solveTSPBranchAndBound,
} from './algorithms/tspBranchAndBound';
import {
  DEFAULT_PROJECTS,
  DEFAULT_BUDGET,
  solveKnapsackBranchAndBound,
} from './algorithms/knapsackBranchAndBound';

const ADMIN_PASS_STORAGE_KEY = 'meridian_admin_password';
const USER_SESSION_KEY = 'meridian_active_user';
const SAMPLE_OBSTACLES = ['1,2', '3,5', '5,1'];

function createInitialMissionState(): MissionContextState {
  const knap = solveKnapsackBranchAndBound(DEFAULT_PROJECTS, DEFAULT_BUDGET);
  const ham = findHamiltonianCycle(DEFAULT_PCB_GRAPH, 0, ['A', 'B', 'C', 'D', 'E', 'F']);
  const queens = generateNQueensSteps(8, true);
  const tsp = solveTSPBranchAndBound(DEFAULT_TSP_MATRIX, 0, DEFAULT_AIRPORTS);

  const initialBoard = queens.solutions[0] ?? new Array(8).fill(-1);
  const coords = initialBoard.map((c, r) => (c !== -1 ? `${String.fromCharCode(65 + c)}${r + 1}` : '—'));

  return {
    missionCode: 'MSN-2026-04',
    missionTitle: 'National Robotics & Freight Launch',
    originAirportIndex: 0,
    activeScenario: 'standard',
    capitalBudget: DEFAULT_BUDGET,
    capitalInvested: knap.optimalCost,
    approvedProjectNames: DEFAULT_PROJECTS.filter((_, i) => knap.optimalSelection[i]).map(
      (p) => p.name.split(' (')[0]
    ),
    projectedValue: knap.optimalReturn,
    baselineValue: knap.baselineReturn,
    capitalPruned: knap.prunedNodes,
    capitalExpanded: knap.expandedNodes,
    capitalCleared: knap.optimalReturn > 0,
    pcbCertified: ham.cycleFound,
    pcbSequence: ham.cycleFound
      ? ham.cycle.map((v) => ['A', 'B', 'C', 'D', 'E', 'F'][v]).join(' → ')
      : 'Disconnected',
    pcbPathIndices: ham.cycle,
    pcbMatrix: DEFAULT_PCB_GRAPH,
    pcbActiveLinks: DEFAULT_PCB_GRAPH.flat().reduce((acc, v) => acc + v, 0) / 2,
    pcbExplored: ham.exploredStates,
    pcbRejected: ham.rejectedStates,
    fleetBoard: initialBoard,
    fleetObstacleKeys: [],
    fleetPlacedCount: initialBoard.filter((c) => c !== -1).length,
    fleetConflicts: 0,
    fleetObstaclesCount: 0,
    fleetSolutionCount: 92,
    fleetCoordinates: coords,
    fleetExplored: queens.exploredStates,
    fleetRejected: queens.rejectedStates,
    fleetCleared: true,
    cargoOptimalCost: tsp.optimalCost,
    cargoBaselineCost: tsp.baselineCost,
    cargoPathIndices: tsp.optimalPath,
    cargoRouteCodes: tsp.optimalPath.map((idx) => DEFAULT_AIRPORTS[idx].code),
    cargoExpanded: tsp.expandedNodes,
    cargoPruned: tsp.prunedNodes,
    cargoCleared: true,
  };
}

export default function App() {
  const [activeView, setActiveView] = useState<WorkspaceView>('mission-control');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [syncToken, setSyncToken] = useState<number>(0);

  // Quick interactive controls state shared between Mission Control & Simulators
  const [externalBudget, setExternalBudget] = useState<number>(DEFAULT_BUDGET);
  const [externalFaultMode, setExternalFaultMode] = useState<boolean>(false);
  const [externalObstacleKeys, setExternalObstacleKeys] = useState<string[]>([]);
  const [obstaclesSyncToken, setObstaclesSyncToken] = useState<number>(0);

  const [adminPassword, setAdminPassword] = useState<string>(() => {
    try {
      return localStorage.getItem(ADMIN_PASS_STORAGE_KEY) || '1234';
    } catch {
      return '1234';
    }
  });

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = sessionStorage.getItem(USER_SESSION_KEY);
      return saved ? (JSON.parse(saved) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<AuthTab>('operator');

  const isAdmin = currentUser?.role === 'admin';
  const [mission, setMission] = useState<MissionContextState>(() => createInitialMissionState());

  const openAuth = (tab: AuthTab) => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const handleLoginOperator = (name: string, email: string, department: string) => {
    const user: AuthUser = {
      name,
      email,
      department,
      role: 'operator',
      signedInAt: new Date().toISOString(),
    };
    setCurrentUser(user);
    if (activeView === 'engine-diagnostics') {
      setActiveView('mission-control');
    }
    try {
      sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
    } catch {
      // ignore storage errors
    }
  };

  const handleLoginAdmin = (password: string): { success: boolean; error?: string } => {
    if (password === adminPassword) {
      const adminUser: AuthUser = {
        name: 'System Administrator',
        email: 'admin@meridian.ops',
        department: 'Core Optimization Systems',
        role: 'admin',
        signedInAt: new Date().toISOString(),
      };
      setCurrentUser(adminUser);
      try {
        sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(adminUser));
      } catch {
        // ignore storage errors
      }
      return { success: true };
    }
    return {
      success: false,
      error: 'Invalid administrator password. Please check your password and try again.',
    };
  };

  const handleResetAdminPassword = (
    oldPassword: string,
    newPassword: string,
    confirmPassword: string
  ): { success: boolean; error?: string } => {
    if (oldPassword !== adminPassword) {
      return { success: false, error: 'Old password does not match current administrator password.' };
    }
    if (newPassword.trim().length < 4) {
      return { success: false, error: 'New password must be at least 4 characters long.' };
    }
    if (newPassword !== confirmPassword) {
      return { success: false, error: 'New password and confirmation do not match.' };
    }

    setAdminPassword(newPassword);
    try {
      localStorage.setItem(ADMIN_PASS_STORAGE_KEY, newPassword);
    } catch {
      // ignore storage errors
    }
    return { success: true };
  };

  const handleLogout = () => {
    setCurrentUser(null);
    if (activeView === 'engine-diagnostics') {
      setActiveView('mission-control');
    }
    try {
      sessionStorage.removeItem(USER_SESSION_KEY);
    } catch {
      // ignore
    }
  };

  const handleOriginChange = (index: number) => {
    setMission((prev) => ({
      ...prev,
      originAirportIndex: index,
      activeScenario: 'custom',
    }));
  };

  const handleSyncMission = () => {
    setExternalBudget(DEFAULT_BUDGET);
    setExternalFaultMode(false);
    setExternalObstacleKeys([]);
    setObstaclesSyncToken((prev) => prev + 1);
    setSyncToken((prev) => prev + 1);
    setMission((prev) => ({ ...prev, activeScenario: 'standard' }));
  };

  const handleSelectScenario = (scenario: MissionScenarioId) => {
    if (scenario === 'standard') {
      setExternalBudget(12);
      setExternalFaultMode(false);
      setExternalObstacleKeys([]);
      setObstaclesSyncToken((prev) => prev + 1);
      setSyncToken((prev) => prev + 1);
      setMission((prev) => ({
        ...prev,
        originAirportIndex: 0,
        activeScenario: 'standard',
      }));
    } else if (scenario === 'tight-budget') {
      setExternalBudget(8);
      setExternalFaultMode(false);
      setExternalObstacleKeys([]);
      setObstaclesSyncToken((prev) => prev + 1);
      setMission((prev) => ({ ...prev, activeScenario: 'tight-budget' }));
    } else if (scenario === 'pcb-fault') {
      setExternalBudget(12);
      setExternalFaultMode(true);
      setExternalObstacleKeys([]);
      setObstaclesSyncToken((prev) => prev + 1);
      setMission((prev) => ({ ...prev, activeScenario: 'pcb-fault' }));
    } else if (scenario === 'blocked-apron') {
      setExternalBudget(12);
      setExternalFaultMode(false);
      setExternalObstacleKeys(SAMPLE_OBSTACLES);
      setObstaclesSyncToken((prev) => prev + 1);
      setMission((prev) => ({ ...prev, activeScenario: 'blocked-apron' }));
    }
  };

  const handleQuickBudgetChange = (nextBudget: number) => {
    setExternalBudget(nextBudget);
    setMission((prev) => ({ ...prev, activeScenario: 'custom' }));
  };

  const handleQuickTogglePcbFault = () => {
    setExternalFaultMode((prev) => !prev);
    setMission((prev) => ({ ...prev, activeScenario: 'custom' }));
  };

  const handleQuickToggleObstacles = () => {
    const nextObs = mission.fleetObstaclesCount > 0 ? [] : SAMPLE_OBSTACLES;
    setExternalObstacleKeys(nextObs);
    setObstaclesSyncToken((prev) => prev + 1);
    setMission((prev) => ({ ...prev, activeScenario: 'custom' }));
  };

  const effectiveView: WorkspaceView =
    activeView === 'engine-diagnostics' && !isAdmin ? 'mission-control' : activeView;

  return (
    <div className="min-h-screen bg-[#090C10] text-slate-100 flex selection:bg-sky-500/20 selection:text-sky-200">
      <Sidebar
        activeView={effectiveView}
        onSelectView={setActiveView}
        mission={mission}
        currentUser={currentUser}
        onOpenAuth={openAuth}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeView={effectiveView}
          mission={mission}
          airports={DEFAULT_AIRPORTS}
          onOriginChange={handleOriginChange}
          onSyncMission={handleSyncMission}
          currentUser={currentUser}
          onOpenAuth={openAuth}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <MissionPipeline
          activeView={effectiveView}
          onSelectView={setActiveView}
          mission={mission}
          airports={DEFAULT_AIRPORTS}
        />

        <main className="flex-1">
          {effectiveView === 'mission-control' && (
            <MissionControlView
              mission={mission}
              airports={DEFAULT_AIRPORTS}
              isAdmin={isAdmin}
              onSelectView={setActiveView}
              onOriginChange={handleOriginChange}
              onSelectScenario={handleSelectScenario}
              onQuickBudgetChange={handleQuickBudgetChange}
              onQuickTogglePcbFault={handleQuickTogglePcbFault}
              onQuickToggleObstacles={handleQuickToggleObstacles}
              onRequestAdmin={() => openAuth('admin')}
            />
          )}

          <div className={effectiveView === 'capital' ? 'block' : 'hidden'}>
            <KnapsackSimulator
              isAdmin={isAdmin}
              onRequestAdmin={() => openAuth('admin')}
              onSelectView={setActiveView}
              externalBudget={externalBudget}
              syncToken={syncToken}
              onUpdateStage={({
                budget,
                invested,
                approvedNames,
                optimalReturn,
                baselineReturn,
                expanded,
                pruned,
                cleared,
              }) => {
                setMission((prev) => ({
                  ...prev,
                  capitalBudget: budget,
                  capitalInvested: invested,
                  approvedProjectNames: approvedNames,
                  projectedValue: optimalReturn,
                  baselineValue: baselineReturn,
                  capitalExpanded: expanded,
                  capitalPruned: pruned,
                  capitalCleared: cleared,
                }));
              }}
            />
          </div>

          <div className={effectiveView === 'pcb' ? 'block' : 'hidden'}>
            <HamiltonianSimulator
              isAdmin={isAdmin}
              onRequestAdmin={() => openAuth('admin')}
              onSelectView={setActiveView}
              externalFaultMode={externalFaultMode}
              syncToken={syncToken}
              onUpdateStage={({
                found,
                sequence,
                pathIndices,
                matrix,
                activeLinks,
                explored,
                rejected,
              }) => {
                setMission((prev) => ({
                  ...prev,
                  pcbCertified: found,
                  pcbSequence: sequence,
                  pcbPathIndices: pathIndices,
                  pcbMatrix: matrix,
                  pcbActiveLinks: activeLinks,
                  pcbExplored: explored,
                  pcbRejected: rejected,
                }));
              }}
            />
          </div>

          <div className={effectiveView === 'fleet' ? 'block' : 'hidden'}>
            <NQueensSimulator
              isAdmin={isAdmin}
              onRequestAdmin={() => openAuth('admin')}
              onSelectView={setActiveView}
              originAirportIndex={mission.originAirportIndex}
              airports={DEFAULT_AIRPORTS}
              onOriginChange={handleOriginChange}
              externalObstacleKeys={externalObstacleKeys}
              obstaclesSyncToken={obstaclesSyncToken}
              syncToken={syncToken}
              onUpdateStage={({
                board,
                obstacleKeys,
                placedCount,
                conflicts,
                obstaclesCount,
                solutions,
                coordinates,
                explored,
                rejected,
                cleared,
              }) => {
                setMission((prev) => ({
                  ...prev,
                  fleetBoard: board,
                  fleetObstacleKeys: obstacleKeys,
                  fleetPlacedCount: placedCount,
                  fleetConflicts: conflicts,
                  fleetObstaclesCount: obstaclesCount,
                  fleetSolutionCount: solutions,
                  fleetCoordinates: coordinates,
                  fleetExplored: explored,
                  fleetRejected: rejected,
                  fleetCleared: cleared,
                }));
              }}
            />
          </div>

          <div className={effectiveView === 'cargo' ? 'block' : 'hidden'}>
            <TSPSimulator
              isAdmin={isAdmin}
              onRequestAdmin={() => openAuth('admin')}
              onSelectView={setActiveView}
              originAirportIndex={mission.originAirportIndex}
              airports={DEFAULT_AIRPORTS}
              onOriginChange={handleOriginChange}
              syncToken={syncToken}
              onUpdateStage={({
                optimalCost,
                baselineCost,
                pathIndices,
                routeCodes,
                expanded,
                pruned,
                cleared,
              }) => {
                setMission((prev) => ({
                  ...prev,
                  cargoOptimalCost: optimalCost,
                  cargoBaselineCost: baselineCost,
                  cargoPathIndices: pathIndices,
                  cargoRouteCodes: routeCodes,
                  cargoExpanded: expanded,
                  cargoPruned: pruned,
                  cargoCleared: cleared,
                }));
              }}
            />
          </div>

          {effectiveView === 'engine-diagnostics' && isAdmin && (
            <EngineDiagnosticsView
              mission={mission}
              onSyncMission={handleSyncMission}
              onSelectView={setActiveView}
            />
          )}
        </main>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        initialTab={authModalTab}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginOperator={handleLoginOperator}
        onLoginAdmin={handleLoginAdmin}
        onResetAdminPassword={handleResetAdminPassword}
        onLogout={handleLogout}
      />
    </div>
  );
}
