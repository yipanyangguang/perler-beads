| 功能 | Tauri 环境 | 浏览器环境 | 文件位置 |
|------|-----------|---------|---------|
| **导入项目文件** | ✅ 完整支持 | ✅ 通过文件上传 | Home.tsx line 31 |
| **打开历史项目** | ✅ 完整支持 | ⚠️ 不支持 | Home.tsx line 53 |
| **保存项目文件** | ✅ 完整支持 | ✅ 浏览器下载 | Editor.tsx line 171 |
| **导出为图片** | ✅ 完整支持 | ✅ 浏览器下载 | Editor.tsx line 217 |

## 快速集成指南

### 在新页面中使用 Tauri 功能

**导入兼容层：**
```typescript
import {
  isTauriEnvironment,
  openFileDialog,
  saveFileDialog,
  readFileText,
  writeFileText,
  writeFileBinary,
  handleFileImport,
  readFileFromInput,
} from "../utils/tauri-compat";
```

**示例：文件操作**
```typescript
const handleMyFileOperation = async () => {
  if (isTauriEnvironment()) {
    // Tauri 路径：使用系统 API
    const path = await saveFileDialog({
      defaultPath: "myfile.json"
    });
    await writeFileText(path, content);
  } else {
    // 浏览器路径：使用下载
    await writeFileText("myfile.json", content);
  }
};
```

## 环境检测模式

### 模式 1：条件分支（完全不同的实现）
```typescript
if (isTauriEnvironment()) {
  // Tauri 路径
} else {
  // 浏览器路径
}
```

### 模式 2：统一 API（推荐）
```typescript
// 底层自动判断，上层无需知道环境
await writeFileText(path, content); // 自动使用 Tauri 或下载
```

## 浏览器特定功能

### 文件上传处理
```typescript
await handleFileImport(async (file: File) => {
  const content = await readFileFromInput(file);
  // 处理文件内容
});
```

### 数据 URL 图片
```typescript
const dataUrl = await readImageFromInput(file);
img.src = dataUrl; // 直接在浏览器中使用
```

## 调试技巧

### 模拟浏览器环境（在 Tauri 中测试）
```typescript
// 在 DevTools 中临时禁用 __TAURI__
delete (window as any).__TAURI__;
```

### 检查当前环境
```typescript
console.log(isTauriEnvironment()); // true/false
```

## 常见问题

**Q: 浏览器中为什么不能访问历史记录？**
A: 这是浏览器的安全限制（同源策略）。每个浏览器标签页无法访问其他文件的真实路径。

**Q: 可以在浏览器中实现文件历史吗？**
A: 可以！使用 IndexedDB 或 localStorage 存储项目数据。

**Q: Tauri 和浏览器使用同一套兼容层吗？**
A: 是的！`tauri-compat.ts` 会自动选择正确的实现。

## 性能优化

### Lazy Loading
```typescript
// 只在需要时导入
if (isTauriEnvironment()) {
  const { readTextFile } = await import('@tauri-apps/plugin-fs');
}
```

## 安全注意事项

1. **文件上传**: 浏览器中使用标准的 `<input type="file">`，受浏览器沙箱保护
2. **下载**: 遵循浏览器下载政策，用户可控制下载行为
3. **历史记录**: Tauri 中直接访问文件系统，请确保适当的权限检查

## 测试检查清单

- [ ] Tauri 中可以导入项目文件
- [ ] Tauri 中可以从历史记录打开文件
- [ ] Tauri 中可以保存项目文件
- [ ] Tauri 中可以导出 PNG 图片
- [ ] 浏览器中可以导入项目文件（上传）
- [ ] 浏览器中可以保存项目文件（下载）
- [ ] 浏览器中可以导出 PNG 图片（下载）
- [ ] 浏览器中历史记录正确显示不支持提示
- [ ] 无 TypeScript 编译错误
- [ ] 无运行时错误
