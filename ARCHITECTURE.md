# Markdown Viewer 插件运行逻辑与架构

## 📋 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                   浏览器扩展环境                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │              manifest.json                        │  │
│  │  - 定义 popup.html 为入口                         │  │
│  │  - 配置权限（storage）                            │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │              popup.html                           │  │
│  │  - 加载 Vue 应用入口                              │  │
│  │  - <div id="app"></div>                          │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │              src/main.js                          │  │
│  │  - 创建 Vue 应用实例                               │  │
│  │  - 注册 Ant Design Vue                            │  │
│  │  - 挂载到 #app                                    │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │              src/App.vue                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │ FileTree  │  │ Markdown │  │   TOC    │       │  │
│  │  │  组件     │  │ Content  │  │  组件    │       │  │
│  │  └──────────┘  └──────────┘  └──────────┘       │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 🔄 运行流程

### 1. 初始化阶段

```
用户点击扩展图标
    ↓
浏览器加载 popup.html
    ↓
加载 src/main.js
    ↓
创建 Vue 应用实例
    ↓
注册 Ant Design Vue 组件库
    ↓
挂载 App.vue 组件
    ↓
App.vue 的 onMounted 钩子执行
    ↓
调用 useFileManager().loadFiles()
    ↓
从 Chrome Storage 读取已保存的文件列表
    ↓
渲染界面
```

### 2. 文件管理流程

#### 2.1 添加文件

```
用户在 FileTree 组件中点击"添加文件"按钮
    ↓
触发 <input type="file"> 的 click 事件
    ↓
用户选择 .md 或 .markdown 文件（支持多选）
    ↓
触发 handleFileSelect 事件
    ↓
调用 useFileManager().addFiles(fileList)
    ↓
遍历文件列表：
    ├─ 使用 FileReader API 读取文件内容
    ├─ 创建文件对象 { id, name, content, lastModified }
    └─ 添加到 files 数组
    ↓
调用 saveFiles() 保存到 Chrome Storage
    ↓
Vue 响应式更新，FileTree 组件自动重新渲染
```

#### 2.2 选择文件

```
用户在 FileTree 组件中点击文件节点
    ↓
触发 Tree 组件的 @select 事件
    ↓
调用 handleSelect() 方法
    ↓
emit('select-file', file) 向父组件发送事件
    ↓
App.vue 接收事件，调用 handleSelectFile()
    ↓
调用 useFileManager().selectFile(file)
    ↓
更新 currentFile 状态
    ↓
Vue 响应式更新：
    ├─ MarkdownContent 组件接收新的 content prop
    ├─ 面包屑显示文件名
    └─ 文件树高亮当前选中项
```

### 3. Markdown 渲染流程

```
MarkdownContent 组件接收到新的 content prop
    ↓
watch 监听器触发 renderMarkdown()
    ↓
使用 marked.parse() 将 Markdown 转换为 HTML
    ↓
更新 renderedContent（触发 DOM 更新）
    ↓
nextTick() 等待 DOM 更新完成
    ↓
执行后处理：
    ├─ processCodeBlocks()    处理代码块，添加复制按钮
    ├─ addHeadingIds()        为标题添加 ID（用于锚点）
    ├─ generateTOC()          生成目录结构
    └─ setupScrollListener()  设置滚动监听
    ↓
emit('toc-updated', items) 向父组件发送目录数据
    ↓
App.vue 更新 tocItems 状态
    ↓
TableOfContents 组件接收新的 items prop
    ↓
转换为 Ant Design Anchor 组件格式并渲染
```

### 4. 目录导航流程

```
用户在 TableOfContents 组件中点击目录项
    ↓
Ant Design Anchor 组件处理点击事件
    ↓
获取目标元素的 ID（如 #heading-1）
    ↓
调用 element.scrollIntoView({ behavior: 'smooth' })
    ↓
页面平滑滚动到对应标题位置
    ↓
Anchor 组件自动更新活动状态（高亮当前章节）
```

### 5. 代码复制流程

```
用户点击代码块上的"复制"按钮
    ↓
触发 copyCode() 方法
    ↓
获取代码块的文本内容
    ↓
调用 navigator.clipboard.writeText()
    ↓
复制成功：
    ├─ 更新按钮文本为"✅ 已复制"
    ├─ 添加 copied CSS 类
    └─ 2秒后恢复原状
```

### 6. HTML 导出流程

