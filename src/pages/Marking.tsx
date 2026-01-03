import { ArrowLeft, Check, Eye, EyeOff, Grid3X3, Plus, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useRef, useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../store/useProjectStore";
import clsx from "clsx";
import anime from "animejs";
import { getColorId, getContrastColor } from "../utils/colorUtils";

export default function Marking() {
  const navigate = useNavigate();
  const { grid, width, height, name, markedCells, toggleMarkCell, resetMarks } = useProjectStore();
  
  const [zoom, setZoom] = useState(1);
  const [showLabels, setShowLabels] = useState(false);
  const [showCenterMark, setShowCenterMark] = useState(true);
  const [hGuides, setHGuides] = useState<Set<number>>(new Set());
  const [vGuides, setVGuides] = useState<Set<number>>(new Set());
  const [hoveredCell, setHoveredCell] = useState<{x: number, y: number} | null>(null);
  const [isGridSettingsOpen, setIsGridSettingsOpen] = useState(false);
  
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

  // Animation on mount
  useEffect(() => {
    anime({
      targets: '.grid-cell',
      scale: [0, 1],
      opacity: [0, 1],
      delay: anime.stagger(1, { grid: [width, height], from: 'center' }),
      duration: 400,
      easing: 'easeOutElastic(1, .8)'
    });
  }, []);

  const cellSize = 20 * zoom;

  const handleCellClick = (x: number, y: number) => {
    const cellId = `${x}-${y}`;
    toggleMarkCell(cellId);
    
    // Animate click
    anime({
      targets: `#cell-${x}-${y}`,
      scale: [0.8, 1],
      duration: 200,
      easing: 'easeOutQuad'
    });
  };

  const handleMouseEnter = (x: number, y: number) => {
    setHoveredCell({ x, y });
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  const handleResetMarks = () => {
    if (confirm('确定要清空所有标记吗？')) {
      resetMarks();
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
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 transition-colors duration-300 flex flex-col gap-8">
            
            {/* Grid Area */}
            <div className="grid" style={{ 
              gridTemplateColumns: `32px 1fr`, 
              gridTemplateRows: `32px 1fr` 
            }}>
              {/* Corner (Empty) */}
              <div className="border-b border-r border-zinc-200 dark:border-zinc-800"></div>

              {/* Top Ruler */}
              <div 
                className="grid border-b border-zinc-200 dark:border-zinc-800 overflow-hidden"
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
                      "flex items-end justify-center text-[10px] border-r pb-1 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors select-none",
                      vGuides.has(i) 
                        ? "text-blue-600 dark:text-blue-400 font-bold border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                        : "text-zinc-400 dark:text-zinc-500 border-zinc-200/50 dark:border-zinc-800/50"
                    )}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Left Ruler */}
              <div 
                className="grid border-r border-zinc-200 dark:border-zinc-800 overflow-hidden"
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
                      "flex items-center justify-end text-[10px] border-b pr-1 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors select-none",
                      hGuides.has(i) 
                        ? "text-blue-600 dark:text-blue-400 font-bold border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                        : "text-zinc-400 dark:text-zinc-500 border-zinc-200/50 dark:border-zinc-800/50"
                    )}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div 
                ref={gridRef}
                className="grid gap-px bg-zinc-200 dark:bg-zinc-800 border-r border-b border-zinc-200 dark:border-zinc-800"
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
                    const isMarked = markedCells[cell.id];

                    return (
                      <div
                        key={cell.id}
                        id={`cell-${x}-${y}`}
                        className={clsx(
                          "grid-cell bg-white dark:bg-zinc-900 hover:brightness-95 dark:hover:brightness-110 cursor-pointer transition-colors duration-75 relative flex items-center justify-center",
                          hasVGuide && "!border-r-2 !border-r-blue-400 dark:!border-r-blue-500 z-10",
                          hasHGuide && "!border-b-2 !border-b-blue-400 dark:!border-b-blue-500 z-10",
                          isMarked && "after:content-[''] after:absolute after:inset-0 after:bg-black/20 dark:after:bg-white/20"
                        )}
                        style={{ 
                          backgroundColor: cell.color || undefined,
                          width: `${cellSize}px`,
                          height: `${cellSize}px`
                        }}
                        onMouseDown={() => handleCellClick(x, y)}
                        onMouseEnter={() => handleMouseEnter(x, y)}
                      >
                        {/* Marked Indicator */}
                        {isMarked && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <Check size={cellSize * 0.8} className="text-green-500 drop-shadow-md" strokeWidth={3} />
                          </div>
                        )}

                        {/* Center Mark */}
                        {isCenter && !cell.color && !isMarked && (
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
            </div>

            {/* Bottom Stats Area */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">颜色统计清单</h3>
                <span className="text-xs text-zinc-500">总计: {colorStats.total} 颗</span>
              </div>
              
              <div className="grid grid-cols-4 gap-4 export-stats-grid">
                {colorStats.colors.map(([color, count]) => (
                  <div 
                    key={color} 
                    className="flex items-center gap-2 p-2 rounded bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 transition-colors"
                  >
                    <div 
                      className="w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-600 shadow-sm flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      <span 
                        className="text-[8px] font-bold"
                        style={{ color: getContrastColor(color) }}
                      >
                        {getColorId(color)}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-bold whitespace-nowrap">{getColorId(color)}</span>
                        <span className="text-xs font-mono text-zinc-500">{count}</span>
                      </div>
                    </div>
                  </div>
                ))}
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
    </div>
  );
}
