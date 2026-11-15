import { KnapsackNode, KnapsackStep, ProjectItem } from '../types';

export const DEFAULT_PROJECTS: ProjectItem[] = [
  { id: 'proj-A', name: 'Project A (Autonomous Rover)', cost: 2, expectedReturn: 40, ratio: 20.0 },
  { id: 'proj-B', name: 'Project B (LiDAR Sensor Suite)', cost: 3, expectedReturn: 50, ratio: 16.67 },
  { id: 'proj-C', name: 'Project C (Neural Vision Co-Processor)', cost: 4, expectedReturn: 65, ratio: 16.25 },
  { id: 'proj-D', name: 'Project D (Drone Delivery Arm)', cost: 5, expectedReturn: 80, ratio: 16.0 },
  { id: 'proj-E', name: 'Project E (Battery Fast-Pack)', cost: 6, expectedReturn: 90, ratio: 15.0 },
  { id: 'proj-F', name: 'Project F (Telemetry Ground Station)', cost: 7, expectedReturn: 100, ratio: 14.28 },
];

export const DEFAULT_BUDGET = 12; // ₹12 Lakhs

/**
 * Calculates the fractional knapsack upper bound for a partial assignment.
 * Projects MUST already be sorted in descending order of ratio (return / cost).
 */
export function calculateKnapsackUpperBound(
  sortedProjects: ProjectItem[],
  budget: number,
  level: number,
  currentWeight: number,
  currentProfit: number
): number {
  if (currentWeight >= budget) return currentProfit;

  let bound = currentProfit;
  let remainingBudget = budget - currentWeight;
  let i = level;

  // Add whole projects while budget allows
  while (i < sortedProjects.length && sortedProjects[i].cost <= remainingBudget) {
    remainingBudget -= sortedProjects[i].cost;
    bound += sortedProjects[i].expectedReturn;
    i++;
  }

  // Add fraction of the next project if budget remains and projects are available
  if (i < sortedProjects.length && remainingBudget > 0 && sortedProjects[i].cost > 0) {
    bound += (remainingBudget * sortedProjects[i].expectedReturn) / sortedProjects[i].cost;
  }

  return Math.round(bound * 100) / 100;
}

/**
 * Solves 0/1 Knapsack using Branch and Bound with a Maximum Priority Queue
 * based on highest fractional upper bound.
 */
