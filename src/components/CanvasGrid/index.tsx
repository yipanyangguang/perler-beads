import { memo, useCallback, useState, useEffect } from "react";
import { clsx } from "@/utils/clsx";
import { CellData } from "@/store/useProjectStore";
import { getColorId, getContrastColor } from "@/utils/colorUtils";
import { X } from "lucide-react";

interface CanvasGridProps {
  width: number;
  height: number;
  grid: CellData[][];
  zoom: number;
  theme: 'light' | 'dark';
  showLabels: boolean;
  showCenterMark: boolean;
  hGuides: Set<number>;
  vGuides: Set<number>;
  isSymmetric: boolean;
  symmetryAxis: 'x' | 'y';
  tool: 'brush' | 'select' | 'eraser';
  selectedColor: string | null;
  hoveredCell: { x: number; y: number } | null;
  onCellClick: (x: number, y: number) => void;
  onCellHover: (x: number, y: number) => void;
  onMouseLeave: () => void;
}

const CanvasGrid = memo(({
  width,
  height,
  grid,
  zoom,
  showLabels,
  showCenterMark,
  hGuides,
  vGuides,
  isSymmetric,
  symmetryAxis,
  hoveredCell,
  onCellClick,
  onCellHover,
  onMouseLeave
}: CanvasGridProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const cellSize = 20 * zoom;
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  return (
    <div 
      className="grid gap-px bg-zinc-200 dark:bg-zinc-800"
      style={{
        gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
        width: 'fit-content'
      }}
      onMouseLeave={onMouseLeave}
    >
      {grid.map((row, y) => (
        row.map((cell, x) => {
          const isCenter = showCenterMark && (
            (width % 2 === 0 && (x === centerX - 1 || x === centerX)) ||
            (width % 2 !== 0 && x === centerX)
          ) && (
            (height % 2 === 0 && (y === centerY - 1 || y === centerY)) ||
            (height % 2 !== 0 && y === centerY)
          );

          const hasVGuide = vGuides.has(x);
          const hasHGuide = hGuides.has(y);
          const isFrosted = cell.color === '#FDFBFF';

          let symmetryClass = "";
          if (isSymmetric) {
            if (symmetryAxis === 'x') {
              if (width % 2 === 0) {
                if (x === width / 2 - 1) symmetryClass = "!border-r-2 !border-r-purple-500 z-20";
              } else {
                if (x === Math.floor(width / 2)) symmetryClass = "after:content-[''] after:absolute after:inset-0 after:bg-purple-500/10 after:pointer-events-none";
              }
            } else {
              if (height % 2 === 0) {
                if (y === height / 2 - 1) symmetryClass = "!border-b-2 !border-b-purple-500 z-20";
              } else {
                if (y === Math.floor(height / 2)) symmetryClass = "after:content-[''] after:absolute after:inset-0 after:bg-purple-500/10 after:pointer-events-none";
              }
            }
          }

          return (
            <div
              key={cell.id}
              id={`cell-${x}-${y}`}
              className={clsx(
                "grid-cell bg-white dark:bg-zinc-900 hover:brightness-95 dark:hover:brightness-110 cursor-pointer transition-colors duration-75 relative flex items-center justify-center",
                hasVGuide && "!border-r-2 !border-r-blue-400 dark:!border-r-blue-500 z-10",
                hasHGuide && "!border-b-2 !border-b-blue-400 dark:!border-b-blue-500 z-10",
                symmetryClass,
                isFrosted && "frosted-bead"
              )}
              style={{ 
                backgroundColor: isFrosted ? undefined : (cell.color || undefined),
                width: `${cellSize}px`,
                height: `${cellSize}px`
              }}
              onMouseDown={() => {
                handleMouseDown();
                onCellClick(x, y);
              }}
              onMouseEnter={() => {
                onCellHover(x, y);
                if (isDragging) {
                  onCellClick(x, y);
                }
              }}
            >
              {/* Center Mark */}
              {isCenter && !cell.color && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <X size={cellSize * 0.6} className="text-zinc-300 dark:text-zinc-600 opacity-50" strokeWidth={1.5} />
                </div>
              )}

              {/* Hover Coordinates */}
              {hoveredCell?.x === x && hoveredCell?.y === y && !cell.color && !isCenter && (
                <span className="pointer-events-none text-[8px] text-zinc-400 select-none">
                  {x+1},{y+1}
                </span>
              )}
              
              {/* Color Label */}
              {showLabels && cell.color && zoom >= 0.8 && (
                <span 
                  className="pointer-events-none text-[8px] font-bold select-none"
                  style={{ color: getContrastColor(cell.color) }}
                >
                  {getColorId(cell.color)}
                </span>
              )}
            </div>
          );
        })
      ))}
    </div>
  );
});

CanvasGrid.displayName = 'CanvasGrid';

export default CanvasGrid;
