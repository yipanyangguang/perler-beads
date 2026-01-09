/**
 * 主题相关的类型定义
 */

/**
 * 应用主题枚举
 * 用于统一管理应用的主题类型
 */
export enum Theme {
  DARK = 'dark',
  LIGHT = 'light',
}

/**
 * 主题类型（用于泛型约束）
 */
export type ThemeType = Theme | keyof typeof Theme;
