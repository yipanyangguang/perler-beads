import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { CellData } from '@/store/useProjectStore';

interface MarkingCanvasRendererProps {
  grid: CellData[][];
  width: number;
  height: number;
  zoom: number;
  theme: 'light' | 'dark';
  showLabels: boolean;
  showCenterMark: boolean;
  centerX: number;
  centerY: number;
  hGuides: Set<number>;
  vGuides: Set<number>;
  markedCells: Record<string, boolean>;
  hiddenColors: Set<string>;
  hoveredCell: { x: number; y: number } | null;
  onCellClick: (x: number, y: number) => void;
  onCellHover: (x: number, y: number) => void;
  onMouseLeave: () => void;
}

export const MarkingCanvasRenderer = memo(function MarkingCanvasRenderer({
  grid,
  width,
  height,
  zoom,
  theme,
  showCenterMark,
  centerX,
  centerY,
  hGuides,
  vGuides,
  markedCells,
  hiddenColors,
  hoveredCell,
  onCellClick,
  onCellHover,
  onMouseLeave,
}: MarkingCanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const cellSize = 20 * zoom;
  const canvasWidth = width * cellSize;
  const canvasHeight = height * cellSize;

  // 初始化 Canvas（只在尺寸改变时）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    ctx.scale(dpr, dpr);
    contextRef.current = ctx;
  }, [canvasWidth, canvasHeight]);

  // 绘制所有内容（包括网格线、单元格、标记等）
  useEffect(() => {
    const ctx = contextRef.current;
    if (!ctx) return;

    // 绘制背景
    const bgColor = theme === 'dark' ? '#18181b' : '#ffffff';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 绘制网格线
    const gridColor = theme === 'dark' ? '#3f3f46' : '#e4e4e7';
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x++) {
      const canvasX = x * cellSize;
      ctx.beginPath();
      ctx.moveTo(canvasX, 0);
      ctx.lineTo(canvasX, canvasHeight);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y++) {
      const canvasY = y * cellSize;
      ctx.beginPath();
      ctx.moveTo(0, canvasY);
      ctx.lineTo(canvasWidth, canvasY);
      ctx.stroke();
    }

    // 绘制单元格颜色
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        const isHidden = cell.color ? hiddenColors.has(cell.color) : false;
        if (isHidden) return;

        const canvasX = x * cellSize;
        const canvasY = y * cellSize;

        if (cell.color) {
          ctx.fillStyle = cell.color;
          ctx.fillRect(canvasX + 1, canvasY + 1, cellSize - 2, cellSize - 2);

          // 绘制磨砂珠子图案
          if (cell.color === '#FDFBFF') {
            ctx.strokeStyle = theme === 'dark' ? '#3f3f46' : '#e4e4e7';
            ctx.lineWidth = 1;
            for (let i = 0; i < cellSize; i += 2) {
              ctx.beginPath();
              ctx.moveTo(canvasX + i, canvasY);
              ctx.lineTo(canvasX, canvasY + i);
              ctx.stroke();
            }
          }
        }
      });
    });

    // 绘制标记覆盖层
    if (Object.keys(markedCells).length > 0) {
      const markColor = theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)';
      const checkColor = theme === 'dark' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(34, 197, 94, 0.8)';

      ctx.fillStyle = markColor;

      Object.keys(markedCells).forEach(cellId => {
        const [x, y] = cellId.split('-').map(Number);
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const canvasX = x * cellSize;
          const canvasY = y * cellSize;

          ctx.fillRect(canvasX, canvasY, cellSize, cellSize);

          ctx.strokeStyle = checkColor;
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(canvasX + cellSize * 0.25, canvasY + cellSize * 0.5);
          ctx.lineTo(canvasX + cellSize * 0.4, canvasY + cellSize * 0.7);
          ctx.lineTo(canvasX + cellSize * 0.75, canvasY + cellSize * 0.3);
          ctx.stroke();
        }
      });
    }

    // 绘制辅助线
    const guideColor = theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)';
    ctx.strokeStyle = guideColor;
    ctx.lineWidth = 2;

    hGuides.forEach(y => {
      const canvasY = (y + 1) * cellSize;
      ctx.beginPath();
      ctx.moveTo(0, canvasY);
      ctx.lineTo(canvasWidth, canvasY);
      ctx.stroke();
    });

    vGuides.forEach(x => {
      const canvasX = (x + 1) * cellSize;
      ctx.beginPath();
      ctx.moveTo(canvasX, 0);
      ctx.lineTo(canvasX, canvasHeight);
      ctx.stroke();
    });

    // 绘制中心点
    if (showCenterMark && centerX >= 0 && centerY >= 0) {
      const centerMarkColor = theme === 'dark' ? 'rgba(161, 161, 170, 0.3)' : 'rgba(200, 200, 200, 0.3)';
      ctx.strokeStyle = centerMarkColor;
      ctx.lineWidth = 1;
      const centerCanvasX = centerX * cellSize + cellSize / 2;
      const centerCanvasY = centerY * cellSize + cellSize / 2;
      const markSize = cellSize * 0.3;

      ctx.beginPath();
      ctx.moveTo(centerCanvasX - markSize, centerCanvasY);
      ctx.lineTo(centerCanvasX + markSize, centerCanvasY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerCanvasX, centerCanvasY - markSize);
      ctx.lineTo(centerCanvasX, centerCanvasY + markSize);
      ctx.stroke();
    }

    // 绘制悬停效果
    if (hoveredCell && !hiddenColors.has(grid[hoveredCell.y]?.[hoveredCell.x]?.color || '')) {
      const hoverColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
      ctx.fillStyle = hoverColor;
      const canvasX = hoveredCell.x * cellSize;
      const canvasY = hoveredCell.y * cellSize;
      ctx.fillRect(canvasX, canvasY, cellSize, cellSize);
    }
  }, [grid, theme, cellSize, canvasWidth, canvasHeight, width, height, hiddenColors, markedCells, hGuides, vGuides, showCenterMark, centerX, centerY, hoveredCell]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const x = Math.floor(clientX / cellSize);
    const y = Math.floor(clientY / cellSize);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      setIsDragging(true);
      dragStartRef.current = { x, y };
      onCellClick(x, y);
    }
  }, [width, height, cellSize, onCellClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const x = Math.floor(clientX / cellSize);
    const y = Math.floor(clientY / cellSize);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      onCellHover(x, y);

      if (isDragging && dragStartRef.current) {
        onCellClick(x, y);
      }
    }
  }, [width, height, cellSize, isDragging, onCellClick, onCellHover]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const handleMouseLeaveCanvas = useCallback(() => {
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
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeaveCanvas}
      className="bg-white dark:bg-zinc-950 cursor-pointer max-w-full"
      style={{ touchAction: 'none', display: 'block' }}
    />
  );
});

MarkingCanvasRenderer.displayName = 'MarkingCanvasRenderer';
