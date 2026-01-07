import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { CellData } from '../store/useProjectStore';
import { CanvasRenderer, RendererConfig } from '../utils/canvasRenderer';
import { getGridCellFromMouseEvent, CanvasConfig } from '../utils/canvasUtils';

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
  onCellClick: (x: number, y: number) => void;
  onCellHover: (x: number, y: number) => void;
  onMouseLeave: () => void;
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
  onCellClick,
  onCellHover,
  onMouseLeave,
}: CanvasGridRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const cellSize = 20 * zoom;
  const canvasConfig: CanvasConfig = {
    width,
    height,
    cellSize,
    offsetX: 0,
    offsetY: 0,
  };

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
    };

    rendererRef.current.updateConfig(rendererConfig);
    rendererRef.current.render(grid);
  }, [grid, theme, showLabels, showCenterMark, hGuides, vGuides, isSymmetric, symmetryAxis, hoveredCell, cellSize, backgroundImageUrl, backgroundImageOpacity]);

  // 处理鼠标按下
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cell = getGridCellFromMouseEvent(e, canvasConfig);
      if (!cell) return;

      setIsDragging(true);
      dragStartRef.current = cell;
      onCellClick(cell.x, cell.y);
    },
    [canvasConfig, onCellClick]
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
        onCellClick(cell.x, cell.y);
      }
    },
    [canvasConfig, isDragging, tool, onCellClick, onCellHover, onMouseLeave]
  );

  // 处理鼠标抬起
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // 处理鼠标离开
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
    onMouseLeave();
  }, [onMouseLeave]);

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
