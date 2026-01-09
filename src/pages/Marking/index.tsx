import { ArrowLeft, Check, Eye, EyeOff, Grid3X3, Plus, Trash2, X, ZoomIn, ZoomOut, Moon, Sun, CheckSquare, Square, Brush } from "lucide-react";
import { useRef, useState, useMemo, useCallback, memo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore, CellData } from "@/store/useProjectStore";
import { useTheme } from "@/hooks/useTheme";
import { clsx } from "@/utils/clsx";
import { getColorId, getContrastColor } from "@/utils/colorUtils";

// 样式
import styles from "./index.module.scss";

// Memoized Cell Component to improve performance
interface MarkingCellProps {
  cell: CellData;
  cellSize: number;
  isMarked: boolean;
  isCenter: boolean;
  hasVGuide: boolean;
  hasHGuide: boolean;
  showLabels: boolean;
  zoom: number;
  isHovered: boolean;
  isHidden: boolean;
  onMouseDown: (x: number, y: number) => void;
  onMouseEnter: (x: number, y: number) => void;
}

const MarkingCell = memo(({ 
  cell, 
  cellSize, 
  isMarked, 
  isCenter, 
  hasVGuide, 
  hasHGuide, 
  showLabels, 
  zoom, 
  isHovered,
  isHidden,
  onMouseDown,
  onMouseEnter 
}: MarkingCellProps) => {
  const isFrosted = cell.color === '#FDFBFF';

  if (isHidden) {
    return (
      <div
        style={{ 
          width: `${cellSize}px`,
          height: `${cellSize}px`
        }}
        className={clsx(styles.gridCell, {
          [styles.hasVGuide]: hasVGuide,
          [styles.hasHGuide]: hasHGuide
        })}
      />
    );
  }

  return (
    <div
      id={`cell-${cell.x}-${cell.y}`}
      className={clsx(styles.gridCell, {
        [styles.hasVGuide]: hasVGuide,
        [styles.hasHGuide]: hasHGuide,
        [styles.marked]: isMarked,
        [styles.dark]: cell.color === '#FDFBFF'
      })}
      style={{ 
        backgroundColor: isFrosted ? undefined : (cell.color || undefined),
        width: `${cellSize}px`,
        height: `${cellSize}px`
      }}
      onMouseDown={() => onMouseDown(cell.x, cell.y)}
      onMouseEnter={() => onMouseEnter(cell.x, cell.y)}
    >
      {/* Marked Indicator - Adjusted opacity and color */}
      {isMarked && (
        <div className={styles.markedIndicator}>
          <Check size={cellSize * 0.8} className="text-green-500/80 drop-shadow-sm" strokeWidth={2.5} />
        </div>
      )}

      {/* Center Mark */}
      {isCenter && !cell.color && !isMarked && (
        <div className={styles.centerMark}>
          <X size={cellSize * 0.6} className="text-zinc-300 dark:text-zinc-600 opacity-50" strokeWidth={1.5} />
        </div>
      )}

      {/* Hover Coordinates */}
      {isHovered && !cell.color && !isCenter && (
        <span className={styles.hoverCoords}>
          {cell.x+1},{cell.y+1}
        </span>
      )}
      
      {/* Color Label */}
      {showLabels && cell.color && zoom >= 0.8 && (
        <span 
          className={styles.colorLabel}
          style={{ color: getContrastColor(cell.color) }}
        >
          {getColorId(cell.color)}
        </span>
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.cell === next.cell &&
    prev.cellSize === next.cellSize &&
    prev.isMarked === next.isMarked &&
    prev.isCenter === next.isCenter &&
    prev.hasVGuide === next.hasVGuide &&
    prev.hasHGuide === next.hasHGuide &&
    prev.showLabels === next.showLabels &&
    prev.zoom === next.zoom &&
    prev.isHovered === next.isHovered &&
    prev.isHidden === next.isHidden &&
    prev.onMouseDown === next.onMouseDown &&
    prev.onMouseEnter === next.onMouseEnter
  );
});

export default function Marking() {
  const navigate = useNavigate();
  const { grid, width, height, name, markedCells, toggleMarkCell, setMarkCell, markAllColor, resetMarks } = useProjectStore();
  const { theme, toggleTheme } = useTheme();
  
  const [zoom, setZoom] = useState(1);
  const [showLabels, setShowLabels] = useState(false);
  const [isBrushMode, setIsBrushMode] = useState(false);
  const isDraggingRef = useRef(false);
  const brushTargetStateRef = useRef<boolean | null>(null);
  const [showCenterMark, setShowCenterMark] = useState(true);
  const [hGuides, setHGuides] = useState<Set<number>>(new Set());
  const [vGuides, setVGuides] = useState<Set<number>>(new Set());
  const [hoveredCell, setHoveredCell] = useState<{x: number, y: number} | null>(null);
  const [isGridSettingsOpen, setIsGridSettingsOpen] = useState(false);
  const [hiddenColors, setHiddenColors] = useState<Set<string>>(new Set());
  const [confirmMarkAll, setConfirmMarkAll] = useState<string | null>(null);
  
  const gridRef = useRef<HTMLDivElement>(null);

  // Calculate center
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  // Guide helpers
  const toggleHGuide = (y: number) => {
    const newGuides = new Set(hGuides);
    if (newGuides.has(y)) {
      newGuides.delete(y);
    } else {
      newGuides.add(y);
    }
    setHGuides(newGuides);
  };

  const toggleVGuide = (x: number) => {
    const newGuides = new Set(vGuides);
    if (newGuides.has(x)) {
      newGuides.delete(x);
    } else {
      newGuides.add(x);
    }
    setVGuides(newGuides);
  };

  const addStandardGuides = () => {
    const newH = new Set<number>();
    const newV = new Set<number>();
    
    for (let i = 9; i < height - 1; i += 10) newH.add(i);
    for (let i = 9; i < width - 1; i += 10) newV.add(i);
    
    setHGuides(newH);
    setVGuides(newV);
  };

  const clearGuides = () => {
    setHGuides(new Set());
    setVGuides(new Set());
  };

  // Calculate color statistics
  const colorStats = useMemo(() => {
    const stats: Record<string, number> = {};
    let total = 0;
    grid.forEach(row => {
      row.forEach(cell => {
        if (cell.color) {
          stats[cell.color] = (stats[cell.color] || 0) + 1;
          total++;
        }
      });
    });
    return {
      colors: Object.entries(stats).sort((a, b) => b[1] - a[1]),
      total
    };
  }, [grid]);

  const cellSize = 20 * zoom;

  const handleCellClick = useCallback((x: number, y: number) => {
    const cellId = `${x}-${y}`;
    if (isBrushMode) {
      // Use getState() to avoid dependency on markedCells
      const currentMarkedCells = useProjectStore.getState().markedCells;
      const isCurrentlyMarked = !!currentMarkedCells[cellId];
      const targetState = !isCurrentlyMarked;
      brushTargetStateRef.current = targetState;
      isDraggingRef.current = true;
      setMarkCell(cellId, targetState);
    } else {
      toggleMarkCell(cellId);
    }
  }, [isBrushMode, toggleMarkCell, setMarkCell]);

  const handleMouseEnter = useCallback((x: number, y: number) => {
    setHoveredCell({ x, y });
    if (isBrushMode && isDraggingRef.current && brushTargetStateRef.current !== null) {
      const cellId = `${x}-${y}`;
      setMarkCell(cellId, brushTargetStateRef.current);
    }
  }, [isBrushMode, setMarkCell]);

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      brushTargetStateRef.current = null;
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleResetMarks = () => {
    if (confirm('确定要清空所有标记吗？')) {
      resetMarks();
    }
  };

  const toggleColorVisibility = (color: string) => {
    const newHidden = new Set(hiddenColors);
    if (newHidden.has(color)) {
      newHidden.delete(color);
    } else {
      newHidden.add(color);
    }
    setHiddenColors(newHidden);
  };

  const handleMarkAllColor = (color: string) => {
    setConfirmMarkAll(color);
  };

  const executeMarkAllColor = () => {
    if (confirmMarkAll) {
      markAllColor(confirmMarkAll);
      setConfirmMarkAll(null);
    }
  };




  return (
    <div className={clsx(styles.container, { [styles.dark]: theme === 'dark' })}>
      {/* Header */}
      <header className={clsx(styles.header, { [styles.dark]: theme === 'dark' })}>
        <div className={styles.headerLeft}>
          <button 
            onClick={() => navigate("/editor")}
            className={clsx(styles.button, { [styles.dark]: theme === 'dark' })}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold">标记: {name}</h1>
            <p className="text-xs text-zinc-500 font-mono">
              已标记: {Object.keys(markedCells).length} / {colorStats.total}
            </p>
          </div>
        </div>
        
        <div className={styles.headerRight}>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={clsx(styles.button, { [styles.dark]: theme === 'dark' })}
            title={theme === 'dark' ? '切换亮色模式' : '切换深色模式'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Zoom Controls */}
          <div className={clsx(styles.zoomControls, { [styles.dark]: theme === 'dark' })}>
            <ZoomOut size={16} className="text-zinc-500" />
            <input 
              type="range" 
              min="0.5" 
              max="2" 
              step="0.1" 
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))}
            />
            <ZoomIn size={16} className="text-zinc-500" />
            <span className="text-xs w-8 text-center">{Math.round(zoom * 100)}%</span>
          </div>

          {/* Brush Mode Toggle */}
          <button
            onClick={() => setIsBrushMode(!isBrushMode)}
            className={clsx(styles.buttonControl, {
              [styles.active]: isBrushMode,
              [styles.dark]: theme === 'dark'
            })}
            title="刷子模式"
          >
            <Brush size={20} />
          </button>

          {/* Label Toggle */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={clsx(styles.buttonControl, {
              [styles.active]: showLabels,
              [styles.dark]: theme === 'dark'
            })}
            title="显示色号"
          >
            {showLabels ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>

          {/* Grid Settings */}
          <div className="relative mr-2">
            <button
              onClick={() => setIsGridSettingsOpen(!isGridSettingsOpen)}
              className={clsx(styles.buttonControl, {
                [styles.active]: isGridSettingsOpen,
                [styles.dark]: theme === 'dark'
              })}
              title="网格设置"
            >
              <Grid3X3 size={20} />
            </button>

            {isGridSettingsOpen && (
              <>
                <div 
                  className={clsx('fixed inset-0 z-10', { [styles.dark]: theme === 'dark' })}
                  onClick={() => setIsGridSettingsOpen(false)}
                />
                <div className={clsx(styles.popup, { [styles.dark]: theme === 'dark' })} style={{ top: '100%', right: 0, marginTop: '0.5rem' }}>
                  <h3 className={styles.popupTitle}>网格辅助线</h3>
                  
                  <div className={styles.popupContent}>
                    <label className={styles.toggleLabel}>
                      <span className={clsx(styles.toggleLabelText, { [styles.dark]: theme === 'dark' })}>显示中心点 (X)</span>
                      <input 
                        type="checkbox" 
                        checked={showCenterMark}
                        onChange={(e) => setShowCenterMark(e.target.checked)}
                        className={styles.toggle}
                      />
                    </label>

                    <div className={clsx(styles.popupDivider, { [styles.dark]: theme === 'dark' })} />
                    
                    <button 
                      onClick={addStandardGuides}
                      className={clsx(styles.popupButton, { [styles.dark]: theme === 'dark' })}
                    >
                      <Plus size={16} />
                      <span>添加 10x10 辅助线</span>
                    </button>
                    
                    <button 
                      onClick={clearGuides}
                      className={clsx(styles.popupButton, styles.danger, { [styles.dark]: theme === 'dark' })}
                    >
                      <Trash2 size={16} />
                      <span>清除所有辅助线</span>
                    </button>

                    <p className={styles.popupHint}>
                      提示：点击标尺数字可单独切换该行/列的辅助线。
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className={clsx(styles.divider, { [styles.dark]: theme === 'dark' })} />

          <button 
            onClick={handleResetMarks}
            className={clsx(styles.buttonDanger, { [styles.dark]: theme === 'dark' })}
          >
            <Trash2 size={16} />
            清空标记
          </button>
        </div>
      </header>

      {/* Main Editor Area */}
      <main className={clsx(styles.main, { [styles.dark]: theme === 'dark' })}>
        <div className={styles.mainContent}>
          {/* Export Container: Includes Grid, Rulers, and Stats */}
          <div className={clsx(styles.exportContainer, { [styles.dark]: theme === 'dark' })}>
            
            {/* Grid Area */}
            <div className={styles.gridWrapper}>
              {/* Corner (Empty) */}
              <div className={clsx(styles.gridCorner, { [styles.dark]: theme === 'dark' })}></div>

              {/* Top Ruler */}
              <div 
                className={clsx(styles.topRuler, styles.grid, { [styles.dark]: theme === 'dark' })}
                style={{
                  gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
                  gap: '1px'
                }}
              >
                {Array.from({ length: width }).map((_, i) => (
                  <div 
                    key={i} 
                    onClick={() => toggleVGuide(i)}
                    className={clsx(
                      styles.rulerItem,
                      vGuides.has(i) && styles.active,
                      { [styles.dark]: theme === 'dark' }
                    )}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Left Ruler */}
              <div 
                className={clsx(styles.leftRuler, styles.grid, { [styles.dark]: theme === 'dark' })}
                style={{
                  gridTemplateRows: `repeat(${height}, ${cellSize}px)`,
                  gap: '1px'
                }}
              >
                {Array.from({ length: height }).map((_, i) => (
                  <div 
                    key={i} 
                    onClick={() => toggleHGuide(i)}
                    className={clsx(
                      styles.rulerItem,
                      hGuides.has(i) && styles.active,
                      { [styles.dark]: theme === 'dark' }
                    )}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div 
                ref={gridRef}
                className={clsx(styles.gridCells, styles.grid, { [styles.dark]: theme === 'dark' })}
                style={{
                  gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
                  width: 'fit-content'
                }}
                onMouseLeave={handleMouseLeave}
              >
                {grid.map((row, y) => (
                  row.map((cell, x) => {
                    const isCenter = showCenterMark && x === centerX && y === centerY;
                    const hasVGuide = vGuides.has(x);
                    const hasHGuide = hGuides.has(y);
                    const isMarked = !!markedCells[cell.id];
                    const isHidden = cell.color ? hiddenColors.has(cell.color) : false;

                    return (
                      <MarkingCell
                        key={cell.id}
                        cell={cell}
                        cellSize={cellSize}
                        isMarked={isMarked}
                        isCenter={isCenter}
                        hasVGuide={hasVGuide}
                        hasHGuide={hasHGuide}
                        showLabels={showLabels}
                        zoom={zoom}
                        isHovered={hoveredCell?.x === x && hoveredCell?.y === y}
                        isHidden={isHidden}
                        onMouseDown={handleCellClick}
                        onMouseEnter={handleMouseEnter}
                      />
                    );
                  })
                ))}
              </div>
            </div>

            {/* Bottom Stats Area */}
            <div className={clsx(styles.statsContent, { [styles.dark]: theme === 'dark' })}>
              <div className={styles.statsHeader}>
                <h3 className={clsx(styles.statsTitle, { [styles.dark]: theme === 'dark' })}>颜色统计清单</h3>
                <span className={styles.statsTotal}>总计: {colorStats.total} 颗</span>
              </div>
              
              <div className={clsx(styles.statsGrid, styles.gridCols4)}>
                {colorStats.colors.map(([color, count]) => {
                  const isHidden = hiddenColors.has(color);
                  return (
                    <div 
                      key={color} 
                      className={clsx(
                        styles.colorStatItem,
                        isHidden && styles.hidden,
                        { [styles.dark]: theme === 'dark' }
                      )}
                    >
                      <div className={styles.statButtons}>
                        <button
                          onClick={() => toggleColorVisibility(color)}
                          className={clsx(styles.statButton, { [styles.dark]: theme === 'dark' })}
                          title={isHidden ? "显示该颜色" : "隐藏该颜色"}
                        >
                          {isHidden ? <Square size={14} /> : <CheckSquare size={14} />}
                        </button>

                        <button
                          onClick={() => handleMarkAllColor(color)}
                          className={clsx(styles.statButton, styles.markAll, { [styles.dark]: theme === 'dark' })}
                          title="标记所有同色格子"
                        >
                          <Check size={14} />
                        </button>
                      </div>

                      <div 
                        className={clsx(
                          styles.colorCircle,
                          color === '#FDFBFF' && styles.frosted,
                          { [styles.dark]: theme === 'dark' }
                        )}
                        style={{ backgroundColor: color === '#FDFBFF' ? undefined : color }}
                      >
                        <span 
                          className={styles.colorCircleText}
                          style={{ color: getContrastColor(color) }}
                        >
                          {getColorId(color)}
                        </span>
                      </div>
                      
                      <div className={styles.statContent}>
                        <span className={styles.statColorId}>{getColorId(color)}</span>
                        <span className={styles.statCount}>{count}</span>
                      </div>
                    </div>
                  );
                })}
                {colorStats.colors.length === 0 && (
                  <div className={styles.emptyStats}>
                    暂无颜色数据
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {confirmMarkAll && (
        <>
          <div 
            className={clsx(styles.confirmdial, { [styles.dark]: theme === 'dark' })}
            onClick={() => setConfirmMarkAll(null)}
          />
          <div className={clsx(styles.confirmModalContent, { [styles.dark]: theme === 'dark' })}>
            <h3 className={clsx(styles.modalTitle, { [styles.dark]: theme === 'dark' })}>确认标记</h3>
            <p className={clsx(styles.modalContent, { [styles.dark]: theme === 'dark' })}>
              确定要标记所有 <span className={clsx(styles.colorName, { [styles.dark]: theme === 'dark' })}>{getColorId(confirmMarkAll)}</span> 颜色的格子吗？
            </p>
            <div className={styles.modalActions}>
              <button
                onClick={() => setConfirmMarkAll(null)}
                className={clsx(styles.modalButton, styles.secondary, { [styles.dark]: theme === 'dark' })}
              >
                取消
              </button>
              <button
                onClick={executeMarkAllColor}
                className={clsx(styles.modalButton, styles.primary)}
              >
                确认标记
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
