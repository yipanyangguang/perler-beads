/**
 * useProjectHistory Hook
 * Home 页面特定：处理项目历史记录相关的逻辑
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "@/store/useProjectStore";
import { readFileText, isTauriEnvironment } from "@/utils/tauri-compat";

export const useProjectHistory = () => {
  const navigate = useNavigate();
  const loadProject = useProjectStore((state) => state.loadProject);
  const addToHistory = useProjectStore((state) => state.addToHistory);
  const removeFromHistory = useProjectStore((state) => state.removeFromHistory);
  const history = useProjectStore((state) => state.history);

  // 历史记录抽屉显示状态
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  /**
   * 打开历史记录抽屉
   */
  const openHistory = () => {
    setIsHistoryOpen(true);
  };

  /**
   * 关闭历史记录抽屉
   */
  const closeHistory = () => {
    setIsHistoryOpen(false);
  };

  /**
   * 处理历史记录中的项目点击
   * 加载选中的历史项目
   */
  const handleHistoryClick = async (path: string) => {
    try {
      if (!isTauriEnvironment()) {
        alert("浏览器环境下无法访问历史文件。请重新导入。");
        return;
      }

      const content = await readFileText(path);
      const json = JSON.parse(content);
      loadProject(json);
      addToHistory(json.name || 'Untitled', path);
      navigate("/editor");
    } catch (error) {
      console.error("Failed to load project from history", error);
      alert("无法加载项目，文件可能已被移动或删除");
    }
  };

  /**
   * 处理历史记录删除
   */
  const handleRemoveHistory = (path: string) => {
    removeFromHistory(path);
  };

  return {
    // 状态
    isHistoryOpen,
    history,
    // 操作函数
    openHistory,
    closeHistory,
    handleHistoryClick,
    handleRemoveHistory,
  };
};
