# Tauri 兼容层文档

## 概述

本项目已实现**完整的 Tauri 兼容层**，使应用既可在打包的 Tauri 桌面应用中运行，也可作为网页应用在浏览器中访问。

## 项目中的 Tauri 功能

项目使用 Tauri 的以下功能：

| 功能 | 使用位置 | Tauri 插件 | 用途 |
|------|---------|----------|------|
| **文件打开对话框** | `Home.tsx` | `@tauri-apps/plugin-dialog` | 用户选择要导入的 JSON 项目文件 |
| **文件读取** | `Home.tsx` | `@tauri-apps/plugin-fs` | 读取选中的项目文件内容 |
| **历史文件访问** | `Home.tsx` | `@tauri-apps/plugin-fs` | 读取存储的历史项目文件 |
| **文件保存对话框** | `Editor.tsx` | `@tauri-apps/plugin-dialog` | 用户选择保存项目文件的位置 |
| **文本文件写入** | `Editor.tsx` | `@tauri-apps/plugin-fs` | 保存项目 JSON 文件 |
| **二进制文件写入** | `Editor.tsx` | `@tauri-apps/plugin-fs` | 导出 PNG 图片文件 |

## 兼容层实现 (`src/utils/tauri-compat.ts`)

### 环境检测

```typescript
isTauriEnvironment(): boolean
```

通过检测 `window.__TAURI__` 对象来判断是否在 Tauri 环境中运行。

### 核心 API

#### 1. 文件打开对话框
```typescript
openFileDialog(options): Promise<string | string[] | null>
```

- **Tauri 环境**: 使用 `@tauri-apps/plugin-dialog` 的 `open()` 函数
- **浏览器环境**: 创建 `<input type="file">` 元素

#### 2. 文件保存对话框
```typescript
saveFileDialog(options): Promise<string | null>
```

- **Tauri 环境**: 使用 `@tauri-apps/plugin-dialog` 的 `save()` 函数
- **浏览器环境**: 返回虚拟文件路径（后续配合 Blob 下载）

#### 3. 读取文本文件
```typescript
readFileText(filePath): Promise<string>
```

- **Tauri 环境**: 使用 `@tauri-apps/plugin-fs` 的 `readTextFile()`
- **浏览器环境**: 抛出错误提示用户使用上传功能（因安全限制无法读取本地文件）

#### 4. 写入文本文件
```typescript
writeFileText(filePath, content): Promise<void>
```

- **Tauri 环境**: 使用 `@tauri-apps/plugin-fs` 的 `writeTextFile()`
- **浏览器环境**: 使用 Blob + 下载链接实现文件下载

#### 5. 写入二进制文件
```typescript
writeFileBinary(filePath, content): Promise<void>
```

- **Tauri 环境**: 使用 `@tauri-apps/plugin-fs` 的 `writeFile()`
- **浏览器环境**: 使用 Blob + 下载链接实现文件下载

#### 6. 文件上传处理
```typescript
handleFileImport(onFileSelected): Promise<void>
readFileFromInput(file): Promise<string>
readImageFromInput(file): Promise<string>
```

这些函数用于处理浏览器环境中的文件上传。

## 集成示例

### Home.tsx - 导入项目文件

```typescript
import { openFileDialog, readFileText, handleFileImport, readFileFromInput, isTauriEnvironment } from "../utils/tauri-compat";

const handleImport = async () => {
  if (isTauriEnvironment()) {
    // Tauri 路径：使用文件对话框选择文件
    const selected = await openFileDialog({...});
    if (selected && typeof selected === 'string') {
      const content = await readFileText(selected);
      // 处理内容...
    }
  } else {
    // 浏览器路径：使用文件上传
    await handleFileImport(async (file) => {
      const content = await readFileFromInput(file);
      // 处理内容...
    });
  }
};
```

### Editor.tsx - 保存和导出

```typescript
import { saveFileDialog, writeFileText, writeFileBinary } from "../utils/tauri-compat";

const handleSave = async () => {
  const filePath = await saveFileDialog({...});
  const data = JSON.stringify(finalState, null, 2);
  await writeFileText(filePath, data);
};

const handleExportImage = async () => {
  const canvas = await html2canvas(...);
  canvas.toBlob(async (blob) => {
    const filePath = await saveFileDialog({...});
    const uint8Array = new Uint8Array(await blob.arrayBuffer());
    await writeFileBinary(filePath, uint8Array);
  }, 'image/png');
};
```

## 环境特定行为

### Tauri 环境 (桌面应用)

✅ **支持的操作**:
- 完整的文件系统访问
- 打开和保存文件到任意位置
- 访问最近打开的文件历史记录
- 完整的文件对话框功能

### 浏览器环境 (Web 应用)

✅ **支持的操作**:
- 创建新项目
- 从上传的文件导入项目
- 保存和导出下载文件

⚠️ **限制**:
- 无法读取本地文件系统（仅可上传）
- 无法访问历史记录（文件位置不可访问）
- 文件下载遵循浏览器下载行为

## 运行应用

### 桌面环境 (完整功能)
```bash
yarn tauri dev      # 开发模式
yarn tauri build    # 生产打包
```

### 网页环境 (兼容模式)
```bash
yarn dev            # Vite 开发服务器
yarn build          # 网页生产构建
```

## 浏览器兼容性

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14.1+
- ✅ Mobile 浏览器（有文件上传支持的）

## 未来改进

1. **IndexedDB 支持**: 为浏览器环境添加本地数据库存储
2. **云端同步**: 为网页版本添加云端存储选项（如 Firebase）
3. **拖拽导入**: 支持拖拽文件到应用中导入
4. **共享链接**: 生成项目分享链接功能
