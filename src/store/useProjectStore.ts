import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getHexFromId } from '@/utils/colorUtils';

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
  backgroundImageUrl?: string; // Base64 or URL for background image
  backgroundImageOpacity?: number; // 0-100
}

export interface HistoryItem {
  name: string;
  path: string;
  lastOpened: number;
}

interface UndoState {
  grid: CellData[][];
  width: number;
  height: number;
}

interface ProjectStore extends ProjectState {
  history: HistoryItem[];
  undoStack: UndoState[];
  redoStack: UndoState[];
  // Actions
  createProject: (width: number, height: number, name?: string) => void;
  loadProject: (project: ProjectState) => void;
  undo: () => void;
  redo: () => void;
  setCellColor: (x: number, y: number, color: string | null, skipHistory?: boolean) => void;
  setCellsColors: (updates: {x: number, y: number, color: string | null}[], skipHistory?: boolean) => void;
  pushToUndoStack: () => void;
  moveGrid: (direction: 'up' | 'down' | 'left' | 'right') => void;
  toggleMarkCell: (id: string) => void;
  setMarkCell: (id: string, marked: boolean) => void;
  markAllColor: (color: string) => void;
  resetMarks: () => void;
  updateProjectName: (name: string) => void;
  addToHistory: (name: string, path: string) => void;
  removeFromHistory: (path: string) => void;
  addRow: (index: number) => void;
  deleteRow: (index: number) => void;
  addColumn: (index: number) => void;
  deleteColumn: (index: number) => void;
  replaceColor: (oldColor: string, newColor: string | null) => void;
  setBackgroundImage: (imageUrl: string) => void;
  setBackgroundImageOpacity: (opacity: number) => void;
  removeBackgroundImage: () => void;
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
      undoStack: [],
      redoStack: [],
      history: [],
      id: '',
      name: '',
      width: 0,
      height: 0,
      grid: [],
      markedCells: {},
      lastModified: 0,
      backgroundImageUrl: undefined,
      backgroundImageOpacity: 100,

      createProject: (width, height, name = 'Untitled Project') => {
        set({
          id: crypto.randomUUID(),
          name,
          width,
          height,
          grid: generateGrid(width, height),
          markedCells: {},
          lastModified: Date.now(),
          undoStack: [],
          redoStack: [],
        });
      },

      loadProject: (project) => {
        // Convert grid colors from ID to hex if necessary
        const gridWithHex = project.grid.map(row => 
          row.map(cell => ({
            ...cell,
            color: cell.color ? (getHexFromId(cell.color) || cell.color) : null
          }))
        );

        // Safely extract only ProjectState properties, ignoring history/undoStack/redoStack if present in input
        const { history, undoStack, redoStack, grid, backgroundImageUrl, backgroundImageOpacity, ...rest } = project as any;

        set({ 
          ...rest, 
          grid: gridWithHex,
          lastModified: Date.now(), 
          undoStack: [], 
          redoStack: [],
          backgroundImageUrl: undefined,
          backgroundImageOpacity: 100,
        });
      },

      undo: () => set((state) => {
        if (state.undoStack.length === 0) return state;
        const previous = state.undoStack[state.undoStack.length - 1];
        const newUndoStack = state.undoStack.slice(0, -1);
        
        const current: UndoState = {
          grid: state.grid,
          width: state.width,
          height: state.height
        };
        
        return {
          ...previous,
          undoStack: newUndoStack,
          redoStack: [current, ...state.redoStack],
          lastModified: Date.now()
        };
      }),

      redo: () => set((state) => {
        if (state.redoStack.length === 0) return state;
        const next = state.redoStack[0];
        const newRedoStack = state.redoStack.slice(1);
        
        const current: UndoState = {
          grid: state.grid,
          width: state.width,
          height: state.height
        };

        return {
          ...next,
          undoStack: [...state.undoStack, current],
          redoStack: newRedoStack,
          lastModified: Date.now()
        };
      }),

      setCellColor: (x, y, color, skipHistory = false) =>
        set((state) => {
          let newUndoStack = state.undoStack;
          let newRedoStack = state.redoStack;

          if (!skipHistory) {
            // Push to undo stack
            const current: UndoState = {
              grid: state.grid,
              width: state.width,
              height: state.height
            };
            newUndoStack = [...state.undoStack, current].slice(-20);
          }
          
          // Any modification clears redo stack
          newRedoStack = [];

          const newGrid = [...state.grid];
          // Create a shallow copy of the row to avoid mutation
          newGrid[y] = [...newGrid[y]];
          newGrid[y][x] = { ...newGrid[y][x], color };
          return { grid: newGrid, lastModified: Date.now(), undoStack: newUndoStack, redoStack: newRedoStack };
        }),

