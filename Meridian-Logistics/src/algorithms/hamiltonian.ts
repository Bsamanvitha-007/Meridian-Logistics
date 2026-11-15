import { HamiltonianStep } from '../types';

/**
 * Checks if vertex v can be safely added at index 'pos' in the current Hamiltonian path.
 */
export function isValidHamiltonianMove(
  v: number,
  adjMatrix: number[][],
  path: number[],
  pos: number
): boolean {
  // Check if edge exists between last vertex in path and v
  if (adjMatrix[path[pos - 1]][v] === 0) {
    return false;
  }

  // Check if vertex has already been included in path
  for (let i = 0; i < pos; i++) {
    if (path[i] === v) {
      return false;
    }
  }

  return true;
}

/**
 * Finds a Hamiltonian Cycle using pure Backtracking and records
 * a rich step-by-step trace for simulation and visualization.
 */
export function findHamiltonianCycle(
  adjMatrix: number[][],
  startVertex: number = 0,
  nodeLabels: string[] = ['A', 'B', 'C', 'D', 'E', 'F']
): {
  cycleFound: boolean;
  cycle: number[];
  steps: HamiltonianStep[];
  exploredStates: number;
  rejectedStates: number;
} {
  const V = adjMatrix.length;
  const path = new Array(V).fill(-1);
  const steps: HamiltonianStep[] = [];
  let exploredStates = 0;
  let rejectedStates = 0;

  // Initialize path with starting vertex
  path[0] = startVertex;
  steps.push({
    position: 0,
    vertex: startVertex,
    action: 'visit',
    currentPath: [...path],
    message: `Initialized circuit traversal at Component ${nodeLabels[startVertex]} (Root Component).`,
  });

  function backtrack(pos: number): boolean {
    // Base case: If all vertices are included in path
    if (pos === V) {
      exploredStates++;
      // Check if there is an edge from the last vertex back to the first vertex
      const lastVertex = path[pos - 1];
      const firstVertex = path[0];

      if (adjMatrix[lastVertex][firstVertex] === 1) {
        steps.push({
          position: pos,
          vertex: firstVertex,
          action: 'complete',
          currentPath: [...path, firstVertex],
          message: `Closed loop verified! Conductive trace exists from Component ${nodeLabels[lastVertex]} back to Component ${nodeLabels[firstVertex]}. Valid Hamiltonian Cycle confirmed.`,
        });
        return true;
      } else {
        rejectedStates++;
        steps.push({
          position: pos,
          vertex: firstVertex,
          action: 'reject',
          currentPath: [...path],
          rejectedEdge: [lastVertex, firstVertex],
          message: `Cycle closure failed: No physical trace between Component ${nodeLabels[lastVertex]} and Component ${nodeLabels[firstVertex]}. Backtracking.`,
        });
        return false;
      }
    }

    // Try different vertices as candidates for the next position
    for (let v = 0; v < V; v++) {
      exploredStates++;

      if (isValidHamiltonianMove(v, adjMatrix, path, pos)) {
        path[pos] = v;
        steps.push({
          position: pos,
          vertex: v,
          action: 'visit',
          currentPath: [...path],
          message: `Valid trace found: Component ${nodeLabels[path[pos - 1]]} → Component ${nodeLabels[v]}. Extending path (Depth ${pos + 1}/${V}).`,
        });

        if (backtrack(pos + 1)) {
          return true;
        }

        // Backtrack
        path[pos] = -1;
        steps.push({
          position: pos,
          vertex: v,
          action: 'backtrack',
          currentPath: [...path],
          message: `Dead end reached through Component ${nodeLabels[v]}. Backtracking trace to previous junction.`,
        });
      } else {
        // Record rejected attempt if there's no edge or already visited
        const hasEdge = adjMatrix[path[pos - 1]][v] === 1;
        const alreadyVisited = path.slice(0, pos).includes(v);
        rejectedStates++;

        steps.push({
          position: pos,
          vertex: v,
          action: 'reject',
          currentPath: [...path],
          rejectedEdge: [path[pos - 1], v],
          message: `Rejected Component ${nodeLabels[v]}: ${
            !hasEdge ? 'No conductive trace exists.' : 'Component already visited in current circuit loop.'
          }`,
        });
      }
    }

    return false;
  }

  const cycleFound = backtrack(1);
  const finalCycle = cycleFound ? [...path, path[0]] : [];

  return {
    cycleFound,
    cycle: finalCycle,
    steps,
    exploredStates,
    rejectedStates,
  };
}

/**
 * Standard illustrative 6-node PCB graph with a guaranteed Hamiltonian Cycle:
 * A - B - C - D - E - F - A
 * plus cross-chassis electrical bridges.
 */
export const DEFAULT_PCB_GRAPH = [
  [0, 1, 1, 0, 0, 1], // A connects to B, C, F
  [1, 0, 1, 1, 0, 0], // B connects to A, C, D
  [1, 1, 0, 1, 1, 0], // C connects to A, B, D, E
  [0, 1, 1, 0, 1, 1], // D connects to B, C, E, F
  [0, 0, 1, 1, 0, 1], // E connects to C, D, F
  [1, 0, 0, 1, 1, 0], // F connects to A, D, E
];

export const DISCONNECTED_PCB_GRAPH = [
  [0, 1, 0, 0, 0, 0],
  [1, 0, 1, 0, 0, 0],
  [0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1],
  [0, 0, 0, 1, 0, 1],
  [0, 0, 0, 1, 1, 0],
];
