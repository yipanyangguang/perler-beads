import CanvasGridRenderer from "@/components/CanvasGridRenderer";
import { ArrowLeft, ArrowUp, ArrowRight, ArrowDown, Eraser, MousePointer2, Paintbrush, Save, ZoomIn, ZoomOut, ChevronDown, Eye, EyeOff, Grid3X3, Trash2, Plus, Loader2, Wand2, Moon, Sun, FlipHorizontal, FlipVertical, Copy, Undo, Redo, MoreHorizontal, Image as LucideImage, List, LayoutGrid } from "lucide-react";
import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "@/store/useProjectStore";
import { useTheme } from "@/hooks/useTheme";
import html2canvas from "html2canvas";
import { clsx } from "@/utils/clsx";
import {
  saveFileDialog,
  writeFileText,
  writeFileBinary,
} from "@/utils/tauri-compat";
import colorData from "@/color";
import { getColorId, getContrastColor } from "@/utils/colorUtils";
import iconSvg from '@/assets/logo.png';
import styles from "./index.module.scss";

export default function Editor() {
  const navigate = useNavigate();
  const { grid, width, height, name, setCellColor, setCellsColors, pushToUndoStack, moveGrid, addRow, deleteRow, addColumn, deleteColumn, replaceColor, undo, redo, undoStack, redoStack, backgroundImageUrl, backgroundImageOpacity, setBackgroundImage, setBackgroundImageOpacity, removeBackgroundImage, flipHorizontal } = useProjectStore();
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
  // const [hoveredCell, setHoveredCell] = useState<{x: number, y: number} | null>(null); // Removed for performance
  const coordsRef = useRef<HTMLParagraphElement>(null); // Direct DOM access

  const [isBackgroundSettingsOpen, setIsBackgroundSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundBtnRef = useRef<HTMLButtonElement>(null);
  
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

  // Background image handlers
  const handleBackgroundImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setBackgroundImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBackgroundImage = () => {
    removeBackgroundImage();
  };

  const handleBackgroundOpacityChange = (value: number) => {
    setBackgroundImageOpacity(value);
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
      setCellColor(x, y, selectedColor, true);

      if (isSymmetric) {
        let mirrorX = x;
        let mirrorY = y;
        if (symmetryAxis === 'x') {
           mirrorX = width - 1 - x;
        } else {
           mirrorY = height - 1 - y;
        }
        
        if (mirrorX !== x || mirrorY !== y) {
          setCellColor(mirrorX, mirrorY, selectedColor, true);
        }
      }
    } else if (tool === "eraser") {
      setCellColor(x, y, null, true);
      if (isSymmetric) {
        let mirrorX = x;
        let mirrorY = y;
        if (symmetryAxis === 'x') {
           mirrorX = width - 1 - x;
        } else {
           mirrorY = height - 1 - y;
        }
        if (mirrorX !== x || mirrorY !== y) {
          setCellColor(mirrorX, mirrorY, null, true);
        }
      }
    }
  };

  const handleMouseLeave = () => {
    // setHoveredCell(null);
    if (coordsRef.current) {
       coordsRef.current.innerText = "X: 0, Y: 0";
    }
  };
  
  const handleCellHover = useCallback((x: number, y: number) => {
     if (coordsRef.current) {
        coordsRef.current.innerText = `X: ${x + 1}, Y: ${y + 1}`;
     }
  }, []);

  const handleCellDrag = useCallback((_x: number, _y: number) => {
    if (tool === 'brush') return selectedColor;
    if (tool === 'eraser') return null;
    return null; 
  }, [tool, selectedColor]);

  const handleBatchUpdate = useCallback((updates: {x: number, y: number, color: string | null}[]) => {
     if (updates.length > 0) {
        setCellsColors(updates, true); // History already pushed by onStrokeStart
     }
  }, [setCellsColors]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const filePath = await saveFileDialog({
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
      // Exclude markedCells, history, undoStack, redoStack, and background image from the saved file
      const { 
        markedCells, 
        history, 
        undoStack, 
        redoStack, 
        grid, 
        backgroundImageUrl, 
        backgroundImageOpacity, 
        ...rest 
      } = state;

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
      await writeFileText(filePath, data);
      
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
      
      const filePath = await saveFileDialog({
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
          await writeFileBinary(filePath, uint8Array);
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
    <div 
      className={clsx(styles.container, { [styles.dark]: theme === 'dark' })}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <header className={clsx(styles.header, { [styles.dark]: theme === 'dark' })}>
        <div className={styles.headerLeft}>
          <button 
            onClick={() => navigate("/")}
            className={clsx(styles.backButton, { [styles.dark]: theme === 'dark' })}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className={styles.headerTitle}>{name}</h1>
            <p ref={coordsRef} className={styles.headerSubtitle}>
              X: 0, Y: 0
            </p>
          </div>
        </div>
        
        <div className={styles.headerRight}>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={clsx(styles.themeToggle, { [styles.dark]: theme === 'dark' })}
            title={theme === 'dark' ? '切换亮色模式' : '切换深色模式'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Symmetry Controls */}
          <div className={clsx(styles.symmetryGroup, { [styles.dark]: theme === 'dark' })}>
            <button
              onClick={() => setIsSymmetric(!isSymmetric)}
              className={clsx(styles.symmetryButton, { [styles.active]: isSymmetric, [styles.dark]: theme === 'dark' })}
              title="对称模式"
            >
              <Copy size={18} />
            </button>
            {isSymmetric && (
              <>
                <div className={clsx(styles.symmetryDivider, { [styles.dark]: theme === 'dark' })} />
                <button
                  onClick={() => setSymmetryAxis('x')}
                  className={clsx(styles.symmetryButton, styles.axisButton, { [styles.active]: symmetryAxis === 'x', [styles.dark]: theme === 'dark' })}
                  title="左右对称"
                >
                  <FlipHorizontal size={18} />
                </button>
                <button
                  onClick={() => setSymmetryAxis('y')}
                  className={clsx(styles.symmetryButton, styles.axisButton, { [styles.active]: symmetryAxis === 'y', [styles.dark]: theme === 'dark' })}
                  title="上下对称"
                >
                  <FlipVertical size={18} />
                </button>
              </>
            )}
          </div>

          {/* Flip Controls */}
          <button
              onClick={flipHorizontal}
              className={clsx(styles.symmetryButton, { [styles.dark]: theme === 'dark' })}
              title="水平镜像翻转"
            >
              <FlipHorizontal size={18} />
          </button>

          {/* Undo/Redo */}
          <div className={clsx(styles.historyGroup, { [styles.dark]: theme === 'dark' })}>
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className={clsx(styles.historyButton, { [styles.dark]: theme === 'dark' })}
              title="撤销"
            >
              <Undo size={18} />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className={clsx(styles.historyButton, { [styles.dark]: theme === 'dark' })}
              title="重做"
            >
              <Redo size={18} />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className={clsx(styles.zoomGroup, { [styles.dark]: theme === 'dark' })}>
            <ZoomOut size={16} className={clsx(styles.zoomIcon, { [styles.dark]: theme === 'dark' })} />
            <input 
              type="range" 
              min="0.5" 
              max="2" 
              step="0.1" 
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className={clsx(styles.zoomSlider, { [styles.dark]: theme === 'dark' })}
            />
            <ZoomIn size={16} className={clsx(styles.zoomIcon, { [styles.dark]: theme === 'dark' })} />
            <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
          </div>

          {/* Label Toggle */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={clsx(styles.toggleButton, { [styles.active]: showLabels, [styles.dark]: theme === 'dark' })}
            title="显示色号"
          >
            {showLabels ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>

          {/* Grid Settings */}
          <div className={styles.settingsWrapper}>
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
              className={clsx(styles.toggleButton, { [styles.active]: isGridSettingsOpen, [styles.dark]: theme === 'dark' })}
              title="网格设置"
            >
              <Grid3X3 size={20} />
            </button>

            {isGridSettingsOpen && gridPopupPos && (
              <>
                <div 
                  className={styles.backdrop}
                  onClick={() => setIsGridSettingsOpen(false)}
                />
                <div 
                  className={clsx(styles.gridPopup, { [styles.dark]: theme === 'dark' })}
                  style={{ top: gridPopupPos.top, right: gridPopupPos.right }}
                >
                  <h3 className={clsx(styles.gridPopupTitle, { [styles.dark]: theme === 'dark' })}>网格辅助线</h3>
                  
                  <div className={styles.gridPopupContent}>
                    <label className={styles.gridPopupCheckbox}>
                      <span className={clsx(styles.gridPopupCheckboxLabel, { [styles.dark]: theme === 'dark' })}>显示中心点 (X)</span>
                      <input 
                        type="checkbox" 
                        checked={showCenterMark}
                        onChange={(e) => setShowCenterMark(e.target.checked)}
                        className="toggle"
                      />
                    </label>

                    <div className={clsx(styles.gridPopupDivider, { [styles.dark]: theme === 'dark' })} />
                    
                    <button 
                      onClick={addStandardGuides}
                      className={clsx(styles.gridPopupButton, { [styles.dark]: theme === 'dark' })}
                    >
                      <Plus size={16} />
                      <span>添加 10x10 辅助线</span>
                    </button>
                    
                    <button 
                      onClick={clearGuides}
                      className={clsx(styles.gridPopupButton, styles.danger, { [styles.dark]: theme === 'dark' })}
                    >
                      <Trash2 size={16} />
                      <span>清除所有辅助线</span>
                    </button>

                    <p className={clsx(styles.gridPopupHint, { [styles.dark]: theme === 'dark' })}>
                      提示：点击标尺数字可单独切换该行/列的辅助线。
                      <br />
                      右键点击标尺可增加或删除行/列。
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Background Image Settings */}
          <button 
            ref={backgroundBtnRef}
            onClick={() => {
              const rect = backgroundBtnRef.current?.getBoundingClientRect();
              if (rect) {
                setIsBackgroundSettingsOpen(!isBackgroundSettingsOpen);
                setGridPopupPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
              }
            }}
            className={clsx(styles.toggleButton, {
              [styles.active]: isBackgroundSettingsOpen,
              [styles.dark]: theme === 'dark'
            })}
            title="背景图设置"
          >
            <LucideImage size={20} />
          </button>

          {isBackgroundSettingsOpen && gridPopupPos && (
            <>
              <div 
                className={styles.backdrop}
                onClick={() => setIsBackgroundSettingsOpen(false)}
              />
              <div 
                className={clsx(styles.backgroundPopup, { [styles.dark]: theme === 'dark' })}
                style={{ top: gridPopupPos.top, right: gridPopupPos.right }}
              >
                <h3 className={clsx(styles.backgroundPopupTitle, { [styles.dark]: theme === 'dark' })}>背景图设置</h3>
                
                <div className={styles.backgroundPopupContent}>
                  {/* Upload Button */}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={styles.uploadButton}
                  >
                    <LucideImage size={16} />
                    <span>导入背景图</span>
                  </button>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*"
                    onChange={handleBackgroundImageUpload}
                    className={styles.hidden}
                  />

                  {/* Background Image Status */}
                  {backgroundImageUrl ? (
                    <>
                      <div className={clsx(styles.backgroundStatus, { [styles.dark]: theme === 'dark' })}>
                        <p className={clsx(styles.backgroundStatusTitle, { [styles.dark]: theme === 'dark' })}>✓ 已导入背景图</p>
                        
                        {/* Opacity Slider */}
                        <div className={styles.backgroundOpacityWrapper}>
                          <label className={clsx(styles.backgroundOpacityLabel, { [styles.dark]: theme === 'dark' })}>
                            <span>透明度</span>
                            <span className={clsx(styles.backgroundOpacityValue, { [styles.dark]: theme === 'dark' })}>
                              {backgroundImageOpacity}%
                            </span>
                          </label>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            value={backgroundImageOpacity}
                            onChange={(e) => handleBackgroundOpacityChange(parseInt(e.target.value))}
                            className={clsx(styles.backgroundOpacitySlider, { [styles.dark]: theme === 'dark' })}
                          />
                          <div className={clsx(styles.backgroundOpacityHints, { [styles.dark]: theme === 'dark' })}>
                            <span>0% (隐藏)</span>
                            <span>100% (可见)</span>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button 
                          onClick={handleRemoveBackgroundImage}
                          className={clsx(styles.removeBackgroundButton, { [styles.dark]: theme === 'dark' })}
                        >
                          <Trash2 size={14} />
                          <span>删除背景图</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className={clsx(styles.backgroundPlaceholder, { [styles.dark]: theme === 'dark' })}>
                      <p className={clsx(styles.backgroundPlaceholderText, { [styles.dark]: theme === 'dark' })}>
                        未导入背景图<br />
                        点击上方按钮选择图片
                      </p>
                    </div>
                  )}

                  <p className={clsx(styles.backgroundPopupHint, { [styles.dark]: theme === 'dark' })}>
                    💡 背景图将以 100% 宽高适配编辑板块，调整透明度后可以看到背景图内容。
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Move Grid Controls */}
          <div className={clsx(styles.moveGridContainer, { [styles.dark]: theme === 'dark' })}>
            <button onClick={() => moveGrid('left')} className={clsx(styles.moveGridButton, { [styles.dark]: theme === 'dark' })} title="向左移动"><ArrowLeft size={14} /></button>
            <div className={styles.moveGridVertical}>
              <button onClick={() => moveGrid('up')} className={clsx(styles.moveGridButton, { [styles.dark]: theme === 'dark' })} title="向上移动"><ArrowUp size={14} /></button>
              <button onClick={() => moveGrid('down')} className={clsx(styles.moveGridButton, { [styles.dark]: theme === 'dark' })} title="向下移动"><ArrowDown size={14} /></button>
            </div>
            <button onClick={() => moveGrid('right')} className={clsx(styles.moveGridButton, { [styles.dark]: theme === 'dark' })} title="向右移动"><ArrowRight size={14} /></button>
          </div>

          <div className={clsx(styles.toolGroup, { [styles.dark]: theme === 'dark' })}>
            <button 
              onClick={() => setTool("select")}
              className={clsx(styles.toolButton, {
                [styles.active]: tool === "select",
                [styles.dark]: theme === 'dark'
              })}
              title="点选模式"
            >
              <MousePointer2 size={18} />
            </button>
            <button 
              onClick={() => setTool("brush")}
              className={clsx(styles.toolButton, {
                [styles.active]: tool === "brush",
                [styles.dark]: theme === 'dark'
              })}
              title="笔刷模式"
            >
              <Paintbrush size={18} />
            </button>
            <button 
              onClick={() => setTool("eraser")}
              className={clsx(styles.toolButton, {
                [styles.active]: tool === "eraser",
                [styles.dark]: theme === 'dark'
              })}
              title="橡皮擦"
            >
              <Eraser size={18} />
            </button>
          </div>

          <div className={styles.colorPickerWrapper}>
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
              className={clsx(styles.colorButton, { [styles.dark]: theme === 'dark' })}
            >
              <div 
                className={clsx(styles.colorPreview, {
                  'frosted-bead': selectedColor === '#FDFBFF',
                  [styles.dark]: theme === 'dark'
                })}
                style={{ 
                  backgroundColor: selectedColor === '#FDFBFF' ? undefined : (selectedColor || 'transparent'),
                  color: selectedColor ? getContrastColor(selectedColor) : undefined
                }}
              >
                {selectedColor && getColorId(selectedColor)}
              </div>
              <ChevronDown size={16} className={clsx(styles.colorButtonIcon, { [styles.dark]: theme === 'dark' })} />
            </button>
            
            {isColorPickerOpen && colorPopupPos && (
              <>
                <div 
                  className={styles.backdrop}
                  onClick={() => setIsColorPickerOpen(false)}
                />
                <div 
                  className={clsx(styles.colorPickerPopup, { [styles.dark]: theme === 'dark' })}
                  style={{ top: colorPopupPos.top, right: colorPopupPos.right }}
                >
                  {/* Category Tabs */}
                  <div className={clsx(styles.categoryTabs, { [styles.dark]: theme === 'dark' })}>
                    {Object.keys(colorData).map(category => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={clsx(styles.categoryTab, {
                          [styles.active]: activeCategory === category,
                          [styles.dark]: theme === 'dark'
                        })}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  
                  {/* Color Grid */}
                  <div className={styles.colorGrid}>
                    {Object.entries(currentCategoryColors).map(([id, color]) => (
                      <button
                        key={id}
                        className={clsx(styles.colorGridButton, {
                          'frosted-bead': color === '#FDFBFF',
                          [styles.dark]: theme === 'dark'
                        })}
                        style={{ backgroundColor: color === '#FDFBFF' ? undefined : color }}
                        onClick={() => {
                          setSelectedColor(color);
                          setIsColorPickerOpen(false);
                          if (tool === 'eraser') setTool('brush');
                        }}
                      >
                        <span 
                          className={styles.colorGridButtonLabel}
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

          <div className={clsx(styles.divider, { [styles.dark]: theme === 'dark' })} />

          <button 
            onClick={togglePreview}
            className={clsx(styles.actionButton, {
              [styles.active]: isPreviewMode,
              [styles.preview]: isPreviewMode,
              [styles.dark]: theme === 'dark'
            })}
            title="风格化预览"
          >
            <Wand2 size={20} />
          </button>

          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className={clsx(styles.actionButton, {
              [styles.disabled]: isSaving,
              [styles.dark]: theme === 'dark'
            })}
            title="保存 JSON"
          >
            {isSaving ? <Loader2 size={20} className={styles.spinIcon} /> : <Save size={20} />}
          </button>
          
          <button 
            onClick={() => setIsExportSettingsOpen(true)}
            disabled={isExporting}
            className={clsx(styles.actionButton, {
              [styles.disabled]: isExporting,
              [styles.dark]: theme === 'dark'
            })}
            title="导出图片"
          >
            {isExporting ? <Loader2 size={20} className={styles.spinIcon} /> : <LucideImage size={20} />}
          </button>

          <button 
            onClick={() => navigate("/marking")}
            className={clsx(styles.markingButton, { [styles.dark]: theme === 'dark' })}
          >
            标记模式
          </button>
        </div>
      </header>

      {/* Main Editor Area */}
      <main className={clsx(styles.main, { [styles.dark]: theme === 'dark' })}>
        <div 
          id="flipper"
          className={clsx(styles.flipper, { [styles.active]: isPreviewMode })}
          style={{ 
            transformStyle: 'preserve-3d',
            transform: isPreviewMode ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* Front Face: Editor */}
          <div 
            className={clsx(styles.frontFace, {
              [styles.active]: !isPreviewMode,
              [styles.dark]: theme === 'dark'
            })}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className={styles.editorScrollContainer}>
              <div className={styles.editorInnerContainer}>
                {/* Export Container: Includes Grid, Rulers, and Stats */}
                <div id="export-container" className={clsx(styles.exportContainer, { [styles.dark]: theme === 'dark' })}>
            
            {/* Grid Area */}
            <div className={styles.gridArea} style={{ 
              gridTemplateColumns: `32px 1fr`, 
              gridTemplateRows: `32px 1fr` 
            }}>
              {/* Corner (Empty) */}
              <div className={clsx(styles.rulerCorner, { [styles.dark]: theme === 'dark' })}></div>

              {/* Top Ruler */}
              <div 
                className={clsx(styles.topRuler, { [styles.dark]: theme === 'dark' })}
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
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({ type: 'col', index: i, x: e.clientX, y: e.clientY });
                    }}
                    className={clsx(styles.rulerCell, {
                      [styles.active]: vGuides.has(i),
                      [styles.dark]: theme === 'dark'
                    })}
                    style={{ height: '32px', minWidth: `${cellSize}px`, width: `${cellSize}px` }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Left Ruler */}
              <div 
                className={clsx(styles.leftRuler, { [styles.dark]: theme === 'dark' })}
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
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({ type: 'row', index: i, x: e.clientX, y: e.clientY });
                    }}
                    className={clsx(styles.rulerCell, styles.rulerCellLeft, {
                      [styles.active]: hGuides.has(i),
                      [styles.dark]: theme === 'dark'
                    })}
                    style={{ width: '32px', minHeight: `${cellSize}px`, height: `${cellSize}px` }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div 
                className={clsx(styles.canvasContainer, { [styles.dark]: theme === 'dark' })}
                style={{
                  width: 'fit-content',
                  height: 'fit-content'
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
                  hoveredCell={null}
                  backgroundImageUrl={backgroundImageUrl}
                  backgroundImageOpacity={backgroundImageOpacity}
                  onCellClick={handleCellClick}
                  onCellDrag={handleCellDrag}
                  onBatchUpdate={handleBatchUpdate}
                  onCellHover={handleCellHover}
                  onMouseLeave={() => {
                    handleMouseLeave();
                  }}
                  onStrokeStart={pushToUndoStack}
                />
              </div>
            </div>

            {/* Bottom Stats Area */}
            <div className={clsx(styles.statsSection, { [styles.dark]: theme === 'dark' })}>
              <div className={styles.statsHeader}>
                <div className={styles.statsHeaderLeft}>
                  <h3 className={clsx(styles.statsTitle, { [styles.dark]: theme === 'dark' })}>颜色统计清单</h3>
                  <div className={clsx(styles.layoutToggle, { [styles.dark]: theme === 'dark' })}>
                    <button
                      onClick={() => setIsTextLayout(false)}
                      className={clsx(styles.layoutToggleButton, {
                        [styles.active]: !isTextLayout,
                        [styles.dark]: theme === 'dark'
                      })}
                      title="网格视图"
                    >
                      <LayoutGrid size={14} />
                    </button>
                    <button
                      onClick={() => setIsTextLayout(true)}
                      className={clsx(styles.layoutToggleButton, {
                        [styles.active]: isTextLayout,
                        [styles.dark]: theme === 'dark'
                      })}
                      title="文本视图"
                    >
                      <List size={14} />
                    </button>
                  </div>
                </div>
                <span className={clsx(styles.statsTotal, { [styles.dark]: theme === 'dark' })}>总计: {colorStats.total} 颗</span>
              </div>
              
              {isTextLayout ? (
                <div className={clsx(styles.statsTextView, { [styles.dark]: theme === 'dark' })}>
                  {colorStats.colors.map(([color, count]) => (
                    <div key={color} className={clsx(styles.statsTextItem, { [styles.dark]: theme === 'dark' })}>
                      <span className={styles.statsTextItemId}>{getColorId(color)}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.statsGridView}>
                  {colorStats.colors.map(([color, count]) => (
                    <div 
                      key={color} 
                      onClick={() => setSelectedColor(color)}
                      className={clsx(styles.statsCard, { [styles.dark]: theme === 'dark' })}
                    >
                      <div 
                        className={clsx(styles.statsCardColor, {
                          'frosted-bead': color === '#FDFBFF',
                          [styles.dark]: theme === 'dark'
                        })}
                        style={{ backgroundColor: color === '#FDFBFF' ? undefined : color }}
                      >
                        <span 
                          className={styles.statsCardColorLabel}
                          style={{ color: getContrastColor(color) }}
                        >
                          {getColorId(color)}
                        </span>
                      </div>
                      <div className={styles.statsCardInfo}>
                        <div className={styles.statsCardInfoRow}>
                          <span className={styles.statsCardId}>{getColorId(color)}</span>
                          <span className={clsx(styles.statsCardCount, { [styles.dark]: theme === 'dark' })}>{count}</span>
                        </div>
                      </div>
                      <div className={styles.statsCardActions}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmReplace({
                              oldColor: color,
                              newColor: selectedColor
                            });
                          }}
                          className={clsx(styles.statsCardActionButton, { [styles.dark]: theme === 'dark' })}
                          title="替换颜色"
                        >
                          <MoreHorizontal size={14} className={clsx(styles.statsCardActionIcon, { [styles.dark]: theme === 'dark' })} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {colorStats.colors.length === 0 && (
                <div className={clsx(styles.statsEmpty, { [styles.dark]: theme === 'dark' })}>
                  暂无颜色数据
                </div>
              )}

              <div className={clsx(styles.statsFooter, { [styles.dark]: theme === 'dark' })}>
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
        className={clsx(styles.backFace, {
          [styles.active]: isPreviewMode,
          [styles.dark]: theme === 'dark'
        })}
        style={{ 
          backfaceVisibility: 'hidden', 
          transform: 'rotateY(180deg)' 
        }}
      >
            <div className={styles.previewContainer}>
              <div className={styles.previewCard}>
                {/* Texture Overlay */}
                <div className={styles.previewTextureOverlay} 
                      style={{ 
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                        filter: 'contrast(120%) brightness(100%)'
                      }}></div>
                
                {/* Preview Canvas Grid - 纯色块预览 */}
                <div className={styles.previewCanvasWrapper}>
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
                    backgroundImageUrl={undefined}
                    backgroundImageOpacity={100}
                    previewMode={true}
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
          className={clsx(styles.contextMenu, { [styles.dark]: theme === 'dark' })}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'col' ? (
            <>
              <button 
                onClick={() => { addColumn(contextMenu.index); setContextMenu(null); }}
                className={clsx(styles.contextMenuItem, { [styles.dark]: theme === 'dark' })}
              >
                在左侧插入列
              </button>
              <button 
                onClick={() => { addColumn(contextMenu.index + 1); setContextMenu(null); }}
                className={clsx(styles.contextMenuItem, { [styles.dark]: theme === 'dark' })}
              >
                在右侧插入列
              </button>
              <div className={clsx(styles.contextMenuDivider, { [styles.dark]: theme === 'dark' })} />
              <button 
                onClick={() => { deleteColumn(contextMenu.index); setContextMenu(null); }}
                className={clsx(styles.contextMenuItem, styles.danger, { [styles.dark]: theme === 'dark' })}
              >
                删除此列
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => { addRow(contextMenu.index); setContextMenu(null); }}
                className={clsx(styles.contextMenuItem, { [styles.dark]: theme === 'dark' })}
              >
                在上方插入行
              </button>
              <button 
                onClick={() => { addRow(contextMenu.index + 1); setContextMenu(null); }}
                className={clsx(styles.contextMenuItem, { [styles.dark]: theme === 'dark' })}
              >
                在下方插入行
              </button>
              <div className={clsx(styles.contextMenuDivider, { [styles.dark]: theme === 'dark' })} />
              <button 
                onClick={() => { deleteRow(contextMenu.index); setContextMenu(null); }}
                className={clsx(styles.contextMenuItem, styles.danger, { [styles.dark]: theme === 'dark' })}
              >
                删除此行
              </button>
            </>
          )}
        </div>
      )}

      {isExporting && (
        <div className={styles.exportProgressOverlay}>
          <div className={styles.exportProgressContainer}>
            <div className={styles.exportProgressHeader}>
              <span>正在导出图片...</span>
              <span>{Math.round(exportProgress)}%</span>
            </div>
            <div className={styles.exportProgressBarWrapper}>
              <div 
                className={styles.exportProgressBar}
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <p className={styles.exportProgressHint}>正在生成高清网格与统计数据</p>
          </div>
        </div>
      )}

      {isExportSettingsOpen && (
        <div className={styles.modalOverlay}>
          <div className={clsx(styles.modal, { [styles.dark]: theme === 'dark' })}>
            <h3 className={clsx(styles.modalTitle, { [styles.dark]: theme === 'dark' })}>导出图片设置</h3>
            
            <div className={styles.modalContent}>
              <div className={styles.scaleControlHeader}>
                <span className={clsx(styles.scaleControlLabel, { [styles.dark]: theme === 'dark' })}>清晰度 (缩放倍数)</span>
                <span className={clsx(styles.scaleControlValue, { [styles.dark]: theme === 'dark' })}>{exportScale}x</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="1" 
                value={exportScale} 
                onChange={(e) => setExportScale(Number(e.target.value))}
                className={clsx(styles.scaleControlSlider, { [styles.dark]: theme === 'dark' })}
              />
              <p className={clsx(styles.scaleControlHint, { [styles.dark]: theme === 'dark' })}>
                倍数越高，图片越清晰，但文件体积也越大。建议 3x-5x。
              </p>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => setIsExportSettingsOpen(false)}
                className={clsx(styles.modalButton, styles.cancel, { [styles.dark]: theme === 'dark' })}
              >
                取消
              </button>
              <button
                onClick={() => {
                  setIsExportSettingsOpen(false);
                  handleExportImage();
                }}
                className={clsx(styles.modalButton, styles.primary)}
              >
                确定导出
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmReplace && (
        <div className={styles.modalOverlay}>
          <div className={clsx(styles.modal, { [styles.dark]: theme === 'dark' })}>
            <h3 className={clsx(styles.modalTitle, { [styles.dark]: theme === 'dark' })}>确认替换颜色</h3>
            <p className={clsx(styles.modalText, { [styles.dark]: theme === 'dark' })}>
              确定要将所有 <span className={clsx(styles.colorBadge, { [styles.dark]: theme === 'dark' })} style={{ backgroundColor: confirmReplace.oldColor === '#FDFBFF' ? undefined : confirmReplace.oldColor, color: getContrastColor(confirmReplace.oldColor) }}>{getColorId(confirmReplace.oldColor)}</span> 颜色的珠子替换为 <span className={clsx(styles.colorBadge, { [styles.dark]: theme === 'dark' })} style={{ backgroundColor: confirmReplace.newColor && confirmReplace.newColor !== '#FDFBFF' ? confirmReplace.newColor : undefined, color: confirmReplace.newColor ? getContrastColor(confirmReplace.newColor) : 'inherit' }}>{confirmReplace.newColor ? getColorId(confirmReplace.newColor) : '透明/橡皮擦'}</span> 吗？
            </p>
            <div className={styles.modalActions}>
              <button
                onClick={() => setConfirmReplace(null)}
                className={clsx(styles.modalButton, styles.cancel, { [styles.dark]: theme === 'dark' })}
              >
                取消
              </button>
              <button
                onClick={() => {
                  replaceColor(confirmReplace.oldColor, confirmReplace.newColor);
                  setConfirmReplace(null);
                }}
                className={clsx(styles.modalButton, styles.primary)}
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
