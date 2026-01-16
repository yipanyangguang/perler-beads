import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { CellData } from '@/store/useProjectStore';
import { CanvasRenderer, RendererConfig } from '@/utils/canvasRenderer';
import { getGridCellFromMouseEvent, CanvasConfig } from '@/utils/canvasUtils';

interface CanvasGridRendererProps {
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
  hoveredCell: { x: number; y: number } | null;
  backgroundImageUrl?: string;
  backgroundImageOpacity?: number;
  previewMode?: boolean;
  onCellClick: (x: number, y: number) => void;
  /**
   * Called during dragging to update visual state locally without React render cycle.
   * Return the new color for this cell.
   */
  onCellDrag?: (x: number, y: number) => string | null;
  /**
   * Called when dragging finishes to commit all changes.
   */
  onBatchUpdate?: (updates: {x: number, y: number, color: string | null}[]) => void;
  onCellHover: (x: number, y: number) => void;
  onMouseLeave: () => void;
  onStrokeStart?: () => void;
}

const CanvasGridRenderer = memo(({
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
  tool,
  hoveredCell,
  backgroundImageUrl,
  backgroundImageOpacity,
  previewMode = false,
  onCellClick,
  onCellDrag,
  onBatchUpdate,
  onCellHover,
  onMouseLeave,
  onStrokeStart,
}: CanvasGridRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const pendingUpdatesRef = useRef<Map<string, { x: number; y: number; color: string | null }>>(new Map());

  const cellSize = 20 * zoom;
  const canvasConfig: CanvasConfig = {
    width,
    height,
    cellSize,
    offsetX: 0,
    offsetY: 0,
  };

  // Helper to commit updates
  const commitPendingUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.size > 0 && onBatchUpdate) {
      onBatchUpdate(Array.from(pendingUpdatesRef.current.values()));
      pendingUpdatesRef.current.clear();
    }
  }, [onBatchUpdate]);

  // 初始化 Canvas 和渲染器
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    
    // 设置 Canvas 尺寸 - 不需要额外的 +1，只需要精确的单元格大小
    const totalWidth = width * cellSize;
    const totalHeight = height * cellSize;
    
    // 高 DPI 屏幕支持
    canvas.width = totalWidth * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${totalHeight}px`;

    // 创建渲染器
    const rendererConfig: RendererConfig = {
      ...canvasConfig,
      theme,
      showLabels,
      showCenterMark,
      hGuides,
      vGuides,
      isSymmetric,
      symmetryAxis,
      hoveredCell,
      backgroundImageUrl,
      backgroundImageOpacity,
      previewMode,
    };

    rendererRef.current = new CanvasRenderer(canvas, rendererConfig);
  }, [width, height, cellSize, theme, showLabels, showCenterMark, backgroundImageUrl, backgroundImageOpacity]);

  // 更新渲染器配置和重绘
  useEffect(() => {
    if (!rendererRef.current || !canvasRef.current) return;

    const rendererConfig: RendererConfig = {
      ...canvasConfig,
      theme,
      showLabels,
      showCenterMark,
      hGuides,
      vGuides,
      isSymmetric,
      symmetryAxis,
      hoveredCell,
      backgroundImageUrl,
      backgroundImageOpacity,
      previewMode,
    };

    rendererRef.current.updateConfig(rendererConfig);
    rendererRef.current.render(grid);
  }, [grid, theme, showLabels, showCenterMark, hGuides, vGuides, isSymmetric, symmetryAxis, cellSize, backgroundImageUrl, backgroundImageOpacity, previewMode]);

  // 处理鼠标按下
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cell = getGridCellFromMouseEvent(e, canvasConfig);
      if (!cell) return;

      if (tool === 'brush' || tool === 'eraser') {
        onStrokeStart?.();
        
        // Handle first click immediately + start "batch"
        const isActionTool = tool === 'brush' || tool === 'eraser';
        if (isActionTool && onCellDrag && rendererRef.current) {
           const newColor = onCellDrag(cell.x, cell.y);
           if (newColor !== undefined) {
              // Local draw
              rendererRef.current.drawSingleCell(cell.x, cell.y, newColor);
              pendingUpdatesRef.current.set(`${cell.x}-${cell.y}`, { x: cell.x, y: cell.y, color: newColor });
              
              // Handle symmetry
              if (isSymmetric) {
                 let mirrorX = cell.x;
                 let mirrorY = cell.y;
                 if (symmetryAxis === 'x') {
                    mirrorX = width - 1 - cell.x;
                 } else {
                    mirrorY = height - 1 - cell.y;
                 }

                 if (mirrorX !== cell.x || mirrorY !== cell.y) {
                    rendererRef.current.drawSingleCell(mirrorX, mirrorY, newColor);
                    pendingUpdatesRef.current.set(`${mirrorX}-${mirrorY}`, { x: mirrorX, y: mirrorY, color: newColor });
                 }
              }
           }
        } else {
           // Fallback or Select tool
           onCellClick(cell.x, cell.y);
        }
      } else {
        onCellClick(cell.x, cell.y);
      }

      setIsDragging(true);
      dragStartRef.current = cell;
    },
    [canvasConfig, onCellClick, onStrokeStart, tool, onCellDrag, isSymmetric, symmetryAxis, width, height]
  );

  // 处理鼠标移动
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cell = getGridCellFromMouseEvent(e, canvasConfig);
      if (!cell) {
        onMouseLeave();
        return;
      }

      onCellHover(cell.x, cell.y);

      // 拖拽模式下连续绘制
      if (isDragging && dragStartRef.current && (tool === 'brush' || tool === 'eraser')) {
        // Use local batch update if available
        if (onCellDrag && rendererRef.current) {
          const newColor = onCellDrag(cell.x, cell.y);
          if (newColor !== undefined) {
             // Local draw
             rendererRef.current.drawSingleCell(cell.x, cell.y, newColor);
             pendingUpdatesRef.current.set(`${cell.x}-${cell.y}`, { x: cell.x, y: cell.y, color: newColor });
             
              // Handle symmetry
              if (isSymmetric) {
                 let mirrorX = cell.x;
                 let mirrorY = cell.y;
                 if (symmetryAxis === 'x') {
                    mirrorX = width - 1 - cell.x;
                 } else {
                    mirrorY = height - 1 - cell.y;
                 }

                 if (mirrorX !== cell.x || mirrorY !== cell.y) {
                    rendererRef.current.drawSingleCell(mirrorX, mirrorY, newColor);
                    pendingUpdatesRef.current.set(`${mirrorX}-${mirrorY}`, { x: mirrorX, y: mirrorY, color: newColor });
                 }
              }
          }
        } else {
          // Fallback to legacy
          onCellClick(cell.x, cell.y);
        }
      }
    },
    [canvasConfig, isDragging, tool, onCellClick, onCellHover, onMouseLeave, onCellDrag, isSymmetric, symmetryAxis, width, height]
  );

  // 处理鼠标抬起
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
    commitPendingUpdates();
  }, [commitPendingUpdates]);

  // 处理鼠标离开
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
    commitPendingUpdates();
    onMouseLeave();
  }, [onMouseLeave, commitPendingUpdates]);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'block',
        cursor: tool === 'brush' || tool === 'eraser' ? 'crosshair' : 'pointer',
        backgroundColor: theme === 'dark' ? '#27272a' : '#ffffff',
      }}
    />
  );
});

CanvasGridRenderer.displayName = 'CanvasGridRenderer';

export default CanvasGridRenderer;
