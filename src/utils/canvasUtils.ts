/**
 * Canvas 坐标映射和计算工具
 */

export interface CanvasCoordinates {
  canvasX: number;
  canvasY: number;
}

export interface GridCell {
  x: number;
  y: number;
}

export interface CanvasConfig {
  width: number;
  height: number;
  cellSize: number;
  offsetX: number;
  offsetY: number;
}

/**
 * 将鼠标坐标转换为单元格坐标
 */
export const getGridCellFromMouseEvent = (
  e: React.MouseEvent<HTMLCanvasElement>,
  config: CanvasConfig
): GridCell | null => {
  const canvas = e.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  return getGridCellFromCanvasCoords(mouseX, mouseY, config);
};

/**
 * 根据 Canvas 坐标获取单元格坐标
 */
export const getGridCellFromCanvasCoords = (
  canvasX: number,
  canvasY: number,
  config: CanvasConfig
): GridCell | null => {
  const { cellSize, offsetX, offsetY, width, height } = config;

  // 相对于网格起点的坐标
  const relX = canvasX - offsetX;
  const relY = canvasY - offsetY;

  // 如果在网格外，返回 null
  if (relX < 0 || relY < 0) return null;

  const gridX = Math.floor(relX / cellSize);
  const gridY = Math.floor(relY / cellSize);

  // 检查是否超出网格边界
  if (gridX >= width || gridY >= height) return null;

  return { x: gridX, y: gridY };
};

/**
 * 将单元格坐标转换为 Canvas 坐标
 */
export const getCanvasFromGridCell = (
  cell: GridCell,
  config: CanvasConfig
): CanvasCoordinates => {
  const { cellSize, offsetX, offsetY } = config;
  return {
    canvasX: offsetX + cell.x * cellSize,
    canvasY: offsetY + cell.y * cellSize,
  };
};

/**
 * 获取单元格的完整矩形区域（Canvas 坐标）
 */
export const getCellRect = (
  cell: GridCell,
  config: CanvasConfig
): { x: number; y: number; width: number; height: number } => {
  const { canvasX, canvasY } = getCanvasFromGridCell(cell, config);
  return {
    x: canvasX,
    y: canvasY,
    width: config.cellSize,
    height: config.cellSize,
  };
};

/**
 * 批量获取行/列范围内的单元格
 */
export const getCellsInRange = (
  startCell: GridCell,
  endCell: GridCell,
  gridWidth: number,
  gridHeight: number
): GridCell[] => {
  const minX = Math.max(0, Math.min(startCell.x, endCell.x));
  const maxX = Math.min(gridWidth - 1, Math.max(startCell.x, endCell.x));
  const minY = Math.max(0, Math.min(startCell.y, endCell.y));
  const maxY = Math.min(gridHeight - 1, Math.max(startCell.y, endCell.y));

  const cells: GridCell[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      cells.push({ x, y });
    }
  }
  return cells;
};

/**
 * 计算网格的总体尺寸
 */
export const getGridCanvasSize = (config: CanvasConfig): { width: number; height: number } => {
  return {
    width: config.offsetX + config.width * config.cellSize + 1,
    height: config.offsetY + config.height * config.cellSize + 1,
  };
};
