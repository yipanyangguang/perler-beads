import { ArrowLeft, Check, Eye, EyeOff, Grid3X3, Plus, Trash2, ZoomIn, ZoomOut, Moon, Sun, CheckSquare, Square, Brush } from "lucide-react";
import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../store/useProjectStore";
import { useTheme } from "../hooks/useTheme";
import clsx from "clsx";
import { getColorId, getContrastColor } from "../utils/colorUtils";
import { MarkingCanvasRenderer } from "../components/MarkingCanvasRenderer";

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
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-colors duration-300 z-10 overflow-x-auto whitespace-nowrap min-h-[60px]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/editor")}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
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
        
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors mr-2"
            title={theme === 'dark' ? '切换亮色模式' : '切换深色模式'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2 mr-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-2 py-1">
            <ZoomOut size={16} className="text-zinc-500" />
            <input 
              type="range" 
              min="0.5" 
              max="2" 
              step="0.1" 
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-24 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer"
            />
            <ZoomIn size={16} className="text-zinc-500" />
            <span className="text-xs w-8 text-center">{Math.round(zoom * 100)}%</span>
          </div>

          {/* Brush Mode Toggle */}
          <button
            onClick={() => setIsBrushMode(!isBrushMode)}
            className={clsx(
              "p-2 rounded-lg transition-colors mr-1",
              isBrushMode 
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
            )}
            title="刷子模式"
          >
            <Brush size={20} />
          </button>

          {/* Label Toggle */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={clsx(
              "p-2 rounded-lg transition-colors mr-1",
              showLabels 
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
            )}
            title="显示色号"
          >
            {showLabels ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>

          {/* Grid Settings */}
          <div className="relative mr-2">
            <button
              onClick={() => setIsGridSettingsOpen(!isGridSettingsOpen)}
              className={clsx(
                "p-2 rounded-lg transition-colors",
                isGridSettingsOpen
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              )}
              title="网格设置"
            >
              <Grid3X3 size={20} />
            </button>

            {isGridSettingsOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsGridSettingsOpen(false)}
                />
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-20 w-64 p-4 animate-in fade-in zoom-in-95 duration-200">
                  <h3 className="font-bold text-sm mb-3 text-zinc-900 dark:text-white">网格辅助线</h3>
                  
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-zinc-600 dark:text-zinc-300">显示中心点 (X)</span>
                      <input 
                        type="checkbox" 
                        checked={showCenterMark}
                        onChange={(e) => setShowCenterMark(e.target.checked)}
                        className="toggle"
                      />
                    </label>

                    <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-2" />
                    
                    <button 
                      onClick={addStandardGuides}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
                    >
                      <Plus size={16} />
                      <span>添加 10x10 辅助线</span>
                    </button>
                    
                    <button 
                      onClick={clearGuides}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    >
                      <Trash2 size={16} />
                      <span>清除所有辅助线</span>
                    </button>

                    <p className="text-xs text-zinc-400 mt-2 px-1">
                      提示：点击标尺数字可单独切换该行/列的辅助线。
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-2" />

          <button 
            onClick={handleResetMarks}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} />
            清空标记
          </button>
        </div>
      </header>

      {/* Main Editor Area */}
      <main className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-950 transition-colors duration-300">
        <div className="min-w-full min-h-full flex flex-col items-center p-12">
          {/* Export Container: Includes Grid, Rulers, and Stats */}
          <div className="export-container bg-white dark:bg-zinc-900 p-8 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 transition-colors duration-300 flex flex-col gap-8">
            
            {/* Grid Area */}
            <div className="grid" style={{ 
              gridTemplateColumns: `32px 1fr`, 
              gridTemplateRows: `32px 1fr` 
            }}>
              {/* Corner (Empty) */}
              <div className="border-b border-r border-zinc-200 dark:border-zinc-800"></div>

              {/* Top Ruler */}
              <div 
                className="grid border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-x-auto"
                style={{
                  gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
                  gap: '0',
                  height: '32px'
                }}
              >
                {Array.from({ length: width }).map((_, i) => (
                  <div 
                    key={i} 
                    onClick={() => toggleVGuide(i)}
                    className={clsx(
                      "flex items-end justify-center text-[10px] pb-1 cursor-pointer hover:brightness-95 dark:hover:brightness-110 transition-colors select-none border-r border-zinc-100 dark:border-zinc-900",
                      vGuides.has(i) 
                        ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20" 
                        : "text-zinc-400 dark:text-zinc-500 bg-white dark:bg-zinc-950"
                    )}
                    style={{ width: `${cellSize}px`, height: '32px', minWidth: `${cellSize}px` }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Left Ruler */}
              <div 
                className="grid border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-y-auto"
                style={{
                  gridTemplateRows: `repeat(${height}, ${cellSize}px)`,
                  gap: '0',
                  width: '32px'
                }}
              >
                {Array.from({ length: height }).map((_, i) => (
                  <div 
                    key={i} 
                    onClick={() => toggleHGuide(i)}
                    className={clsx(
                      "flex items-center justify-end text-[10px] pr-1 cursor-pointer hover:brightness-95 dark:hover:brightness-110 transition-colors select-none border-b border-zinc-100 dark:border-zinc-900",
                      hGuides.has(i) 
                        ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20" 
                        : "text-zinc-400 dark:text-zinc-500 bg-white dark:bg-zinc-950"
                    )}
                    style={{ height: `${cellSize}px`, width: '32px', minHeight: `${cellSize}px` }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Canvas Grid */}
              <div 
                ref={gridRef}
                className="overflow-auto bg-white dark:bg-zinc-950"
              >
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
                  onCellClick={handleCellClick}
                  onCellHover={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                />
              </div>
            </div>

            {/* Bottom Stats Area */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">颜色统计清单</h3>
                <span className="text-xs text-zinc-500">总计: {colorStats.total} 颗</span>
              </div>
              
              <div className="grid grid-cols-4 gap-4 export-stats-grid">
                {colorStats.colors.map(([color, count]) => {
                  const isHidden = hiddenColors.has(color);
                  return (
                    <div 
                      key={color} 
                      className={clsx(
                        "flex items-center gap-2 p-2 rounded border transition-colors h-10",
                        isHidden 
                          ? "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 opacity-60" 
                          : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800"
                      )}
                    >
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => toggleColorVisibility(color)}
                          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1"
                          title={isHidden ? "显示该颜色" : "隐藏该颜色"}
                        >
                          {isHidden ? <Square size={14} /> : <CheckSquare size={14} />}
                        </button>

                        <button
                          onClick={() => handleMarkAllColor(color)}
                          className="text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1"
                          title="标记所有同色格子"
                        >
                          <Check size={14} />
                        </button>
                      </div>

                      <div 
                        className={clsx(
                          "w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-600 shadow-sm flex items-center justify-center flex-shrink-0",
                          color === '#FDFBFF' && "frosted-bead"
                        )}
                        style={{ backgroundColor: color === '#FDFBFF' ? undefined : color }}
                      >
                        <span 
                          className="text-[8px] font-bold"
                          style={{ color: getContrastColor(color) }}
                        >
                          {getColorId(color)}
                        </span>
                      </div>
                      
                      <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
                        <span className="text-xs font-bold truncate">{getColorId(color)}</span>
                        <span className="text-xs font-mono text-zinc-500 shrink-0">{count}</span>
                      </div>
                    </div>
                  );
                })}
                {colorStats.colors.length === 0 && (
                  <div className="col-span-4 text-center py-4 text-xs text-zinc-400">
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
            className="fixed inset-0 z-50 bg-black/20 dark:bg-black/50 backdrop-blur-sm"
            onClick={() => setConfirmMarkAll(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-80 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-2 text-zinc-900 dark:text-white">确认标记</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6">
              确定要标记所有 <span className="font-bold text-zinc-900 dark:text-white">{getColorId(confirmMarkAll)}</span> 颜色的格子吗？
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmMarkAll(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={executeMarkAllColor}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
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
