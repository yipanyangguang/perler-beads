import { ArrowLeft, ArrowUp, ArrowRight, ArrowDown, Download, Eraser, MousePointer2, Paintbrush, Save, ZoomIn, ZoomOut, ChevronDown, Eye, EyeOff, X, Grid3X3, Trash2, Plus, Loader2, Wand2 } from "lucide-react";
import { useRef, useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../store/useProjectStore";
import html2canvas from "html2canvas";
import clsx from "clsx";
import anime from "animejs";
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile, writeFile } from '@tauri-apps/plugin-fs';
import colorData from "../color";
import { getColorId, getContrastColor } from "../utils/colorUtils";

export default function Editor() {
  const navigate = useNavigate();
  const { grid, width, height, name, setCellColor, moveGrid, addRow, deleteRow, addColumn, deleteColumn } = useProjectStore();
  
  const [selectedColor, setSelectedColor] = useState<string | null>("#000000");
  const [tool, setTool] = useState<"brush" | "select" | "eraser">("select");
  const [isDragging, setIsDragging] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isGridSettingsOpen, setIsGridSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [activeCategory, setActiveCategory] = useState<string>(Object.keys(colorData)[0]);
  const [showLabels, setShowLabels] = useState(false);
  const [showCenterMark, setShowCenterMark] = useState(true);
  const [hGuides, setHGuides] = useState<Set<number>>(new Set());
  const [vGuides, setVGuides] = useState<Set<number>>(new Set());
  const [hoveredCell, setHoveredCell] = useState<{x: number, y: number} | null>(null);
  
  const gridRef = useRef<HTMLDivElement>(null);
  const gridBtnRef = useRef<HTMLButtonElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const [gridPopupPos, setGridPopupPos] = useState<{top: number, right: number} | null>(null);
  const [colorPopupPos, setColorPopupPos] = useState<{top: number, right: number} | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    type: 'row' | 'col',
    index: number,
    x: number,
    y: number
  } | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

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
      colors: Object.entries(stats).sort((a, b) => {
        const idA = getColorId(a[0]) || '';
        const idB = getColorId(b[0]) || '';
        return idA.localeCompare(idB, undefined, { numeric: true });
      }),
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

  const togglePreview = () => {
    const isOpening = !isPreviewMode;
    setIsPreviewMode(isOpening);
    
    anime({
      targets: '#flipper',
      rotateY: isOpening ? 180 : 0,
      duration: 1000,
      easing: 'easeInOutCubic'
    });
  };

  const cellSize = 20 * zoom;

  const handleCellClick = (x: number, y: number) => {
    if (tool === "brush" || tool === "select") {
      setCellColor(x, y, selectedColor);
      
      // Animate click
      anime({
        targets: `#cell-${x}-${y}`,
        scale: [0.8, 1],
        duration: 200,
        easing: 'easeOutQuad'
      });
    } else if (tool === "eraser") {
      setCellColor(x, y, null);
    }
  };

  const handleMouseEnter = (x: number, y: number) => {
    setHoveredCell({ x, y });
    if (isDragging) {
      if (tool === "brush") {
        setCellColor(x, y, selectedColor);
      } else if (tool === "eraser") {
        setCellColor(x, y, null);
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const filePath = await save({
        filters: [{
          name: 'JSON Project',
          extensions: ['json']
        }],
        defaultPath: `${name.replace(/\s+/g, "_")}.json`
      });

      if (!filePath) {
        setIsSaving(false);
        return;
      }

      const state = useProjectStore.getState();
      // Exclude markedCells from the saved file
      const { markedCells, ...stateToSave } = state;
      const data = JSON.stringify(stateToSave, null, 2);
      await writeTextFile(filePath, data);
      
      // Simple feedback
      alert('保存成功！');
    } catch (error) {
      console.error('Save failed:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportImage = async () => {
    // We'll capture the container that includes rulers and stats
    const exportTarget = document.getElementById('export-container');
    if (!exportTarget) return;
    
    try {
      setIsExporting(true);
      setExportProgress(0);
      
      // Fake progress animation
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);
      
      // Wait for a moment to ensure UI is ready
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(exportTarget, {
        backgroundColor: null, // Transparent background if possible
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          // Ensure the cloned element is visible and styled correctly if needed
          const clonedElement = clonedDoc.getElementById('export-container');
          if (clonedElement) {
            clonedElement.style.transform = 'none';
            clonedElement.style.margin = '0';
            clonedElement.style.padding = '20px';
            clonedElement.style.backgroundColor = '#ffffff'; // Force white background for export
            // If dark mode, you might want to handle colors differently or force light mode classes
          }
        }
      });
      
      clearInterval(progressInterval);
      setExportProgress(100);
      
      const filePath = await save({
        filters: [{
          name: 'Image',
          extensions: ['png']
        }],
        defaultPath: `${name.replace(/\s+/g, "_")}.png`
      });

      if (!filePath) {
        setIsExporting(false);
        setExportProgress(0);
        return;
      }

      // Convert canvas to blob then array buffer
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsExporting(false);
          setExportProgress(0);
          alert('导出失败：无法生成图片数据');
          return;
        }
        
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          await writeFile(filePath, uint8Array);
          alert('导出成功！');
        } catch (err) {
          console.error(err);
          alert('写入文件失败');
        } finally {
          setIsExporting(false);
          setExportProgress(0);
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const currentCategoryColors = useMemo(() => {
    return colorData[activeCategory as keyof typeof colorData] || {};
  }, [activeCategory]);

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-colors duration-300 z-10 overflow-x-auto whitespace-nowrap min-h-[60px]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/")}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold">{name}</h1>
            <p className="text-xs text-zinc-500 font-mono">
              X: {hoveredCell ? hoveredCell.x + 1 : 0}, Y: {hoveredCell ? hoveredCell.y + 1 : 0}
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
              ref={gridBtnRef}
              onClick={() => {
                if (isGridSettingsOpen) {
                  setIsGridSettingsOpen(false);
                } else if (gridBtnRef.current) {
                  const rect = gridBtnRef.current.getBoundingClientRect();
                  setGridPopupPos({
                    top: rect.bottom + 8,
                    right: window.innerWidth - rect.right
                  });
                  setIsGridSettingsOpen(true);
                }
              }}
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

            {isGridSettingsOpen && gridPopupPos && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsGridSettingsOpen(false)}
                />
                <div 
                  className="fixed bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 w-64 p-4 animate-in fade-in zoom-in-95 duration-200"
                  style={{ top: gridPopupPos.top, right: gridPopupPos.right }}
                >
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
                      <br />
                      右键点击标尺可增加或删除行/列。
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Move Grid Controls */}
          <div className="flex items-center gap-1 mr-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            <button onClick={() => moveGrid('left')} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded" title="向左移动"><ArrowLeft size={14} /></button>
            <div className="flex flex-col">
              <button onClick={() => moveGrid('up')} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded" title="向上移动"><ArrowUp size={14} /></button>
              <button onClick={() => moveGrid('down')} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded" title="向下移动"><ArrowDown size={14} /></button>
            </div>
            <button onClick={() => moveGrid('right')} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded" title="向右移动"><ArrowRight size={14} /></button>
          </div>

          <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 mr-4">
            <button 
              onClick={() => setTool("select")}
              className={clsx(
                "p-2 rounded-md transition-colors",
                tool === "select" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              )}
              title="点选模式"
            >
              <MousePointer2 size={18} />
            </button>
            <button 
              onClick={() => setTool("brush")}
              className={clsx(
                "p-2 rounded-md transition-colors",
                tool === "brush" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              )}
              title="笔刷模式"
            >
              <Paintbrush size={18} />
            </button>
            <button 
              onClick={() => setTool("eraser")}
              className={clsx(
                "p-2 rounded-md transition-colors",
                tool === "eraser" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              )}
              title="橡皮擦"
            >
              <Eraser size={18} />
            </button>
          </div>

          <div className="relative">
            <button 
              ref={colorBtnRef}
              onClick={() => {
                if (isColorPickerOpen) {
                  setIsColorPickerOpen(false);
                } else if (colorBtnRef.current) {
                  const rect = colorBtnRef.current.getBoundingClientRect();
                  setColorPopupPos({
                    top: rect.bottom + 8,
                    right: window.innerWidth - rect.right
                  });
                  setIsColorPickerOpen(true);
                }
              }}
              className="flex items-center gap-2 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <div 
                className="w-6 h-6 rounded-full border border-zinc-300 dark:border-zinc-600 flex items-center justify-center text-[10px] font-bold overflow-hidden"
                style={{ 
                  backgroundColor: selectedColor || 'transparent',
                  color: selectedColor ? getContrastColor(selectedColor) : undefined
                }}
              >
                {selectedColor && getColorId(selectedColor)}
              </div>
              <ChevronDown size={16} className="text-zinc-500" />
            </button>
            
            {isColorPickerOpen && colorPopupPos && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsColorPickerOpen(false)}
                />
                <div 
                  className="fixed bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 w-96 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                  style={{ top: colorPopupPos.top, right: colorPopupPos.right }}
                >
                  {/* Category Tabs */}
                  <div className="flex overflow-x-auto border-b border-zinc-200 dark:border-zinc-700 p-1 gap-1 bg-zinc-50 dark:bg-zinc-900/50">
                    {Object.keys(colorData).map(category => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={clsx(
                          "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                          activeCategory === category 
                            ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                        )}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  
                  {/* Color Grid */}
                  <div className="p-3 grid grid-cols-8 gap-2 max-h-80 overflow-y-auto">
                    {Object.entries(currentCategoryColors).map(([id, color]) => (
                      <button
                        key={id}
                        className="group relative w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-600 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800 flex items-center justify-center"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          setSelectedColor(color);
                          setIsColorPickerOpen(false);
                          if (tool === 'eraser') setTool('brush');
                        }}
                      >
                        <span 
                          className="text-[8px] font-bold"
                          style={{ color: getContrastColor(color) }}
                        >
                          {id}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-2" />

          <button 
            onClick={togglePreview}
            className={clsx(
              "p-2 rounded-lg transition-colors",
              isPreviewMode 
                ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" 
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            )}
            title="风格化预览"
          >
            <Wand2 size={20} />
          </button>

          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className={clsx(
              "p-2 rounded-lg transition-colors",
              isSaving 
                ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed" 
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            )}
            title="保存 JSON"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          </button>
          <button 
            onClick={handleExportImage} 
            disabled={isExporting}
            className={clsx(
              "p-2 rounded-lg transition-colors",
              isExporting 
                ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed" 
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            )}
            title="导出图片"
          >
            {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          </button>
          <button 
            onClick={() => navigate("/marking")}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            标记模式
          </button>
        </div>
      </header>

      {/* Main Editor Area */}
      <main className="flex-1 overflow-hidden bg-zinc-100 dark:bg-zinc-950 transition-colors duration-300 perspective-[2000px]">
        <div 
          id="flipper"
          className="w-full h-full relative preserve-3d"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front Face: Editor */}
          <div 
            className={clsx(
              "absolute inset-0 backface-hidden bg-zinc-100 dark:bg-zinc-950",
              !isPreviewMode ? "z-10" : "z-0 pointer-events-none"
            )}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="w-full h-full overflow-auto">
              <div className="min-w-full min-h-full flex flex-col items-center p-12">
                {/* Export Container: Includes Grid, Rulers, and Stats */}
                <div id="export-container" className="bg-white dark:bg-zinc-900 p-8 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 transition-colors duration-300 flex flex-col gap-8 mb-12">
            
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
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({ type: 'col', index: i, x: e.clientX, y: e.clientY });
                    }}
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
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({ type: 'row', index: i, x: e.clientX, y: e.clientY });
                    }}
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
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => {
                  setIsDragging(false);
                  handleMouseLeave();
                }}
              >
                {grid.map((row, y) => (
                  row.map((cell, x) => {
                    const isCenter = showCenterMark && x === centerX && y === centerY;
                    const hasVGuide = vGuides.has(x);
                    const hasHGuide = hGuides.has(y);

                    return (
                      <div
                        key={cell.id}
                        id={`cell-${x}-${y}`}
                        className={clsx(
                          "grid-cell bg-white dark:bg-zinc-900 hover:brightness-95 dark:hover:brightness-110 cursor-pointer transition-colors duration-75 relative flex items-center justify-center",
                          hasVGuide && "!border-r-2 !border-r-blue-400 dark:!border-r-blue-500 z-10",
                          hasHGuide && "!border-b-2 !border-b-blue-400 dark:!border-b-blue-500 z-10"
                        )}
                        style={{ 
                          backgroundColor: cell.color || undefined,
                          width: `${cellSize}px`,
                          height: `${cellSize}px`
                        }}
                        onMouseDown={() => handleCellClick(x, y)}
                        onMouseEnter={() => handleMouseEnter(x, y)}
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
                    onClick={() => setSelectedColor(color)}
                    className="flex items-center gap-2 p-2 rounded bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
      </div>
    </div>
      {/* Back Face: Preview */}
      <div 
        className={clsx(
          "absolute inset-0 backface-hidden bg-zinc-200 dark:bg-zinc-900",
          isPreviewMode ? "z-10" : "z-0 pointer-events-none"
        )}
        style={{ 
          backfaceVisibility: 'hidden', 
          transform: 'rotateY(180deg)' 
        }}
      >
            <div className="w-full h-full overflow-auto flex items-center justify-center p-12">
              <div className="relative p-12 bg-white shadow-2xl rounded-lg overflow-hidden max-w-[90vw] max-h-[90vh] overflow-auto">
                {/* Texture Overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-multiply z-20" 
                      style={{ 
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                        filter: 'contrast(120%) brightness(100%)'
                      }}></div>
                
                {/* Beads */}
                <div 
                  className="grid gap-0 relative z-10" 
                  style={{ 
                    gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
                    width: 'fit-content'
                  }}
                >
                  {grid.map((row) => (
                    row.map((cell) => (
                      <div
                        key={`preview-${cell.id}`}
                        style={{ 
                          backgroundColor: cell.color || 'transparent',
                          width: `${cellSize}px`,
                          height: `${cellSize}px`,
                          borderRadius: '0',
                          transform: cell.color ? 'scale(1)' : 'none',
                          zIndex: cell.color ? 1 : 0
                        }}
                      />
                    ))
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
    </main>

      {contextMenu && (
        <div 
          className="fixed z-50 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl py-1 min-w-[120px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'col' ? (
            <>
              <button 
                onClick={() => { addColumn(contextMenu.index); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
              >
                在左侧插入列
              </button>
              <button 
                onClick={() => { addColumn(contextMenu.index + 1); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
              >
                在右侧插入列
              </button>
              <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
              <button 
                onClick={() => { deleteColumn(contextMenu.index); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
              >
                删除此列
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => { addRow(contextMenu.index); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
              >
                在上方插入行
              </button>
              <button 
                onClick={() => { addRow(contextMenu.index + 1); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
              >
                在下方插入行
              </button>
              <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
              <button 
                onClick={() => { deleteRow(contextMenu.index); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
              >
                删除此行
              </button>
            </>
          )}
        </div>
      )}

      {isExporting && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-in fade-in duration-200">
          <div className="w-64 space-y-4">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>正在导出图片...</span>
              <span>{Math.round(exportProgress)}%</span>
            </div>
            <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-200 ease-out"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400 text-center">正在生成高清网格与统计数据</p>
          </div>
        </div>
      )}
    </div>
  );
}
