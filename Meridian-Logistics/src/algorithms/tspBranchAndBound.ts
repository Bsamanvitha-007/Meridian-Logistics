import { Airport, TSPNode, TSPStep } from '../types';

export const DEFAULT_AIRPORTS: Airport[] = [
  { id: 'HYD', name: 'Hyderabad Airport', code: 'HYD', state: 'Telangana', x: 210, y: 240 },
  { id: 'BOM', name: 'Mumbai Airport', code: 'BOM', state: 'Maharashtra', x: 130, y: 220 },
  { id: 'DEL', name: 'Delhi Airport', code: 'DEL', state: 'Delhi NCR', x: 190, y: 90 },
  { id: 'BLR', name: 'Bengaluru Airport', code: 'BLR', state: 'Karnataka', x: 195, y: 310 },
  { id: 'MAA', name: 'Chennai Airport', code: 'MAA', state: 'Tamil Nadu', x: 235, y: 315 },
];

export const DEFAULT_TSP_MATRIX = [
  [0, 8, 12, 10, 15],
  [8, 0, 9, 11, 7],
  [12, 9, 0, 6, 10],
  [10, 11, 6, 0, 5],
  [15, 7, 10, 5, 0],
];

/**
 * Calculates Minimum Spanning Tree (MST) weight of a subset of vertices
 * using Prim's algorithm on the symmetric cost matrix.
 */
function calculateMSTCost(matrix: number[][], unvisited: number[]): number {
  if (unvisited.length <= 1) return 0;

  const inMST = new Set<number>();
  let totalWeight = 0;
  inMST.add(unvisited[0]);

  while (inMST.size < unvisited.length) {
    let minEdge = Infinity;
    let nextVertex = -1;

    for (const u of inMST) {
      for (const v of unvisited) {
        if (!inMST.has(v)) {
          if (matrix[u][v] < minEdge) {
            minEdge = matrix[u][v];
            nextVertex = v;
          }
        }
      }
    }

    if (minEdge === Infinity || nextVertex === -1) return Infinity; // disconnected
    totalWeight += minEdge;
    inMST.add(nextVertex);
  }

  return totalWeight;
}

/**
 * Mathematically admissible MST-based lower bound for symmetric TSP:
 * Bound = Current path cost
 *       + MST(unvisited vertices)
 *       + min edge from current path endpoint to unvisited
 *       + min edge from unvisited back to origin start vertex.
 */
export function calculateTSPLowerBound(
  matrix: number[][],
  path: number[],
  startVertex: number = 0
): number {
  const n = matrix.length;
  if (path.length === n) {
    // Return cost of path + closure edge back to start
    const last = path[path.length - 1];
    return calculatePathCost(matrix, path) + matrix[last][startVertex];
  }

  let currentPathCost = calculatePathCost(matrix, path);
  const visitedSet = new Set(path);
  const unvisited: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!visitedSet.has(i)) unvisited.push(i);
  }

  if (unvisited.length === 0) {
    const last = path[path.length - 1];
    return currentPathCost + matrix[last][startVertex];
  }

  // MST of unvisited
  const mstCost = calculateMSTCost(matrix, unvisited);
  if (mstCost === Infinity) return Infinity;

  // Min edge from current path endpoint to any unvisited vertex
  const lastVertex = path[path.length - 1];
  let minToUnvisited = Infinity;
  for (const u of unvisited) {
    if (matrix[lastVertex][u] < minToUnvisited) {
      minToUnvisited = matrix[lastVertex][u];
    }
  }

  // Min edge from any unvisited vertex back to starting vertex
  let minBackToStart = Infinity;
  for (const u of unvisited) {
    if (matrix[u][startVertex] < minBackToStart) {
      minBackToStart = matrix[u][startVertex];
    }
  }

  if (minToUnvisited === Infinity || minBackToStart === Infinity) return Infinity;

  return currentPathCost + mstCost + minToUnvisited + minBackToStart;
}

export function calculatePathCost(matrix: number[][], path: number[]): number {
  let cost = 0;
  for (let i = 0; i < path.length - 1; i++) {
    cost += matrix[path[i]][path[i + 1]];
  }
  return cost;
}

/**
 * Solves symmetric TSP using genuine Branch and Bound with a Priority Queue
 * (best-first search based on smallest lower bound).
 */