      setCellsColors: (updates, skipHistory = false) =>
        set((state) => {
          let newUndoStack = state.undoStack;
          let newRedoStack = state.redoStack;

          if (!skipHistory) {
            // Push to undo stack
            const current: UndoState = {
              grid: state.grid,
              width: state.width,
              height: state.height
            };
            newUndoStack = [...state.undoStack, current].slice(-20);
          }

          newRedoStack = [];

          const newGrid = [...state.grid];
          // Optimization: track modified rows to avoid repeated shallow copying
          const modifiedRows = new Set<number>();
          
          updates.forEach(({ x, y, color }) => {
            if (!modifiedRows.has(y)) {
              newGrid[y] = [...newGrid[y]];
              modifiedRows.add(y);
            }
            newGrid[y][x] = { ...newGrid[y][x], color };
          });
          
          return { grid: newGrid, lastModified: Date.now(), undoStack: newUndoStack, redoStack: newRedoStack };
        }),

      pushToUndoStack: () => set((state) => {
        const current: UndoState = {
          grid: state.grid,
          width: state.width,
          height: state.height
        };
        const newUndoStack = [...state.undoStack, current].slice(-20);
        return { undoStack: newUndoStack, redoStack: [] };
      }),

      moveGrid: (direction) =>
        set((state) => {
          // Push to undo stack
          const current: UndoState = {
            grid: state.grid,
            width: state.width,
            height: state.height
          };
          const newUndoStack = [...state.undoStack, current].slice(-20);

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

          return { grid: newGrid, lastModified: Date.now(), undoStack: newUndoStack, redoStack: [] };
        }),

      addRow: (index) => set((state) => {
        // Push to undo stack
        const current: UndoState = {
          grid: state.grid,
          width: state.width,
          height: state.height
        };
        const newUndoStack = [...state.undoStack, current].slice(-5);

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
          lastModified: Date.now(),
          undoStack: newUndoStack,
          redoStack: []
        };
      }),

      deleteRow: (index) => set((state) => {
        if (state.height <= 1) return state;
        
        // Push to undo stack
        const current: UndoState = {
          grid: state.grid,
          width: state.width,
          height: state.height
        };
        const newUndoStack = [...state.undoStack, current].slice(-5);

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
          lastModified: Date.now(),
          undoStack: newUndoStack,
          redoStack: []
        };
      }),

      addColumn: (index) => set((state) => {
        // Push to undo stack
        const current: UndoState = {
          grid: state.grid,
          width: state.width,
          height: state.height
        };
        const newUndoStack = [...state.undoStack, current].slice(-5);

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
          lastModified: Date.now(),
          undoStack: newUndoStack,
          redoStack: []
        };
      }),

      deleteColumn: (index) => set((state) => {
        if (state.width <= 1) return state;
        
        // Push to undo stack
        const current: UndoState = {
          grid: state.grid,
          width: state.width,
          height: state.height
        };
        const newUndoStack = [...state.undoStack, current].slice(-5);

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
          lastModified: Date.now(),
          undoStack: newUndoStack,
          redoStack: []
        };
      }),

      replaceColor: (oldColor, newColor) =>
        set((state) => {
          // Push to undo stack
          const current: UndoState = {
            grid: state.grid,
            width: state.width,
            height: state.height
          };
          const newUndoStack = [...state.undoStack, current].slice(-5);

          const newGrid = state.grid.map(row =>
            row.map(cell =>
              cell.color === oldColor ? { ...cell, color: newColor } : cell
            )
          );
          return { grid: newGrid, lastModified: Date.now(), undoStack: newUndoStack, redoStack: [] };
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

      setMarkCell: (id, marked) =>
        set((state) => {
          const newMarks = { ...state.markedCells };
          if (marked) {
            newMarks[id] = true;
          } else {
            delete newMarks[id];
          }
          return { markedCells: newMarks };
        }),
      markAllColor: (color) =>
        set((state) => {
          const newMarkedCells = { ...state.markedCells };
          state.grid.forEach(row => {
            row.forEach(cell => {
              if (cell.color === color) {
                newMarkedCells[cell.id] = true;
              }
            });
          });
          return { markedCells: newMarkedCells };
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

      setBackgroundImage: (imageUrl) =>
        set({ backgroundImageUrl: imageUrl, backgroundImageOpacity: 100 }),

      setBackgroundImageOpacity: (opacity) =>
        set({ backgroundImageOpacity: Math.max(0, Math.min(100, opacity)) }),

      removeBackgroundImage: () =>
        set({ backgroundImageUrl: undefined, backgroundImageOpacity: 100 }),
    }),
    {
      name: 'perler-beads-storage',
      // Only persist history to make sure editor performance is not affected by large grid storage
      partialize: (state) => ({
        history: state.history,
      }),
    }
  )
);