export function solveKnapsackBranchAndBound(
  projects: ProjectItem[],
  budget: number = DEFAULT_BUDGET
): {
  optimalSelection: boolean[]; // mapped back to original projects array order
  optimalCost: number;
  optimalReturn: number;
  baselineReturn: number;
  baselineSelection: boolean[];
  expandedNodes: number;
  prunedNodes: number;
  treeNodes: KnapsackNode[];
  steps: KnapsackStep[];
} {
  // Map projects with original index, then sort descending by ratio
  const indexed = projects.map((p, idx) => ({ ...p, originalIndex: idx }));
  indexed.sort((a, b) => b.expectedReturn / b.cost - a.expectedReturn / a.cost);

  let nodeIdCounter = 1;
  const treeNodes: KnapsackNode[] = [];
  const steps: KnapsackStep[] = [];

  // Deterministic baseline: Greedy selection by ratio (standard practical benchmark)
  let baselineWeight = 0;
  let baselineProfit = 0;
  const baselineSelection = new Array(projects.length).fill(false);
  for (const item of indexed) {
    if (baselineWeight + item.cost <= budget) {
      baselineWeight += item.cost;
      baselineProfit += item.expectedReturn;
      baselineSelection[item.originalIndex] = true;
    }
  }

  // Root node
  const rootBound = calculateKnapsackUpperBound(indexed, budget, 0, 0, 0);
  const rootNode: KnapsackNode = {
    id: nodeIdCounter++,
    level: 0,
    weight: 0,
    profit: 0,
    bound: rootBound,
    decision: 'root',
    path: [],
    status: 'active',
  };
  treeNodes.push(rootNode);

  // Priority queue ordered by highest bound (Best-First)
  const queue: KnapsackNode[] = [rootNode];

  let bestProfit = 0;
  let bestWeight = 0;
  let bestPath: boolean[] = [];
  let expandedCount = 0;
  let prunedCount = 0;

  steps.push({
    nodeId: rootNode.id,
    action: 'expand',
    activeNode: rootNode,
    bestProfit,
    bestSelection: new Array(projects.length).fill(false),
    message: `Initialized Knapsack state-space tree root. Fractional upper bound = ₹${rootBound}L for ₹${budget}L budget.`,
  });

  while (queue.length > 0) {
    // Sort descending by bound
    queue.sort((a, b) => b.bound - a.bound);
    const current = queue.shift()!;
    expandedCount++;

    // Prune if bound <= best integer profit found so far
    if (current.bound <= bestProfit) {
      current.status = 'pruned';
      current.reason = `Bound (₹${current.bound}L) <= Best Integer Return (₹${bestProfit}L)`;
      prunedCount++;
      steps.push({
        nodeId: current.id,
        action: 'prune',
        activeNode: current,
        bestProfit,
        bestSelection: bestPath,
        message: `Branch pruned: Fractional upper bound ₹${current.bound}L cannot surpass established portfolio return ₹${bestProfit}L.`,
      });
      continue;
    }

    current.status = 'explored';

    // If we've considered all items, continue
    if (current.level >= indexed.length) {
      continue;
    }

    const item = indexed[current.level];

    // 1. Branch INCLUDE current item (Left child)
    if (current.weight + item.cost <= budget) {
      const incWeight = current.weight + item.cost;
      const incProfit = current.profit + item.expectedReturn;
      const incPath = [...current.path, true];
      const incBound = calculateKnapsackUpperBound(
        indexed,
        budget,
        current.level + 1,
        incWeight,
        incProfit
      );

      const incNode: KnapsackNode = {
        id: nodeIdCounter++,
        level: current.level + 1,
        weight: incWeight,
        profit: incProfit,
        bound: incBound,
        decision: 'include',
        path: incPath,
        status: 'active',
      };
      treeNodes.push(incNode);

      // Check if this new feasible state improves incumbent
      if (incProfit > bestProfit) {
        bestProfit = incProfit;
        bestWeight = incWeight;
        bestPath = incPath;
        incNode.status = 'optimal';
        steps.push({
          nodeId: incNode.id,
          action: 'update_best',
          activeNode: incNode,
          bestProfit,
          bestSelection: incPath,
          message: `New incumbent portfolio found! Including ${item.name}. Total return = ₹${bestProfit}L (Invested: ₹${bestWeight}L / ₹${budget}L).`,
        });
      }

      if (incBound > bestProfit) {
        queue.push(incNode);
        steps.push({
          nodeId: incNode.id,
          action: 'expand',
          activeNode: incNode,
          bestProfit,
          bestSelection: bestPath,
          message: `Promising state: Selected ${item.name}. Weight: ₹${incWeight}L, Upper bound: ₹${incBound}L.`,
        });
      } else {
        incNode.status = 'pruned';
        incNode.reason = `Bound (₹${incBound}L) <= Best Return (₹${bestProfit}L)`;
        prunedCount++;
        steps.push({
          nodeId: incNode.id,
          action: 'prune',
          activeNode: incNode,
          bestProfit,
          bestSelection: bestPath,
          message: `Child state (Include ${item.name}) pruned: Upper bound ₹${incBound}L cannot improve incumbent.`,
        });
      }
    } else {
      // Infeasible (exceeds budget)
      prunedCount++;
      const infeasibleNode: KnapsackNode = {
        id: nodeIdCounter++,
        level: current.level + 1,
        weight: current.weight + item.cost,
        profit: current.profit + item.expectedReturn,
        bound: 0,
        decision: 'include',
        path: [...current.path, true],
        status: 'infeasible',
        reason: `Exceeds budget limit (${current.weight + item.cost}L > ${budget}L)`,
      };
      treeNodes.push(infeasibleNode);
      steps.push({
        nodeId: infeasibleNode.id,
        action: 'infeasible',
        activeNode: infeasibleNode,
        bestProfit,
        bestSelection: bestPath,
        message: `Infeasible branch: Adding ${item.name} exceeds investment budget (${current.weight + item.cost}L > ${budget}L). Pruned.`,
      });
    }

    // 2. Branch EXCLUDE current item (Right child)
    const excWeight = current.weight;
    const excProfit = current.profit;
    const excPath = [...current.path, false];
    const excBound = calculateKnapsackUpperBound(
      indexed,
      budget,
      current.level + 1,
      excWeight,
      excProfit
    );

    const excNode: KnapsackNode = {
      id: nodeIdCounter++,
      level: current.level + 1,
      weight: excWeight,
      profit: excProfit,
      bound: excBound,
      decision: 'exclude',
      path: excPath,
      status: 'active',
    };
    treeNodes.push(excNode);

    if (excBound > bestProfit) {
      queue.push(excNode);
      steps.push({
        nodeId: excNode.id,
        action: 'expand',
        activeNode: excNode,
        bestProfit,
        bestSelection: bestPath,
        message: `Alternative state: Excluded ${item.name}. Weight remains ₹${excWeight}L, Upper bound: ₹${excBound}L.`,
      });
    } else {
      excNode.status = 'pruned';
      excNode.reason = `Bound (₹${excBound}L) <= Best Return (₹${bestProfit}L)`;
      prunedCount++;
      steps.push({
        nodeId: excNode.id,
        action: 'prune',
        activeNode: excNode,
        bestProfit,
        bestSelection: bestPath,
        message: `Child state (Exclude ${item.name}) pruned: Upper bound ₹${excBound}L cannot improve incumbent.`,
      });
    }
  }

  // Map bestPath back to original project array indices
  const optimalSelection = new Array(projects.length).fill(false);
  for (let i = 0; i < bestPath.length; i++) {
    if (bestPath[i]) {
      optimalSelection[indexed[i].originalIndex] = true;
    }
  }

  return {
    optimalSelection,
    optimalCost: bestWeight,
    optimalReturn: bestProfit,
    baselineReturn: baselineProfit,
    baselineSelection,
    expandedNodes: expandedCount,
    prunedNodes: prunedCount,
    treeNodes,
    steps,
  };
}
