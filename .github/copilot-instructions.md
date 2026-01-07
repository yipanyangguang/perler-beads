# Perler Beads - AI Coding Instructions

## Project Context
This is a desktop application for designing Perler Bead patterns, built with **Tauri v2**, **React 19**, **Vite**, and **TypeScript**.

### Key Technologies
- **Frontend Framework**: React 19 (Functional Components + Hooks)
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS v3 (managed with `clsx` and `tailwind-merge`)
- **State Management**: Zustand v5 (Persisted store)
- **Desktop Runtime**: Tauri v2 (Rust backend)
- **Routing**: React Router DOM v7

## Architecture & Data Flow

### State Management (`src/store/`)
- The Application state is centralized in `src/store/useProjectStore.ts`.
- **Core Data Model**: `ProjectState` manages the grid as `CellData[][]`.
- **Undo/Redo**: Implemented manually using `undoStack` and `redoStack` within the Zustand store.
- **Persistence**: Zustand `persist` middleware scales state to local storage/files.
- **Modifying State**: Always use existing actions in `useProjectStore`. specific actions for grid manipulation (`setCellColor`, `moveGrid`).

### Color System (`src/utils/colorUtils.ts`)
- Colors are not just Hex codes; they map to specific Bead IDs defined in `src/color.ts`.
- Use `getHexFromId` and `getColorId` for conversions.
- Ensure color comparisons handle case-insensitivity (normalized to uppercase/lowercase as per utils).

### Tauri Integration (`src-tauri/`)
- Backend logic resides in `src-tauri/src/`.
- Frontend interacts with system features via Tauri plugins:
  - `@tauri-apps/plugin-fs`: File system access.
  - `@tauri-apps/plugin-dialog`: System dialogs.
  - `@tauri-apps/plugin-opener`: Opening external links/files.

## Coding Conventions

### Component Structure
- Use Functional Components with TypeScript interfaces for props.
- Place logic in custom hooks (like `src/hooks/useTheme.ts`) when reusable.
- **Styling**:
  - Use Tailwind CSS utility classes.
  - Combine conditional classes using `clsx` (or `cn` helper if available, otherwise `clsx` + `tailwind-merge`).
  - Example: `className={twMerge(clsx("p-4 rounded", isActive && "bg-blue-500"))}`.

### File Structure
- `src/pages/`: Top-level route components (`Editor`, `Home`, `Marking`).
- `src-tauri/src/lib.rs`: Main entry point for Rust command logic (Tauri v2 pattern).
- `src/assets/`: Static assets.

### Rust / Backend
- Follow standard Rust formatting (`cargo fmt`).
- Commands usually return `Result<T, String>` (or localized error types) to the frontend.

## Development Workflow
- **Start Dev Server**: `npm run tauri dev` (starts both Vite and Rust backend).
- **Type Checking**: Run `tsc` to verify types before large refactors.
- **Dependencies**: Use `npm` or `yarn` (check `package-lock.json` or `yarn.lock` to confirm).

## Common Tasks & Patterns
- **Adding a new Page**: Create component in `src/pages/`, add route in `src/App.tsx`.
- **Modifying Grid Logic**: Updates should happen in `useProjectStore.ts` to ensure History/Undo tracking works correctly.
- **Theming**: Use `useTheme` hook. Respect `dark` and `light` classes on `html` root.
