/**
 * useProjectImport Hook
 * Home 页面特定：处理项目导入相关的逻辑
 */

import { useNavigate } from "react-router-dom";
import { useProjectStore } from "@/store/useProjectStore";
import {
  openFileDialog,
  readFileText,
  handleFileImport,
  readFileFromInput,
  isTauriEnvironment,
} from "@/utils/tauri-compat";

export const useProjectImport = () => {
  const navigate = useNavigate();
  const loadProject = useProjectStore((state) => state.loadProject);
  const addToHistory = useProjectStore((state) => state.addToHistory);

  /**
   * 处理项目导入
   * 支持 Tauri 环境和浏览器环境的文件导入
   */
  const handleImport = async () => {
    try {
      if (isTauriEnvironment()) {
        // Tauri 环境：使用文件对话框选择文件
        const selected = await openFileDialog({
          multiple: false,
          filters: [{
            name: 'JSON Project',
            extensions: ['json']
          }]
        });

        if (selected && typeof selected === 'string') {
          const content = await readFileText(selected);
          const json = JSON.parse(content);
          loadProject(json);
          addToHistory(json.name || 'Untitled', selected);
          navigate("/editor");
        }
      } else {
        // 浏览器环境：使用文件上传处理
        await handleFileImport(async (file) => {
          const content = await readFileFromInput(file);
          const json = JSON.parse(content);
          loadProject(json);
          addToHistory(json.name || 'Untitled', file.name);
          navigate("/editor");
        });
      }
    } catch (error) {
      console.error("Failed to import project", error);
      alert("导入失败");
    }
  };

  return {
    handleImport,
  };
};
