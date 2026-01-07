/**
 * Canvas 渲染引擎 - 处理网格、颜色、辅助线等绘制
 */

import { CellData } from '../store/useProjectStore';
import { CanvasConfig, getCellRect } from '../utils/canvasUtils';
import { getColorId, getContrastColor } from '../utils/colorUtils';

export interface RendererConfig extends CanvasConfig {
  theme: 'light' | 'dark';
  showLabels: boolean;
  showCenterMark: boolean;
  hGuides: Set<number>;
  vGuides: Set<number>;
  isSymmetric: boolean;
  symmetryAxis: 'x' | 'y';
  hoveredCell: { x: number; y: number } | null;
}

const COLORS = {
  light: {
    background: '#ffffff',
    gridLine: '#e4e4e7',
    gridLineDark: '#d4d4d8',
    cellBg: '#ffffff',
    cellHover: '#f4f4f5',
    text: '#3f3f46',
    guideLine: '#60a5fa',
    guideLineAlt: '#93c5fd',
    centerMark: '#d4d4d8',
    symmetryLine: '#c084fc',
  },
  dark: {
    background: '#18181b',
    gridLine: '#3f3f46',
    gridLineDark: '#27272a',
    cellBg: '#27272a',
    cellHover: '#3f3f46',
    text: '#a1a1a6',
    guideLine: '#3b82f6',
    guideLineAlt: '#1e40af',
    centerMark: '#52525b',
    symmetryLine: '#a855f7',
  },
};

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private config: RendererConfig;

  constructor(canvas: HTMLCanvasElement, config: RendererConfig) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.config = config;
    this.setupHighDPI();
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<RendererConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * 处理高 DPI 屏幕
   */
  private setupHighDPI() {
    // 注意：Canvas 的宽高已经由调用者在外部设置好了（在组件中）
    // 这里不需要重新设置，只需要在必要时使用 devicePixelRatio
    const dpr = window.devicePixelRatio || 1;
    if (dpr !== 1) {
      this.ctx.scale(dpr, dpr);
    }
  }

  /**
   * 渲染整个网格
   */
  render(grid: CellData[][]) {
    const colors = COLORS[this.config.theme];
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    // 绘制背景
    this.drawBackground(colors);

    // 绘制网格线
    this.drawGridLines(colors);

    // 绘制颜色单元格
    this.drawCells(grid, colors);

    // 绘制辅助线
    this.drawGuides(colors);

    // 绘制中心点
    if (this.config.showCenterMark) {
      this.drawCenterMark(colors);
    }

    // 绘制对称线
    if (this.config.isSymmetric) {
      this.drawSymmetryLine(colors);
    }

    // 绘制悬停效果
    if (this.config.hoveredCell) {
      this.drawHoverEffect(this.config.hoveredCell, colors);
    }
  }

  /**
   * 绘制背景
   */
  private drawBackground(colors: typeof COLORS['light']) {
    this.ctx.fillStyle = colors.background;
    this.ctx.fillRect(0, 0, this.ctx.canvas.offsetWidth, this.ctx.canvas.offsetHeight);
  }

  /**
   * 绘制网格线
   */
  private drawGridLines(colors: typeof COLORS['light']) {
    const { width, height, cellSize, offsetX, offsetY } = this.config;
    const endX = offsetX + width * cellSize;
    const endY = offsetY + height * cellSize;

    this.ctx.strokeStyle = colors.gridLine;
    this.ctx.lineWidth = 1;

    // 竖线
    for (let x = 0; x <= width; x++) {
      const canvasX = offsetX + x * cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(canvasX, offsetY);
      this.ctx.lineTo(canvasX, endY);
      this.ctx.stroke();
    }

    // 横线
    for (let y = 0; y <= height; y++) {
      const canvasY = offsetY + y * cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(offsetX, canvasY);
      this.ctx.lineTo(endX, canvasY);
      this.ctx.stroke();
    }
  }

  /**
   * 绘制颜色单元格
   */
  private drawCells(grid: CellData[][], colors: typeof COLORS['light']) {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const cell = grid[y][x];
        if (cell.color) {
          const rect = getCellRect({ x, y }, this.config);
          const isFrosted = cell.color === '#FDFBFF';

          if (isFrosted) {
            // 磨砂效果：绘制棋盘图案
            this.drawFrostedCell(rect);
          } else {
            // 绘制颜色背景
            this.ctx.fillStyle = cell.color;
            this.ctx.fillRect(rect.x + 1, rect.y + 1, rect.width - 1, rect.height - 1);
          }

          // 绘制颜色标签
          if (this.config.showLabels && this.config.cellSize >= 16) {
            this.drawCellLabel(cell, rect, colors);
          }
        }
      }
    }
  }

  /**
   * 绘制磨砂珠子单元格
   */
  private drawFrostedCell(rect: { x: number; y: number; width: number; height: number }) {
    const { x, y, width, height } = rect;
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 8;
    patternCanvas.height = 8;
    const patternCtx = patternCanvas.getContext('2d');
    if (patternCtx) {
      patternCtx.fillStyle = '#e0e0e0';
      patternCtx.fillRect(0, 0, 8, 8);
      patternCtx.fillStyle = '#ffffff';
      patternCtx.fillRect(0, 0, 4, 4);
      patternCtx.fillRect(4, 4, 4, 4);
    }

    const pattern = this.ctx.createPattern(patternCanvas, 'repeat');
    if (pattern) {
      this.ctx.fillStyle = pattern;
      this.ctx.fillRect(x + 1, y + 1, width - 1, height - 1);
    }
  }

  /**
   * 绘制单元格标签（颜色 ID）
   */
  private drawCellLabel(
    cell: CellData,
    rect: { x: number; y: number; width: number; height: number },
    _colors: typeof COLORS['light']
  ) {
    const colorId = getColorId(cell.color!);
    if (!colorId) return;

    const { x, y, width, height } = rect;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    this.ctx.font = 'bold 10px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = getContrastColor(cell.color!);
    this.ctx.fillText(colorId, centerX, centerY);
  }

  /**
   * 绘制辅助线
   */
  private drawGuides(colors: typeof COLORS['light']) {
    const { hGuides, vGuides, offsetX, offsetY, cellSize, height, width } = this.config;

    this.ctx.strokeStyle = colors.guideLine;
    this.ctx.lineWidth = 2;

    // 水平辅助线
    hGuides.forEach((y) => {
      const canvasY = offsetY + (y + 1) * cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(offsetX, canvasY);
      this.ctx.lineTo(offsetX + width * cellSize, canvasY);
      this.ctx.stroke();
    });

    // 竖直辅助线
    vGuides.forEach((x) => {
      const canvasX = offsetX + (x + 1) * cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(canvasX, offsetY);
      this.ctx.lineTo(canvasX, offsetY + height * cellSize);
      this.ctx.stroke();
    });
  }

  /**
   * 绘制中心点标记
   */
  private drawCenterMark(colors: typeof COLORS['light']) {
    const { width, height, cellSize, offsetX, offsetY } = this.config;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    // 计算中心点位置
    let markX = offsetX;
    let markY = offsetY;

    if (width % 2 === 0) {
      markX += (centerX - 0.5) * cellSize;
    } else {
      markX += centerX * cellSize;
    }

    if (height % 2 === 0) {
      markY += (centerY - 0.5) * cellSize;
    } else {
      markY += centerY * cellSize;
    }

    this.ctx.strokeStyle = colors.centerMark;
    this.ctx.lineWidth = 1;
    const size = Math.min(this.config.cellSize * 0.3, 8);

    // 绘制十字
    this.ctx.beginPath();
    this.ctx.moveTo(markX - size, markY);
    this.ctx.lineTo(markX + size, markY);
    this.ctx.moveTo(markX, markY - size);
    this.ctx.lineTo(markX, markY + size);
    this.ctx.stroke();
  }

  /**
   * 绘制对称线
   */
  private drawSymmetryLine(colors: typeof COLORS['light']) {
    const { width, height, cellSize, offsetX, offsetY, symmetryAxis } = this.config;

    this.ctx.strokeStyle = colors.symmetryLine;
    this.ctx.lineWidth = 2;

    if (symmetryAxis === 'x') {
      // 左右对称线
      if (width % 2 === 0) {
        const canvasX = offsetX + (width / 2) * cellSize;
        this.ctx.beginPath();
        this.ctx.moveTo(canvasX, offsetY);
        this.ctx.lineTo(canvasX, offsetY + height * cellSize);
        this.ctx.stroke();
      }
    } else {
      // 上下对称线
      if (height % 2 === 0) {
        const canvasY = offsetY + (height / 2) * cellSize;
        this.ctx.beginPath();
        this.ctx.moveTo(offsetX, canvasY);
        this.ctx.lineTo(offsetX + width * cellSize, canvasY);
        this.ctx.stroke();
      }
    }
  }

  /**
   * 绘制悬停效果
   */
  private drawHoverEffect(
    hoveredCell: { x: number; y: number },
    colors: typeof COLORS['light']
  ) {
    const rect = getCellRect(hoveredCell, this.config);
    
    // 只在边缘画一个框，不填充单元格内部
    this.ctx.strokeStyle = colors.guideLine;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(rect.x + 1, rect.y + 1, rect.width - 2, rect.height - 2);

    // 绘制坐标提示
    this.ctx.font = '8px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = colors.text;
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    this.ctx.fillText(`${hoveredCell.x + 1},${hoveredCell.y + 1}`, centerX, centerY);
  }
}
