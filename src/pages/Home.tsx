import { Plus, Upload, X, Moon, Sun, History, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../store/useProjectStore";
import { useTheme } from "../hooks/useTheme";
import logo from "../assets/logo.svg";
import {
  openFileDialog,
  readFileText,
  handleFileImport,
  readFileFromInput,
  isTauriEnvironment,
} from "../utils/tauri-compat";
import clsx from "clsx";

export default function Home() {
  const navigate = useNavigate();
  const createProject = useProjectStore((state) => state.createProject);
  const loadProject = useProjectStore((state) => state.loadProject);
  const addToHistory = useProjectStore((state) => state.addToHistory);
  const removeFromHistory = useProjectStore((state) => state.removeFromHistory);
  const history = useProjectStore((state) => state.history);
  const { theme, toggleTheme } = useTheme();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [width, setWidth] = useState(50);
  const [height, setHeight] = useState(50);
  const [name, setName] = useState("我的拼豆项目");

  const handleCreate = () => {
    createProject(width, height, name);
    navigate("/editor");
  };

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

  const handleHistoryClick = async (path: string) => {
    try {
      if (!isTauriEnvironment()) {
        alert("浏览器环境下无法访问历史文件。请重新导入。");
        return;
      }

      const content = await readFileText(path);
      const json = JSON.parse(content);
      loadProject(json);
      addToHistory(json.name || 'Untitled', path); // Update last opened
      navigate("/editor");
    } catch (error) {
      console.error("Failed to load project from history", error);
      alert("无法加载项目，文件可能已被移动或删除");
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center h-screen w-screen overflow-hidden gap-8 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white p-4 transition-colors duration-300">
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setIsHistoryOpen(true)}
          className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
          title="历史记录"
        >
          <History size={24} />
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
          title="切换主题"
        >
          {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </div>

      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <img src={logo} alt="Logo" className="w-12 h-12" />
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          拼豆助手
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">轻松设计你的像素艺术</p>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-xl transition-colors duration-300">
        <div className="p-6 pb-0">
          <div className="flex flex-col">
            <p className="text-lg font-bold">开始创作</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">选择一种方式开始你的设计</p>
          </div>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            <Plus size={20} />
            新建项目
          </button>
          
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-200 dark:border-zinc-700"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-zinc-800 px-2 text-zinc-500">或者</span>
            </div>
          </div>

          <button 
            onClick={handleImport}
            className="w-full flex items-center justify-center gap-2 border-2 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 text-zinc-700 dark:text-white font-semibold py-3 px-4 rounded-lg cursor-pointer transition-all"
          >
            <Upload size={20} />
            导入项目
          </button>
        </div>
      </div>

      {/* History Drawer */}
      <div className={clsx(
        "fixed inset-y-0 right-0 w-80 bg-white dark:bg-zinc-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 border-l border-zinc-200 dark:border-zinc-800",
        isHistoryOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <History size={20} />
            历史记录
          </h2>
          <button onClick={() => setIsHistoryOpen(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-60px)] p-4 space-y-2">
          {history.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">
              暂无历史记录
            </div>
          ) : (
            history.map((item) => (
              <div key={item.path} className="group relative bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                <button 
                  onClick={() => handleHistoryClick(item.path)}
                  className="w-full text-left"
                >
                  <div className="font-medium truncate pr-6">{item.name}</div>
                  <div className="text-xs text-zinc-500 truncate mt-1 font-mono" title={item.path}>
                    {item.path}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    {new Date(item.lastOpened).toLocaleString()}
                  </div>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromHistory(item.path);
                  }}
                  className="absolute top-3 right-3 p-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="删除记录"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">新建项目</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">项目名称</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="给你的作品起个名字"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">宽度 (格)</label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">高度 (格)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleCreate}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