export function solveTSPBranchAndBound(
  matrix: number[][],
  startVertex: number = 0,
  airports: Airport[] = DEFAULT_AIRPORTS
): {
  optimalPath: number[];
  optimalCost: number;
  baselineCost: number;
  baselinePath: number[];
  expandedNodes: number;
  prunedNodes: number;
  treeNodes: TSPNode[];
  steps: TSPStep[];
} {
  const n = matrix.length;
  let nodeIdCounter = 1;
  const treeNodes: TSPNode[] = [];
  const steps: TSPStep[] = [];

  // Deterministic baseline: sequential loop [0, 1, 2, 3, 4, 0]
  const baselinePath: number[] = [];
  for (let i = 0; i < n; i++) {
    baselinePath.push((startVertex + i) % n);
  }
  baselinePath.push(startVertex);
  const baselineCost = calculatePathCost(matrix, baselinePath);

  // Initial root state
  const initialPath = [startVertex];
  const initialBound = calculateTSPLowerBound(matrix, initialPath, startVertex);
  const rootNode: TSPNode = {
    id: nodeIdCounter++,
    level: 0,
    path: initialPath,
    bound: initialBound,
    cost: 0,
    status: 'active',
  };
  treeNodes.push(rootNode);

  // Priority Queue ordered by lowest lower bound
  const queue: TSPNode[] = [rootNode];

  let bestCost = Infinity;
  let bestPath: number[] = [];
  let expandedCount = 0;
  let prunedCount = 0;

  steps.push({
    nodeId: rootNode.id,
    action: 'expand',
    activeNode: rootNode,
    currentBestCost: bestCost,
    currentBestPath: [],
    queueSize: queue.length,
    message: `Initialized Branch & Bound root at ${airports[startVertex].code}. Admissible MST lower bound = ${initialBound} cost units.`,
  });

  while (queue.length > 0) {
    // Sort queue by smallest lower bound (Best-First Search)
    queue.sort((a, b) => a.bound - b.bound);
    const current = queue.shift()!;
    expandedCount++;

    // Prune if bound >= best known complete solution
    if (current.bound >= bestCost) {
      current.status = 'pruned';
      current.reason = `Bound (${current.bound}) >= Incumbent (${bestCost})`;
      prunedCount++;
      steps.push({
        nodeId: current.id,
        action: 'prune',
        activeNode: current,
        currentBestCost: bestCost,
        currentBestPath: bestPath,
        queueSize: queue.length,
        message: `Pruning branch [${current.path.map((idx) => airports[idx].code).join('→')}]: Lower bound (${current.bound}) cannot beat best cargo route (${bestCost}).`,
      });
      continue;
    }

    current.status = 'explored';

    // Check if leaf node (all cities visited)
    if (current.path.length === n) {
      const lastVertex = current.path[n - 1];
      const returnCost = matrix[lastVertex][startVertex];
      const totalCost = current.cost + returnCost;
      const fullTour = [...current.path, startVertex];

      if (totalCost < bestCost) {
        bestCost = totalCost;
        bestPath = fullTour;
        current.status = 'optimal';
        steps.push({
          nodeId: current.id,
          action: 'update_best',
          activeNode: current,
          currentBestCost: bestCost,
          currentBestPath: bestPath,
          queueSize: queue.length,
          message: `New best cargo route discovered: ${fullTour.map((idx) => airports[idx].code).join(' → ')} with total cost ${bestCost} units!`,
        });
      }
      continue;
    }

    // Branch into child nodes for unvisited cities
    const visitedSet = new Set(current.path);
    const lastVertex = current.path[current.path.length - 1];

    for (let nextCity = 0; nextCity < n; nextCity++) {
      if (!visitedSet.has(nextCity)) {
        const edgeCost = matrix[lastVertex][nextCity];
        const newPath = [...current.path, nextCity];
        const newCost = current.cost + edgeCost;
        const childBound = calculateTSPLowerBound(matrix, newPath, startVertex);

        const childNode: TSPNode = {
          id: nodeIdCounter++,
          level: current.level + 1,
          path: newPath,
          bound: childBound,
          cost: newCost,
          status: 'active',
        };
        treeNodes.push(childNode);

        if (childBound >= bestCost) {
          childNode.status = 'pruned';
          childNode.reason = `Bound (${childBound}) >= Incumbent (${bestCost})`;
          prunedCount++;
          steps.push({
            nodeId: childNode.id,
            action: 'prune',
            activeNode: childNode,
            currentBestCost: bestCost,
            currentBestPath: bestPath,
            queueSize: queue.length,
            message: `Child branch [${newPath.map((idx) => airports[idx].code).join('→')}] pruned immediately: Lower bound (${childBound}) exceeds incumbent (${bestCost}).`,
          });
        } else {
          queue.push(childNode);
          steps.push({
            nodeId: childNode.id,
            action: 'expand',
            activeNode: childNode,
            currentBestCost: bestCost,
            currentBestPath: bestPath,
            queueSize: queue.length,
            message: `Promising child state enqueued: [${newPath.map((idx) => airports[idx].code).join('→')}]. Partial cost: ${newCost}, Admissible bound: ${childBound}.`,
          });
        }
      }
    }
  }

  return {
    optimalPath: bestPath,
    optimalCost: bestCost,
    baselineCost,
    baselinePath,
    expandedNodes: expandedCount,
    prunedNodes: prunedCount,
    treeNodes,
    steps,
  };
}
