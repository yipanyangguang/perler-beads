/**
 * Home 页面 - 项目首页
 * 用户可以在此页面创建新项目、导入已有项目或打开历史项目
 */

import { FC } from "react";
import { useTheme } from "../hooks/useTheme";

// 自定义 Hooks
import { useProjectCreation } from "../hooks/useProjectCreation";
import { useProjectImport } from "../hooks/useProjectImport";
import { useProjectHistory } from "../hooks/useProjectHistory";

// 子组件
import WelcomeHeader from "../components/WelcomeHeader";
import ActionButtons from "../components/ActionButtons";
import CreateProjectModal from "../components/CreateProjectModal";
import HistoryDrawer from "../components/HistoryDrawer";

// 样式
import styles from "./Home.module.scss";

/**
 * Home 页面组件
 * 整合了创建项目、导入项目和历史记录等功能
 */
const Home: FC = () => {
  // 主题 Hook
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

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
          {/* 历史记录图标 */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* 主题切换按钮 */}
        <button
          onClick={toggleTheme}
          title="切换主题"
          aria-label="主题切换"
        >
          {/* 主题图标 */}
          {isDark ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 1.78a1 1 0 011.39 0l.707.707a1 1 0 01-1.39 1.39L15.22 3.78a1 1 0 010-1.39zm2.122 2.122a1 1 0 011.39 0l.707.707a1 1 0 01-1.39 1.39l-.707-.707a1 1 0 010-1.39zm2.122 2.122a1 1 0 011.39 0l.707.707a1 1 0 01-1.39 1.39l-.707-.707a1 1 0 010-1.39zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm1.78 2.22a1 1 0 01-1.39 0l-.707-.707a1 1 0 011.39-1.39l.707.707a1 1 0 010 1.39zm-2.122 2.122a1 1 0 01-1.39 0l-.707-.707a1 1 0 011.39-1.39l.707.707a1 1 0 010 1.39zm-2.122 2.122a1 1 0 01-1.39 0l-.707-.707a1 1 0 011.39-1.39l.707.707a1 1 0 010 1.39zM13 17a1 1 0 100 2h1a1 1 0 100-2h-1zm-2.78-1.78a1 1 0 01-1.39 0l-.707-.707a1 1 0 011.39-1.39l.707.707a1 1 0 010 1.39zM9 13a1 1 0 100 2H8a1 1 0 100-2h1zm-.22-7.22a1 1 0 011.39 0l.707.707a1 1 0 01-1.39 1.39L8.78 5.78a1 1 0 010-1.39zM5 3a1 1 0 000 2h1a1 1 0 000-2H5z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
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
