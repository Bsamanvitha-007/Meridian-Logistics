export type UserRole = 'guest' | 'operator' | 'admin';

export interface AuthUser {
  name: string;
  email: string;
  department: string;
  role: UserRole;
  signedInAt: string;
}

export type WorkspaceView =
  | 'mission-control'
  | 'capital'
  | 'pcb'
  | 'fleet'
  | 'cargo'
  | 'engine-diagnostics';

export type MissionScenarioId = 'standard' | 'tight-budget' | 'pcb-fault' | 'blocked-apron';

export interface MissionContextState {
  missionCode: string;
  missionTitle: string;
  originAirportIndex: number;
  activeScenario: MissionScenarioId | 'custom';
  // Stage 1: Capital & Payload Budget
  capitalBudget: number;
  capitalInvested: number;
  approvedProjectNames: string[];
  projectedValue: number;
  baselineValue: number;
  capitalPruned: number;
  capitalExpanded: number;
  capitalCleared: boolean;
  // Stage 2: Avionics Controller QA
  pcbCertified: boolean | null;
  pcbSequence: string;
  pcbPathIndices: number[];
  pcbMatrix: number[][];
  pcbActiveLinks: number;
  pcbExplored: number;
  pcbRejected: number;
  // Stage 3: Hub Robot Floor Staging
  fleetBoard: number[];
  fleetObstacleKeys: string[];
  fleetPlacedCount: number;
  fleetConflicts: number;
  fleetObstaclesCount: number;
  fleetSolutionCount: number;
  fleetCoordinates: string[];
  fleetExplored: number;
  fleetRejected: number;
  fleetCleared: boolean;
  // Stage 4: Air Cargo Dispatch
  cargoOptimalCost: number | null;
  cargoBaselineCost: number | null;
  cargoPathIndices: number[];
  cargoRouteCodes: string[];
  cargoExpanded: number;
  cargoPruned: number;
  cargoCleared: boolean;
}

// 8-Queens Types
export interface QueensStep {
  row: number;
  col: number;
  action: 'try' | 'place' | 'conflict' | 'backtrack' | 'solution';
  board: number[];
  message: string;
  attackedCells?: [number, number][];
}

// Hamiltonian Cycle Types
export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface HamiltonianStep {
  position: number;
  vertex: number;
  action: 'visit' | 'reject' | 'backtrack' | 'complete';
  currentPath: number[];
  message: string;
  rejectedEdge?: [number, number];
}

// TSP Types
export interface Airport {
  id: string;
  name: string;
  code: string;
  state: string;
  x: number;
  y: number;
}

export interface TSPNode {
  id: number;
  level: number;
  path: number[];
  bound: number;
  cost: number;
  status: 'active' | 'pruned' | 'optimal' | 'explored';
  reason?: string;
}

export interface TSPStep {
  nodeId: number;
  action: 'expand' | 'prune' | 'update_best';
  activeNode: TSPNode;
  currentBestCost: number;
  currentBestPath: number[];
  queueSize: number;
  message: string;
}

// Knapsack Types
export interface ProjectItem {
  id: string;
  name: string;
  cost: number; // in ₹ Lakhs
  expectedReturn: number; // in ₹ Lakhs
  ratio: number; // return / cost
}

export interface KnapsackNode {
  id: number;
  level: number;
  weight: number;
  profit: number;
  bound: number;
  decision: 'include' | 'exclude' | 'root';
  path: boolean[];
  status: 'active' | 'pruned' | 'optimal' | 'infeasible' | 'explored';
  reason?: string;
}

export interface KnapsackStep {
  nodeId: number;
  action: 'expand' | 'prune' | 'infeasible' | 'update_best';
  activeNode: KnapsackNode;
  bestProfit: number;
  bestSelection: boolean[];
  message: string;
}
