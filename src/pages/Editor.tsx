import CanvasGridRenderer from "../components/CanvasGridRenderer";
import { ArrowLeft, ArrowUp, ArrowRight, ArrowDown, Eraser, MousePointer2, Paintbrush, Save, ZoomIn, ZoomOut, ChevronDown, Eye, EyeOff, Grid3X3, Trash2, Plus, Loader2, Wand2, Moon, Sun, FlipHorizontal, FlipVertical, Copy, Undo, Redo, MoreHorizontal, Image as LucideImage, List, LayoutGrid } from "lucide-react";
import { useRef, useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../store/useProjectStore";
import { useTheme } from "../hooks/useTheme";
import html2canvas from "html2canvas";
import clsx from "clsx";
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile, writeFile } from '@tauri-apps/plugin-fs';
import colorData from "../color";
import { getColorId, getContrastColor } from "../utils/colorUtils";
import iconSvg from '../assets/logo.png';

export default function Editor() {
  const navigate = useNavigate();
  const { grid, width, height, name, setCellColor, moveGrid, addRow, deleteRow, addColumn, deleteColumn, replaceColor, undo, redo, undoStack, redoStack } = useProjectStore();
  const { theme, toggleTheme } = useTheme();
  
  const [selectedColor, setSelectedColor] = useState<string | null>("#000000");
  const [tool, setTool] = useState<"brush" | "select" | "eraser">("select");
  const [isSymmetric, setIsSymmetric] = useState(false);
  const [symmetryAxis, setSymmetryAxis] = useState<'x' | 'y'>('x');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isGridSettingsOpen, setIsGridSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportSettingsOpen, setIsExportSettingsOpen] = useState(false);
  const [exportScale, setExportScale] = useState(3);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isTextLayout, setIsTextLayout] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [activeCategory, setActiveCategory] = useState<string>(Object.keys(colorData)[0]);
  const [showLabels, setShowLabels] = useState(false);
  const [showCenterMark, setShowCenterMark] = useState(true);
  const [hGuides, setHGuides] = useState<Set<number>>(new Set());
  const [vGuides, setVGuides] = useState<Set<number>>(new Set());
  const [hoveredCell, setHoveredCell] = useState<{x: number, y: number} | null>(null);
  
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

  const [confirmReplace, setConfirmReplace] = useState<{
    oldColor: string;
    newColor: string | null;
  } | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

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

  const togglePreview = () => {
    const isOpening = !isPreviewMode;
    setIsPreviewMode(isOpening);
  };

  const cellSize = 20 * zoom;

  const handleCellClick = (x: number, y: number) => {
    if (tool === "brush" || tool === "select") {
      setCellColor(x, y, selectedColor);

      if (isSymmetric) {
        let mirrorX = x;
        let mirrorY = y;
        if (symmetryAxis === 'x') {
           mirrorX = width - 1 - x;
        } else {
           mirrorY = height - 1 - y;
        }
        
        if (mirrorX !== x || mirrorY !== y) {
          setCellColor(mirrorX, mirrorY, selectedColor);
        }
      }
    } else if (tool === "eraser") {
      setCellColor(x, y, null);
      if (isSymmetric) {
        let mirrorX = x;
        let mirrorY = y;
        if (symmetryAxis === 'x') {
           mirrorX = width - 1 - x;
        } else {
           mirrorY = height - 1 - y;
        }
        if (mirrorX !== x || mirrorY !== y) {
          setCellColor(mirrorX, mirrorY, null);
        }
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
      // Exclude markedCells, history, undoStack, redoStack from the saved file
      const { markedCells, history, undoStack, redoStack, grid, ...rest } = state;

      // Convert grid colors from hex to ID
      const gridWithIds = grid.map(row => 
        row.map(cell => ({
          ...cell,
          color: cell.color ? (getColorId(cell.color) || cell.color) : null
        }))
      );

      const finalState = {
        ...rest,
        grid: gridWithIds
      };

      const data = JSON.stringify(finalState, null, 2);
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
    
    // Save current layout state
    const originalLayout = isTextLayout;
    
    try {
      setIsExporting(true);
      setExportProgress(0);
      
      // Force text layout for export
      setIsTextLayout(true);
      
      // Fake progress animation
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);
      
      // Wait for a moment to ensure UI is ready and layout is updated
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(exportTarget, {
        backgroundColor: null, // Transparent background if possible
        scale: exportScale, // Use selected scale
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
        setIsTextLayout(originalLayout); // Restore layout
        return;
      }

      // Convert canvas to blob then array buffer
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsExporting(false);
          setExportProgress(0);
          setIsTextLayout(originalLayout); // Restore layout
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
          setIsTextLayout(originalLayout); // Restore layout
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
      setIsExporting(false);
      setExportProgress(0);
      setIsTextLayout(originalLayout); // Restore layout
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
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors mr-2"
            title={theme === 'dark' ? '切换亮色模式' : '切换深色模式'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Symmetry Controls */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 mr-2">
            <button
              onClick={() => setIsSymmetric(!isSymmetric)}
              className={clsx(
                "p-2 rounded-md transition-colors",
                isSymmetric ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              )}
              title="对称模式"
            >
              <Copy size={18} />
            </button>
            {isSymmetric && (
              <>
                <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-600 mx-1" />
                <button
                  onClick={() => setSymmetryAxis('x')}
                  className={clsx(
                    "p-2 rounded-md transition-colors",
                    symmetryAxis === 'x' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                  title="左右对称"
                >
                  <FlipHorizontal size={18} />
                </button>
                <button
                  onClick={() => setSymmetryAxis('y')}
                  className={clsx(
                    "p-2 rounded-md transition-colors",
                    symmetryAxis === 'y' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                  title="上下对称"
                >
                  <FlipVertical size={18} />
                </button>
              </>
            )}
          </div>

          {/* Undo/Redo */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 mr-2">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className={clsx(
                "p-2 rounded-md transition-colors",
                undoStack.length === 0 ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
              title="撤销"
            >
              <Undo size={18} />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className={clsx(
                "p-2 rounded-md transition-colors",
                redoStack.length === 0 ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
              title="重做"
            >
              <Redo size={18} />
            </button>
          </div>

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
                className={clsx(
                  "w-6 h-6 rounded-full border border-zinc-300 dark:border-zinc-600 flex items-center justify-center text-[10px] font-bold overflow-hidden",
                  selectedColor === '#FDFBFF' && "frosted-bead"
                )}
                style={{ 
                  backgroundColor: selectedColor === '#FDFBFF' ? undefined : (selectedColor || 'transparent'),
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
                        className={clsx(
                          "group relative w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-600 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800 flex items-center justify-center",
                          color === '#FDFBFF' && "frosted-bead"
                        )}
                        style={{ backgroundColor: color === '#FDFBFF' ? undefined : color }}
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
            onClick={() => setIsExportSettingsOpen(true)}
            disabled={isExporting}
            className={clsx(
              "p-2 rounded-lg transition-colors",
              isExporting 
                ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed" 
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            )}
            title="导出图片"
          >
            {isExporting ? <Loader2 size={20} className="animate-spin" /> : <LucideImage size={20} />}
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
                className="bg-zinc-200 dark:bg-zinc-800 border-r border-b border-zinc-200 dark:border-zinc-800"
                style={{
                  width: 'fit-content'
                }}
              >
                <CanvasGridRenderer 
                  width={width}
                  height={height}
                  grid={grid}
                  zoom={zoom}
                  theme={theme as 'light' | 'dark'}
                  showLabels={showLabels}
                  showCenterMark={showCenterMark}
                  hGuides={hGuides}
                  vGuides={vGuides}
                  isSymmetric={isSymmetric}
                  symmetryAxis={symmetryAxis}
                  tool={tool}
                  hoveredCell={hoveredCell}
                  onCellClick={handleCellClick}
                  onCellHover={(x, y) => setHoveredCell({ x, y })}
                  onMouseLeave={() => {
                    handleMouseLeave();
                  }}
                />
              </div>
            </div>

            {/* Bottom Stats Area */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">颜色统计清单</h3>
                  <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                    <button
                      onClick={() => setIsTextLayout(false)}
                      className={clsx(
                        "p-1.5 rounded-md transition-colors",
                        !isTextLayout 
                          ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                          : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      )}
                      title="网格视图"
                    >
                      <LayoutGrid size={14} />
                    </button>
                    <button
                      onClick={() => setIsTextLayout(true)}
                      className={clsx(
                        "p-1.5 rounded-md transition-colors",
                        isTextLayout 
                          ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                          : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      )}
                      title="文本视图"
                    >
                      <List size={14} />
                    </button>
                  </div>
                </div>
                <span className="text-xs text-zinc-500">总计: {colorStats.total} 颗</span>
              </div>
              
              {isTextLayout ? (
                <div className="grid grid-cols-4 gap-x-8 gap-y-2 text-sm font-mono text-zinc-700 dark:text-zinc-300">
                  {colorStats.colors.map(([color, count]) => (
                    <div key={color} className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1">
                      <span className="font-bold">{getColorId(color)}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4 export-stats-grid">
                  {colorStats.colors.map(([color, count]) => (
                    <div 
                      key={color} 
                      onClick={() => setSelectedColor(color)}
                      className="flex items-center gap-2 p-2 rounded bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                    >
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
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-bold whitespace-nowrap">{getColorId(color)}</span>
                          <span className="text-xs font-mono text-zinc-500">{count}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmReplace({
                              oldColor: color,
                              newColor: selectedColor
                            });
                          }}
                          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-all"
                          title="替换颜色"
                        >
                          <MoreHorizontal size={14} className="text-zinc-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {colorStats.colors.length === 0 && (
                <div className="text-center py-4 text-xs text-zinc-400">
                  暂无颜色数据
                </div>
              )}

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-400">
                <img src={iconSvg} width="44" />
                <span>perler-beads</span>
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
                
                {/* Preview Canvas Grid */}
                <div className="relative z-10">
                  <CanvasGridRenderer 
                    width={width}
                    height={height}
                    grid={grid}
                    zoom={zoom}
                    theme="light"
                    showLabels={false}
                    showCenterMark={false}
                    hGuides={new Set()}
                    vGuides={new Set()}
                    isSymmetric={false}
                    symmetryAxis="x"
                    tool="select"
                    hoveredCell={null}
                    onCellClick={() => {}}
                    onCellHover={() => {}}
                    onMouseLeave={() => {}}
                  />
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

      {isExportSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-white">导出图片设置</h3>
            
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">清晰度 (缩放倍数)</span>
                <span className="text-sm font-bold text-zinc-900 dark:text-white">{exportScale}x</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="1" 
                value={exportScale} 
                onChange={(e) => setExportScale(Number(e.target.value))}
                className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-xs text-zinc-400 mt-2">
                倍数越高，图片越清晰，但文件体积也越大。建议 3x-5x。
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsExportSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setIsExportSettingsOpen(false);
                  handleExportImage();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                确定导出
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmReplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4">确认替换颜色</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              确定要将所有 <span className="font-bold inline-block px-1 rounded border border-zinc-200 dark:border-zinc-700" style={{ backgroundColor: confirmReplace.oldColor === '#FDFBFF' ? undefined : confirmReplace.oldColor, color: getContrastColor(confirmReplace.oldColor) }}>{getColorId(confirmReplace.oldColor)}</span> 颜色的珠子替换为 <span className="font-bold inline-block px-1 rounded border border-zinc-200 dark:border-zinc-700" style={{ backgroundColor: confirmReplace.newColor && confirmReplace.newColor !== '#FDFBFF' ? confirmReplace.newColor : undefined, color: confirmReplace.newColor ? getContrastColor(confirmReplace.newColor) : 'inherit' }}>{confirmReplace.newColor ? getColorId(confirmReplace.newColor) : '透明/橡皮擦'}</span> 吗？
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmReplace(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  replaceColor(confirmReplace.oldColor, confirmReplace.newColor);
                  setConfirmReplace(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                确定替换
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
