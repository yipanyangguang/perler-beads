import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CellData {
  id: string;
  color: string | null; // null means empty/transparent
  x: number;
  y: number;
}

export interface ProjectState {
  id: string;
  name: string;
  width: number;
  height: number;
  grid: CellData[][];
  markedCells: Record<string, boolean>; // id -> isMarked
  lastModified: number;
}

export interface HistoryItem {
  name: string;
  path: string;
  lastOpened: number;
}

interface ProjectStore extends ProjectState {
  history: HistoryItem[];
  // Actions
  createProject: (width: number, height: number, name?: string) => void;
  loadProject: (project: ProjectState) => void;
  setCellColor: (x: number, y: number, color: string | null) => void;
  moveGrid: (direction: 'up' | 'down' | 'left' | 'right') => void;
  toggleMarkCell: (id: string) => void;
  resetMarks: () => void;
  updateProjectName: (name: string) => void;
  addToHistory: (name: string, path: string) => void;
  removeFromHistory: (path: string) => void;
  addRow: (index: number) => void;
  deleteRow: (index: number) => void;
  addColumn: (index: number) => void;
  deleteColumn: (index: number) => void;
}

const generateGrid = (width: number, height: number): CellData[][] => {
  const grid: CellData[][] = [];
  for (let y = 0; y < height; y++) {
    const row: CellData[] = [];
    for (let x = 0; x < width; x++) {
      row.push({
        id: `${x}-${y}`,
        color: null,
        x,
        y,
      });
    }
    grid.push(row);
  }
  return grid;
};

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      id: 'default',
      name: 'Untitled Project',
      width: 20,
      height: 20,
      grid: generateGrid(20, 20),
      markedCells: {},
      lastModified: Date.now(),
      history: [],

      createProject: (width, height, name = 'Untitled Project') => {
        set({
          id: crypto.randomUUID(),
          name,
          width,
          height,
          grid: generateGrid(width, height),
          markedCells: {},
          lastModified: Date.now(),
        });
      },

      loadProject: (project) => {
        set({ ...project, lastModified: Date.now() });
      },

      setCellColor: (x, y, color) =>
        set((state) => {
          const newGrid = [...state.grid];
          // Create a shallow copy of the row to avoid mutation
          newGrid[y] = [...newGrid[y]];
          newGrid[y][x] = { ...newGrid[y][x], color };
          return { grid: newGrid, lastModified: Date.now() };
        }),

      moveGrid: (direction) =>
        set((state) => {
          const { width, height, grid } = state;
          const newGrid = grid.map(row => row.map(cell => ({ ...cell }))); // Deep copy for safety

          if (direction === 'up') {
            for (let y = 0; y < height - 1; y++) {
              for (let x = 0; x < width; x++) {
                newGrid[y][x].color = newGrid[y + 1][x].color;
              }
            }
            for (let x = 0; x < width; x++) {
              newGrid[height - 1][x].color = null;
            }
          } else if (direction === 'down') {
            for (let y = height - 1; y > 0; y--) {
              for (let x = 0; x < width; x++) {
                newGrid[y][x].color = newGrid[y - 1][x].color;
              }
            }
            for (let x = 0; x < width; x++) {
              newGrid[0][x].color = null;
            }
          } else if (direction === 'left') {
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width - 1; x++) {
                newGrid[y][x].color = newGrid[y][x + 1].color;
              }
              newGrid[y][width - 1].color = null;
            }
          } else if (direction === 'right') {
            for (let y = 0; y < height; y++) {
              for (let x = width - 1; x > 0; x--) {
                newGrid[y][x].color = newGrid[y][x - 1].color;
              }
              newGrid[y][0].color = null;
            }
          }

          return { grid: newGrid, lastModified: Date.now() };
        }),

      addRow: (index) => set((state) => {
        const newGrid = [...state.grid];
        const newRow: CellData[] = [];
        for (let x = 0; x < state.width; x++) {
          newRow.push({
            id: `${x}-${index}`, // Temporary ID, will be re-indexed
            color: null,
            x,
            y: index,
          });
        }
        newGrid.splice(index, 0, newRow);
        
        // Re-index
        const updatedGrid = newGrid.map((row, y) => 
          row.map((cell, x) => ({
            ...cell,
            x,
            y,
            id: `${x}-${y}`
          }))
        );

        // Update marks
        const newMarks: Record<string, boolean> = {};
        Object.keys(state.markedCells).forEach(key => {
          const [xStr, yStr] = key.split('-');
          const x = parseInt(xStr);
          const y = parseInt(yStr);
          if (y >= index) {
            newMarks[`${x}-${y + 1}`] = true;
          } else {
            newMarks[key] = true;
          }
        });

        return {
          grid: updatedGrid,
          height: state.height + 1,
          markedCells: newMarks,
          lastModified: Date.now()
        };
      }),

      deleteRow: (index) => set((state) => {
        if (state.height <= 1) return state;
        const newGrid = [...state.grid];
        newGrid.splice(index, 1);

        // Re-index
        const updatedGrid = newGrid.map((row, y) => 
          row.map((cell, x) => ({
            ...cell,
            x,
            y,
            id: `${x}-${y}`
          }))
        );

        // Update marks
        const newMarks: Record<string, boolean> = {};
        Object.keys(state.markedCells).forEach(key => {
          const [xStr, yStr] = key.split('-');
          const x = parseInt(xStr);
          const y = parseInt(yStr);
          if (y === index) return;
          if (y > index) {
            newMarks[`${x}-${y - 1}`] = true;
          } else {
            newMarks[key] = true;
          }
        });

        return {
          grid: updatedGrid,
          height: state.height - 1,
          markedCells: newMarks,
          lastModified: Date.now()
        };
      }),

      addColumn: (index) => set((state) => {
        const newGrid = state.grid.map(row => {
          const newRow = [...row];
          newRow.splice(index, 0, {
            id: 'temp',
            color: null,
            x: index,
            y: row[0].y
          });
          return newRow;
        });

        // Re-index
        const updatedGrid = newGrid.map((row, y) => 
          row.map((cell, x) => ({
            ...cell,
            x,
            y,
            id: `${x}-${y}`
          }))
        );

        // Update marks
        const newMarks: Record<string, boolean> = {};
        Object.keys(state.markedCells).forEach(key => {
          const [xStr, yStr] = key.split('-');
          const x = parseInt(xStr);
          const y = parseInt(yStr);
          if (x >= index) {
            newMarks[`${x + 1}-${y}`] = true;
          } else {
            newMarks[key] = true;
          }
        });

        return {
          grid: updatedGrid,
          width: state.width + 1,
          markedCells: newMarks,
          lastModified: Date.now()
        };
      }),

      deleteColumn: (index) => set((state) => {
        if (state.width <= 1) return state;
        const newGrid = state.grid.map(row => {
          const newRow = [...row];
          newRow.splice(index, 1);
          return newRow;
        });

        // Re-index
        const updatedGrid = newGrid.map((row, y) => 
          row.map((cell, x) => ({
            ...cell,
            x,
            y,
            id: `${x}-${y}`
          }))
        );

        // Update marks
        const newMarks: Record<string, boolean> = {};
        Object.keys(state.markedCells).forEach(key => {
          const [xStr, yStr] = key.split('-');
          const x = parseInt(xStr);
          const y = parseInt(yStr);
          if (x === index) return;
          if (x > index) {
            newMarks[`${x - 1}-${y}`] = true;
          } else {
            newMarks[key] = true;
          }
        });

        return {
          grid: updatedGrid,
          width: state.width - 1,
          markedCells: newMarks,
          lastModified: Date.now()
        };
      }),

      toggleMarkCell: (id) =>
        set((state) => {
          const newMarks = { ...state.markedCells };
          if (newMarks[id]) {
            delete newMarks[id];
          } else {
            newMarks[id] = true;
          }
          return { markedCells: newMarks };
        }),

      resetMarks: () => set({ markedCells: {} }),
      
      updateProjectName: (name) => set({ name }),

      addToHistory: (name, path) =>
        set((state) => {
          // Remove if exists to avoid duplicates
          const newHistory = (state.history || []).filter((item) => item.path !== path);
          // Add to top
          newHistory.unshift({ name, path, lastOpened: Date.now() });
          // Keep last 20
          return { history: newHistory.slice(0, 20) };
        }),

      removeFromHistory: (path) =>
        set((state) => ({
          history: (state.history || []).filter((item) => item.path !== path),
        })),
    }),
    {
      name: 'perler-beads-storage',
      partialize: (state) => ({
        id: state.id,
        name: state.name,
        width: state.width,
        height: state.height,
        grid: state.grid,
        markedCells: state.markedCells,
        lastModified: state.lastModified,
        history: state.history,
      }),
    }
  )
);
