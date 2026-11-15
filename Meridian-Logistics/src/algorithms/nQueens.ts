import { QueensStep } from '../types';

/**
 * Checks if placing a queen at (row, col) is safe against
 * all previously placed queens in rows 0..row-1.
 */
export function isQueenSafe(
  board: number[],
  row: number,
  col: number,
  obstacles?: Set<string>
): boolean {
  if (obstacles && obstacles.has(`${row},${col}`)) {
    return false;
  }

  for (let prevRow = 0; prevRow < row; prevRow++) {
    const prevCol = board[prevRow];
    if (prevCol === -1) continue;

    // Same column check
    if (prevCol === col) return false;

    // Diagonal check: |row - prevRow| === |col - prevCol|
    if (Math.abs(row - prevRow) === Math.abs(col - prevCol)) {
      return false;
    }
  }
  return true;
}

/**
 * Calculates all cells under attack on an N x N grid given a board array.
 * Useful for visual conflict rays in the simulator.
 */
export function getAttackedCells(board: number[], N: number = 8): [number, number][] {
  const attacked = new Set<string>();

  for (let r = 0; r < N; r++) {
    const c = board[r];
    if (c === -1 || c === undefined) continue;

    for (let targetR = 0; targetR < N; targetR++) {
      for (let targetC = 0; targetC < N; targetC++) {
        if (targetR === r && targetC === c) continue;

        // Same row or same column
        if (targetR === r || targetC === c) {
          attacked.add(`${targetR},${targetC}`);
        }
        // Diagonals
        if (Math.abs(targetR - r) === Math.abs(targetC - c)) {
          attacked.add(`${targetR},${targetC}`);
        }
      }
    }
  }

  return Array.from(attacked).map((str) => {
    const [r, c] = str.split(',').map(Number);
    return [r, c];
  });
}

/**
 * Solves the 8-Queens problem using pure Backtracking and returns
 * all distinct valid solution boards (92 when no obstacles are placed).
 */
export function solveAllNQueens(N: number = 8, obstacles?: Set<string>): number[][] {
  const solutions: number[][] = [];
  const currentBoard = new Array(N).fill(-1);

  function backtrack(row: number) {
    if (row === N) {
      solutions.push([...currentBoard]);
      return;
    }

    for (let col = 0; col < N; col++) {
      if (isQueenSafe(currentBoard, row, col, obstacles)) {
        currentBoard[row] = col;
        backtrack(row + 1);
        currentBoard[row] = -1; // Backtrack
      }
    }
  }

  backtrack(0);
  return solutions;
}

/**
 * Generates an animated execution trace of the 8-Queens backtracking search
 * up to the first valid solution (or all solutions if requested), recording
 * states explored, rejected, and backtracked.
 */
export function generateNQueensSteps(
  N: number = 8,
  stopAtFirstSolution: boolean = true,
  obstacles?: Set<string>
): {
  steps: QueensStep[];
  solutions: number[][];
  exploredStates: number;
  rejectedStates: number;
} {
  const steps: QueensStep[] = [];
  const solutions: number[][] = [];
  const board = new Array(N).fill(-1);
  let exploredStates = 0;
  let rejectedStates = 0;

  function backtrack(row: number): boolean {
    if (row === N) {
      solutions.push([...board]);
      steps.push({
        row: N - 1,
        col: board[N - 1],
        action: 'solution',
        board: [...board],
        message: `Goal state reached! Valid collision-free arrangement #${solutions.length} verified.`,
      });
      return stopAtFirstSolution;
    }

    for (let col = 0; col < N; col++) {
      if (obstacles && obstacles.has(`${row},${col}`)) {
        rejectedStates++;
        steps.push({
          row,
          col,
          action: 'conflict',
          board: [...board],
          message: `Obstacle detected at Row ${row + 1}, Col ${col + 1}. Skipping restricted zone.`,
        });
        continue;
      }

      exploredStates++;
      board[row] = col;

      steps.push({
        row,
        col,
        action: 'try',
        board: [...board],
        message: `Testing robot placement at Row ${row + 1}, Col ${col + 1} (depth ${row + 1}/${N}).`,
      });

      if (isQueenSafe(board, row, col, obstacles)) {
        steps.push({
          row,
          col,
          action: 'place',
          board: [...board],
          message: `Placement at Row ${row + 1}, Col ${col + 1} satisfies all column and diagonal constraints.`,
        });

        const shouldStop = backtrack(row + 1);
        if (shouldStop && stopAtFirstSolution) return true;

        // Backtrack
        board[row] = -1;
        steps.push({
          row,
          col,
          action: 'backtrack',
          board: [...board],
          message: `Backtracking from Row ${row + 1}, Col ${col + 1}. Resetting position to explore alternative branches.`,
        });
      } else {
        rejectedStates++;
        steps.push({
          row,
          col,
          action: 'conflict',
          board: [...board],
          message: `Collision detected! Laser line-of-sight conflict at Row ${row + 1}, Col ${col + 1}. Pruning branch.`,
        });
        board[row] = -1;
      }
    }

    return false;
  }

  backtrack(0);

  return {
    steps,
    solutions,
    exploredStates,
    rejectedStates,
  };
}
