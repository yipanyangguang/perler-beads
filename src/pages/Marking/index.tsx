import { ArrowLeft, Check, Eye, EyeOff, Grid3X3, Plus, Trash2, ZoomIn, ZoomOut, Moon, Sun, CheckSquare, Square, Brush } from "lucide-react";
import { useRef, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "@/store/useProjectStore";
import { useTheme } from "@/hooks/useTheme";
import { clsx } from "@/utils/clsx";
import { getColorId, getContrastColor } from "@/utils/colorUtils";
import { MarkingCanvasRenderer } from "@/components/MarkingCanvasRenderer";

// 样式
import styles from "./index.module.scss";

export default function Marking() {
  const navigate = useNavigate();
  const { 
    grid, width, height, name, markedCells, 
    toggleMarkCell, setMarkCell, markAllColor, resetMarks,
    markingShowLabels, markingFadedMode, markingHiddenColors, 
    markingShowCenterMark, markingHGuides, markingVGuides,
    setMarkingShowLabels, setMarkingFadedMode, setMarkingHiddenColors,
    setMarkingShowCenterMark, setMarkingGuides
  } = useProjectStore();
  const { theme, toggleTheme } = useTheme();
  
  const [zoom, setZoom] = useState(1);
  const [showLabels, setShowLabelsLocal] = useState(markingShowLabels ?? false);
  const [isBrushMode, setIsBrushMode] = useState(false);
  const brushTargetStateRef = useRef<boolean | null>(null);
  const [showCenterMark, setShowCenterMarkLocal] = useState(markingShowCenterMark ?? true);
  const [hGuides, setHGuidesLocal] = useState<Set<number>>(new Set(markingHGuides ?? []));
  const [vGuides, setVGuidesLocal] = useState<Set<number>>(new Set(markingVGuides ?? []));
  const [hoveredCell, setHoveredCell] = useState<{x: number, y: number} | null>(null);
  const [isGridSettingsOpen, setIsGridSettingsOpen] = useState(false);
  const [hiddenColors, setHiddenColorsLocal] = useState<Set<string>>(new Set(markingHiddenColors ?? []));
  const [confirmMarkAll, setConfirmMarkAll] = useState<string | null>(null);
  const [fadedMode, setFadedModeLocal] = useState(markingFadedMode ?? false);
  
  const gridRef = useRef<HTMLDivElement>(null);

  // 包装setter函数以同步到store
  const setShowLabels = (show: boolean) => {
    setShowLabelsLocal(show);
    setMarkingShowLabels(show);
  };

  const setFadedMode = (faded: boolean) => {
    setFadedModeLocal(faded);
    setMarkingFadedMode(faded);
  };

  const setShowCenterMark = (show: boolean) => {
    setShowCenterMarkLocal(show);
    setMarkingShowCenterMark(show);
  };

  const setHGuides = (guides: Set<number>) => {
    setHGuidesLocal(guides);
    setMarkingGuides(Array.from(guides), Array.from(vGuides));
  };

  const setVGuides = (guides: Set<number>) => {
    setVGuidesLocal(guides);
    setMarkingGuides(Array.from(hGuides), Array.from(guides));
  };

  const setHiddenColors = (colors: Set<string>) => {
    setHiddenColorsLocal(colors);
    setMarkingHiddenColors(Array.from(colors));
  };

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
    const stats: Record<string, { count: number; marked: number }> = {};
    let total = 0;
    let markedTotal = 0;
    
    grid.forEach(row => {
      row.forEach(cell => {
        if (cell.color) {
          if (!stats[cell.color]) {
            stats[cell.color] = { count: 0, marked: 0 };
          }
          stats[cell.color].count++;
          total++;
          
          // 统计已标记数量
          if (markedCells[cell.id]) {
            stats[cell.color].marked++;
            markedTotal++;
          }
        }
      });
    });
    
    // 按颜色ID字母数字排序
    const sortedColors = Object.entries(stats).sort((a, b) => {
      const idA = getColorId(a[0]) || a[0];
      const idB = getColorId(b[0]) || b[0];
      return idA.localeCompare(idB, undefined, { numeric: true });
    });
    
    return {
      colors: sortedColors,
      total,
      markedTotal
    };
  }, [grid, markedCells]);

  const cellSize = 20 * zoom;

  const handleCellClick = useCallback((x: number, y: number) => {
    const cellId = `${x}-${y}`;
    
    if (isBrushMode) {
      // 刷子模式：应用目标状态
      if (brushTargetStateRef.current !== null) {
        setMarkCell(cellId, brushTargetStateRef.current);
      }
    } else {
      // 选择模式：切换标记状态
      toggleMarkCell(cellId);
    }
  }, [isBrushMode, toggleMarkCell, setMarkCell]);

  const handleCellDragStart = useCallback((x: number, y: number) => {
    if (isBrushMode) {
      const cellId = `${x}-${y}`;
      const currentMarkedCells = useProjectStore.getState().markedCells;
      const isCurrentlyMarked = !!currentMarkedCells[cellId];
      brushTargetStateRef.current = !isCurrentlyMarked;
    }
  }, [isBrushMode]);

  const handleCellDrag = useCallback((x: number, y: number) => {
    if (isBrushMode && brushTargetStateRef.current !== null) {
      const cellId = `${x}-${y}`;
      setMarkCell(cellId, brushTargetStateRef.current);
    }
  }, [isBrushMode, setMarkCell]);

  const handleMouseEnter = useCallback((x: number, y: number) => {
    setHoveredCell({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
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
    <div 
      className={clsx(styles.container, { [styles.dark]: theme === 'dark' })}
      onContextMenu={(e) => e.preventDefault()}
    >
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
              已标记: {colorStats.markedTotal} / {colorStats.total}
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

          {/* Faded Mode Toggle */}
          <button
            onClick={() => setFadedMode(!fadedMode)}
            className={clsx(styles.buttonControl, {
              [styles.active]: fadedMode,
              [styles.dark]: theme === 'dark'
            })}
            title={fadedMode ? "关闭淡色模式" : "开启淡色模式"}
          >
            <CheckSquare size={20} />
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
                  gridTemplateColumns: `repeat(${width}, ${cellSize}px)`
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
                  gridTemplateRows: `repeat(${height}, ${cellSize}px)`
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

              {/* Grid - Canvas Renderer */}
              <div ref={gridRef}>
                <MarkingCanvasRenderer
                  grid={grid}
                  width={width}
                  height={height}
                  zoom={zoom}
                  theme={theme}
                  showLabels={showLabels}
                  showCenterMark={showCenterMark}
                  centerX={centerX}
                  centerY={centerY}
                  hGuides={hGuides}
                  vGuides={vGuides}
                  markedCells={markedCells}
                  hiddenColors={hiddenColors}
                  hoveredCell={hoveredCell}
                  fadedMode={fadedMode}
                  onCellClick={handleCellClick}
                  onCellDragStart={handleCellDragStart}
                  onCellDrag={handleCellDrag}
                  onCellHover={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                />
              </div>
            </div>

            {/* Bottom Stats Area */}
            <div className={clsx(styles.statsContent, { [styles.dark]: theme === 'dark' })}>
              <div className={styles.statsHeader}>
                <h3 className={clsx(styles.statsTitle, { [styles.dark]: theme === 'dark' })}>颜色统计清单</h3>
                <span className={styles.statsTotal}>总计: {colorStats.total} 颗</span>
              </div>
              
              <div className={clsx(styles.statsGrid, styles.gridCols4)}>
                {colorStats.colors.map(([color, stats]) => {
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
                        <span className={styles.statCount}>
                          <span className={stats.marked === stats.count ? 'text-green-600 dark:text-green-400' : ''}>
                            {stats.marked}
                          </span>
                          <span className="text-zinc-400 dark:text-zinc-600"> / </span>
                          {stats.count}
                        </span>
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
