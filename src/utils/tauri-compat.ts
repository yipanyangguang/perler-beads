/**
 * Tauri 兼容层 - 检测环境并提供兼容实现
 */

/**
 * 检测是否在 Tauri 环境中运行
 * 通过检查 __TAURI__ 全局对象或 __TAURI_INTERNALS__ (Tauri v2)
 */
export const isTauriEnvironment = (): boolean => {
  // @ts-ignore
  return typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
};

/**
 * 文件对话框选项
 */
export interface FileDialogOptions {
  multiple?: boolean;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  defaultPath?: string;
  title?: string;
}

/**
 * 保存对话框选项
 */
export interface SaveDialogOptions {
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  defaultPath?: string;
  title?: string;
}

/**
 * 兼容的文件打开对话框
 */
export const openFileDialog = async (
  options: FileDialogOptions
): Promise<string | string[] | null> => {
  if (isTauriEnvironment()) {
    // 使用 Tauri 的对话框
    const { open } = await import('@tauri-apps/plugin-dialog');
    return open(options);
  } else {
    // 浏览器环境 - 使用 HTML file input
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = options.multiple ?? false;
      
      // 设置接受的文件类型
      if (options.filters && options.filters.length > 0) {
        const accept = options.filters
          .map(f => f.extensions.map(ext => `.${ext}`).join(','))
          .join(',');
        input.accept = accept;
      }

      input.onchange = (e: any) => {
        const files = e.target.files;
        if (!files || files.length === 0) {
          resolve(null);
          return;
        }

        if (options.multiple) {
          const paths: string[] = [];
          for (let i = 0; i < files.length; i++) {
            paths.push(files[i].name);
          }
          resolve(paths);
        } else {
          resolve(files[0].name);
        }
      };

      input.click();
    });
  }
};

/**
 * 兼容的文件保存对话框
 */
export const saveFileDialog = async (
  options: SaveDialogOptions
): Promise<string | null> => {
  if (isTauriEnvironment()) {
    // 使用 Tauri 的对话框
    const { save } = await import('@tauri-apps/plugin-dialog');
    return save(options);
  } else {
    // 浏览器环境 - 使用虚拟路径
    // 返回一个虚拟的文件路径（浏览器中无法访问真实文件系统）
    return options.defaultPath || 'downloaded_file';
  }
};

/**
 * 从文件读取文本内容
 */
export const readFileText = async (filePath: string): Promise<string> => {
  if (isTauriEnvironment()) {
    // 使用 Tauri 的文件系统
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    return readTextFile(filePath);
  } else {
    // 浏览器环境 - 提示用户需要上传文件
    throw new Error(
      '浏览器环境下无法直接读取本地文件。请使用"导入"功能选择文件。'
    );
  }
};

/**
 * 将文本内容写入文件
 */
export const writeFileText = async (
  filePath: string,
  content: string
): Promise<void> => {
  if (isTauriEnvironment()) {
    // 使用 Tauri 的文件系统
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    return writeTextFile(filePath, content);
  } else {
    // 浏览器环境 - 使用 Blob 和下载链接
    return downloadTextFile(filePath, content);
  }
};

/**
 * 将二进制内容写入文件
 */
export const writeFileBinary = async (
  filePath: string,
  content: Uint8Array
): Promise<void> => {
  if (isTauriEnvironment()) {
    // 使用 Tauri 的文件系统
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    return writeFile(filePath, content);
  } else {
    // 浏览器环境 - 使用 Blob 和下载链接
    const blob = new Blob([content]);
    downloadBlob(filePath, blob);
  }
};

/**
 * 读取文件内容（用于浏览器上传）
 */
export const readFileFromInput = async (
  file: File
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

/**
 * 读取图片文件为 Data URL
 */
export const readImageFromInput = async (
  file: File
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error('Failed to read image'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
};

/**
 * 辅助函数 - 浏览器中下载文本文件
 */
const downloadTextFile = (fileName: string, content: string): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  downloadBlob(fileName, blob);
};

/**
 * 辅助函数 - 浏览器中下载文件
 */
const downloadBlob = (fileName: string, blob: Blob): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * 处理文件导入 - 兼容浏览器上传
 */
export const handleFileImport = async (
  onFileSelected: (file: File) => Promise<void>
): Promise<void> => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = async (e: any) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await onFileSelected(files[0]);
    }
  };

  input.click();
};

/**
 * 环境信息
 */
export const getEnvironmentInfo = () => ({
  isTauri: isTauriEnvironment(),
  platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
});
