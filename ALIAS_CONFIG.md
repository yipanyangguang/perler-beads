/**
 * 路径别名配置文档
 * 
 * 本项目已配置 @ 路径别名，用于简化导入语句
 * @ 指向 src/ 目录
 */

/**
 * ❌ 旧方式（相对路径）
 * 
 * import { useTheme } from "../../../hooks/useTheme";
 * import WelcomeHeader from "../../components/WelcomeHeader";
 * import { useProjectStore } from "../store/useProjectStore";
 */

/**
 * ✅ 现在方式（使用 @ 别名）
 * 
 * import { useTheme } from "@/hooks/useTheme";
 * import WelcomeHeader from "@/components/WelcomeHeader";
 * import { useProjectStore } from "@/store/useProjectStore";
 */

/**
 * 配置文件说明
 */

/**
 * 1. TypeScript 配置 (tsconfig.json)
 * 
 * compilerOptions: {
 *   baseUrl: ".",
 *   paths: {
 *     "@/*": ["src/*"]
 *   }
 * }
 * 
 * 作用：让 TypeScript 识别 @ 别名，提供智能提示和类型检查
 */

/**
 * 2. Vite 配置 (vite.config.ts)
 * 
 * resolve: {
 *   alias: {
 *     "@": path.resolve(__dirname, "./src"),
 *   },
 * }
 * 
 * 作用：让 Vite 在构建时正确解析 @ 别名
 */

/**
 * 别名规则
 * 
 * @/pages          → src/pages
 * @/components     → src/components
 * @/hooks          → src/hooks
 * @/store          → src/store
 * @/utils          → src/utils
 * @/types          → src/types
 * @/assets         → src/assets
 * @/App.tsx        → src/App.tsx
 * @/color.ts       → src/color.ts
 */

/**
 * 使用示例
 */

// 页面导入
import Home from '@/pages/Home';
import Editor from '@/pages/Editor';

// 组件导入
import WelcomeHeader from '@/components/WelcomeHeader';
import ActionButtons from '@/components/ActionButtons';

// Hook 导入
import { useTheme } from '@/hooks/useTheme';
import { useProjectCreation } from '@/pages/Home/hooks/useProjectCreation';

// 状态和工具导入
import { useProjectStore } from '@/store/useProjectStore';
import { getColorId } from '@/utils/colorUtils';

// 类型导入
import { Theme } from '@/types/theme';

// 资源导入
import logo from '@/assets/logo.svg';
import colorData from '@/color';

/**
 * 优势
 * 
 * 1. 更清晰
 *    - 不需要数相对路径的 ../../../
 *    - 代码更易读
 * 
 * 2. 更易维护
 *    - 移动文件时不需要修改导入路径
 *    - 避免相对路径错误
 * 
 * 3. 更易重构
 *    - 快速定位导入来源
 *    - IDE 智能跳转更准确
 * 
 * 4. 团队协作更友好
 *    - 统一的导入风格
 *    - 减少代码审查中的路径问题
 */

export {};
