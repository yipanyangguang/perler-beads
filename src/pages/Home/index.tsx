/**
 * Home 页面 - 项目首页
 * 用户可以在此页面创建新项目、导入已有项目或打开历史项目
 */

import { useTheme } from "@/hooks/useTheme";

// 页面特定的 Hooks
import { useProjectCreation } from "./hooks/useProjectCreation";
import { useProjectImport } from "./hooks/useProjectImport";
import { useProjectHistory } from "./hooks/useProjectHistory";

// 子组件
import WelcomeHeader from "@/components/WelcomeHeader";
import ActionButtons from "@/components/ActionButtons";
import CreateProjectModal from "@/components/CreateProjectModal";
import HistoryDrawer from "@/components/HistoryDrawer";

// 样式
import styles from "./index.module.scss";

// SVG 图标
import historyIcon from "@/assets/icons/history.svg";
import sunIcon from "@/assets/icons/sun.svg";
import moonIcon from "@/assets/icons/moon.svg";
import { Theme } from "@/types/theme";

/**
 * Home 页面组件
 * 整合了创建项目、导入项目和历史记录等功能
 */
const Home = () => {
  // 主题 Hook
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === Theme.DARK;

  // 项目创建 Hook
  const {
    width,
    setWidth,
    height,
    setHeight,
    name,
    setName,
    isModalOpen,
    openModal,
    closeModal,
    handleCreate,
  } = useProjectCreation();

  // 项目导入 Hook
  const { handleImport } = useProjectImport();

  // 历史记录 Hook
  const {
    isHistoryOpen,
    history,
    openHistory,
    closeHistory,
    handleHistoryClick,
    handleRemoveHistory,
  } = useProjectHistory();

  return (
    <div className={`${styles.container} ${isDark ? styles.dark : ""}`}>
      {/* 顶部操作栏 */}
      <div className={styles.header}>
        {/* 历史记录按钮 */}
        <button
          onClick={openHistory}
          title="打开历史记录"
          aria-label="历史记录"
        >
          <img src={historyIcon} alt="历史记录" style={{ width: '24px', height: '24px' }} />
        </button>

        {/* 主题切换按钮 */}
        <button
          onClick={toggleTheme}
          title="切换主题"
          aria-label="主题切换"
        >
          {isDark ? (
            <img src={sunIcon} alt="亮色模式" style={{ width: '24px', height: '24px' }} />
          ) : (
            <img src={moonIcon} alt="暗色模式" style={{ width: '24px', height: '24px' }} />
          )}
        </button>
      </div>

      {/* 欢迎区域 */}
      <WelcomeHeader isDark={isDark} />

      {/* 操作按钮区域 */}
      <ActionButtons
        onCreateClick={openModal}
        onImportClick={handleImport}
      />

      {/* 创建项目模态框 */}
      <CreateProjectModal
        isOpen={isModalOpen}
        name={name}
        width={width}
        height={height}
        onNameChange={setName}
        onWidthChange={setWidth}
        onHeightChange={setHeight}
        onCreateClick={handleCreate}
        onClose={closeModal}
      />

      {/* 历史记录抽屉 */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        history={history}
        onClose={closeHistory}
        onItemClick={handleHistoryClick}
        onDeleteItem={handleRemoveHistory}
      />
    </div>
  );
};

export default Home;
