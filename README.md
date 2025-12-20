# MD Viewer Pro

一个专业的 Markdown 文件预览工具，支持文件树、目录导航和 HTML 导出功能。

## 功能特性

- 🚀 **自动预览**：当浏览器打开 `file://` 协议的 Markdown 文件时，自动切换到美观的预览界面
- 📁 **文件管理**：支持添加多个 Markdown 文件，左侧文件树管理
- 📑 **目录导航**：自动生成文档目录，支持快速跳转（可打开/关闭）
- 💻 **代码高亮**：自动识别代码块，支持一键复制
- 🎨 **美观预览**：使用 Ant Design Vue 精心设计的 Markdown 渲染样式
- 📤 **HTML 导出**：导出为 HTML 文件，保持预览样式

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Ant Design Vue** - 企业级 UI 组件库
- **Vite** - 下一代前端构建工具
- **Marked.js** - Markdown 解析库
- **Manifest V3** - Chrome 扩展规范

## 开发环境设置

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

这会监听文件变化并自动构建到 `dist` 目录。

### 生产构建

```bash
npm run build
```

构建产物会输出到 `dist` 目录。

## 安装方法

1. 构建项目：`npm run build`
2. 打开 Chrome/Edge 浏览器
3. 访问 `chrome://extensions/` 或 `edge://extensions/`
4. 开启"开发者模式"
5. 点击"加载已解压的扩展程序"
6. 选择本项目的 `dist` 目录（不是项目根目录）

## 使用方法

### 方式一：自动预览（推荐）

1. 在浏览器中直接打开本地的 Markdown 文件（`file://` 协议）
2. 插件会自动检测并切换到美观的预览界面
3. 无需任何手动操作，即可享受美观的预览体验

### 方式二：手动管理

1. 点击浏览器工具栏中的插件图标
2. 点击左侧的"添加文件"按钮（+ 图标）
3. 选择要预览的 Markdown 文件（支持多选）
4. 点击文件树中的文件进行预览
5. 使用右侧目录快速跳转到不同章节
6. 点击代码块上的"复制"按钮复制代码
7. 点击右上角的导出按钮导出为 HTML 文件

## 项目结构

```
markdown-viewer/
├── src/
│   ├── components/          # Vue 组件
│   │   ├── FileTree.vue     # 文件树组件
│   │   ├── MarkdownContent.vue  # Markdown 内容组件
│   │   └── TableOfContents.vue   # 目录组件
│   ├── composables/         # 组合式函数
│   │   ├── useFileManager.js    # 文件管理逻辑
│   │   └── useExport.js         # 导出功能
│   ├── App.vue             # 主应用组件
│   └── main.js            # 应用入口
├── dist/                   # 构建输出目录（构建后生成）
├── popup.html              # 插件入口 HTML
├── manifest.json           # 插件配置文件
├── vite.config.js          # Vite 配置
├── package.json            # 项目配置
└── README.md              # 说明文档
```

## 注意事项

- **自动预览功能**：插件会在后台监听浏览器打开的 `file://` 协议文件，自动识别 Markdown 文件并切换预览
- **文件数据存储**：文件数据存储在浏览器本地存储中（Chrome Storage API）
- **支持格式**：支持 `.md` 和 `.markdown` 文件格式
- **HTML 导出**：导出的 HTML 文件包含完整的样式和交互功能
- **构建要求**：需要先构建项目才能安装插件（`npm run build`）
- **权限说明**：插件需要 `tabs` 和 `storage` 权限来实现自动预览功能

## 开发说明

### 组件说明

- **FileTree**: 使用 Ant Design Vue 的 Tree 组件实现文件树
- **MarkdownContent**: 使用 Marked.js 解析 Markdown，并处理代码块复制功能
- **TableOfContents**: 使用 Ant Design Vue 的 Anchor 组件实现目录导航

### 状态管理

使用 Vue 3 的 Composition API 和组合式函数（composables）管理状态：
- `useFileManager`: 管理文件列表和当前选中文件
- `useExport`: 处理 HTML 导出功能
