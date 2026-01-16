import { memo, useCallback, useState, useEffect } from "react";
import { clsx } from "@/utils/clsx";
import styles from "@/components/CanvasGrid/index.module.scss";
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
  theme,
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
      className={clsx(styles.canvasGrid, { [styles.dark]: theme === 'dark' })}
      style={{
        gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
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
                if (x === width / 2 - 1) symmetryClass = styles.symmetryLineX;
              } else {
                if (x === Math.floor(width / 2)) symmetryClass = styles.symmetryOverlay;
              }
            } else {
              if (height % 2 === 0) {
                if (y === height / 2 - 1) symmetryClass = styles.symmetryLineY;
              } else {
                if (y === Math.floor(height / 2)) symmetryClass = styles.symmetryOverlay;
              }
            }
          }

          return (
            <div
              key={cell.id}
              id={`cell-${x}-${y}`}
              className={clsx(
                styles.gridCell,
                { [styles.dark]: theme === 'dark' },
                hasVGuide && styles.vGuide,
                hasHGuide && styles.hGuide,
                symmetryClass,
                isFrosted && styles.frosted
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
                <div className={styles.centerMark}>
                  <X size={cellSize * 0.6} strokeWidth={1.5} />
                </div>
              )}

              {/* Hover Coordinates */}
              {hoveredCell?.x === x && hoveredCell?.y === y && !cell.color && !isCenter && (
                <span className={styles.hoverCoordinates}>
                  {x+1},{y+1}
                </span>
              )}
              
              {/* Color Label */}
              {showLabels && cell.color && zoom >= 0.8 && (
                <span 
                  className={styles.cellLabel}
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