```
用户点击"导出 HTML"按钮
    ↓
调用 handleExport()
    ↓
检查 currentFile 是否存在
    ↓
调用 useExport().exportToHTML(file)
    ↓
获取 Markdown 渲染后的 HTML 内容
    ↓
提取所有 CSS 样式（从 document.styleSheets）
    ↓
构建完整的 HTML 文档：
    ├─ 包含所有样式
    ├─ 包含渲染后的内容
    └─ 包含代码复制功能的脚本
    ↓
创建 Blob 对象
    ↓
创建临时下载链接
    ↓
触发下载（文件名：原文件名.html）
    ↓
清理临时链接
```

## 🗂️ 数据流

### 状态管理

```
┌─────────────────────────────────────┐
│      Chrome Storage (持久化)         │
│  { files: [file1, file2, ...] }    │
└─────────────────────────────────────┘
              ↕
┌─────────────────────────────────────┐
│    useFileManager (组合式函数)      │
│  - files: ref([])                  │
│  - currentFile: ref(null)          │
│  - loadFiles()                     │
│  - addFiles()                      │
│  - selectFile()                    │
└─────────────────────────────────────┘
              ↕
┌─────────────────────────────────────┐
│         App.vue (主组件)             │
│  - 管理全局状态                      │
│  - 协调子组件通信                    │
└─────────────────────────────────────┘
    ↕        ↕        ↕
┌────────┐ ┌────────┐ ┌────────┐
│FileTree│ │Markdown│ │   TOC   │
│        │ │Content │ │        │
└────────┘ └────────┘ └────────┘
```

### 组件通信

1. **父 → 子（Props）**
   - `App.vue` → `FileTree`: `files`, `currentFileId`
   - `App.vue` → `MarkdownContent`: `content`
   - `App.vue` → `TableOfContents`: `items`

2. **子 → 父（Events）**
   - `FileTree` → `App.vue`: `@select-file`, `@add-files`
   - `MarkdownContent` → `App.vue`: `@toc-updated`

3. **状态提升**
   - 文件列表和当前文件状态在 `App.vue` 中管理
   - 通过 `useFileManager` 组合式函数共享状态

## 🔧 关键技术点

### 1. Chrome Storage API
- **用途**: 持久化存储文件列表
- **方法**: `chrome.storage.local.get()` / `set()`
- **特点**: 即使关闭浏览器，数据也会保留

### 2. FileReader API
- **用途**: 读取本地文件内容
- **方法**: `readAsText()`
- **特点**: 异步读取，不阻塞 UI

### 3. Marked.js
- **用途**: Markdown 解析
- **配置**: 
  - `breaks: true` - 支持换行
  - `gfm: true` - GitHub Flavored Markdown
  - `headerIds: true` - 自动生成标题 ID

### 4. Vue 3 Composition API
- **响应式**: `ref()`, `computed()`, `watch()`
- **生命周期**: `onMounted()`, `nextTick()`
- **组合式函数**: `useFileManager`, `useExport`

### 5. Ant Design Vue
- **Layout**: 三栏布局
- **Tree**: 文件树展示
- **Anchor**: 目录导航
- **Button/Input**: UI 组件

## 📊 性能优化

1. **按需加载**: 使用 Vite 构建，代码分割
2. **响应式更新**: Vue 3 的响应式系统只更新必要的 DOM
3. **虚拟滚动**: Ant Design Tree 组件支持大数据量
4. **防抖**: 搜索功能可以添加防抖优化（当前未实现）

## 🔐 安全考虑

1. **Content Security Policy**: manifest.json 中配置了 CSP
2. **XSS 防护**: 使用 `v-html` 时，Marked.js 会转义危险内容
3. **文件读取**: 仅读取用户主动选择的文件
4. **存储限制**: Chrome Storage 有配额限制（通常 10MB）

## 🐛 错误处理

1. **文件读取失败**: try-catch 捕获，控制台输出错误
2. **存储失败**: 捕获异常，不影响 UI
3. **复制失败**: 显示提示信息
4. **导出失败**: 显示警告信息

## 🚀 扩展点

1. **文件编辑**: 可以添加编辑功能
2. **文件删除**: 可以添加删除功能
3. **文件重命名**: 可以添加重命名功能
4. **主题切换**: 可以添加暗色模式
5. **导出格式**: 可以支持 PDF、图片等格式
6. **同步功能**: 可以添加云同步功能

