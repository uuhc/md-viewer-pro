// 全局状态
const state = {
  files: [],
  currentFile: null,
  sidebarVisible: true,
  tocVisible: true
};

// DOM 元素
const elements = {
  fileTree: document.getElementById('fileTree'),
  fileInput: document.getElementById('fileInput'),
  addFileBtn: document.getElementById('addFileBtn'),
  searchBtn: document.getElementById('searchBtn'),
  searchContainer: document.getElementById('searchContainer'),
  searchInput: document.getElementById('searchInput'),
  markdownContent: document.getElementById('markdownContent'),
  breadcrumb: document.getElementById('breadcrumb'),
  toc: document.getElementById('toc'),
  tocContainer: document.getElementById('tocContainer'),
  toggleTocBtn: document.getElementById('toggleTocBtn'),
  closeTocBtn: document.getElementById('closeTocBtn'),
  closeSidebarBtn: document.getElementById('closeSidebarBtn'),
  exportBtn: document.getElementById('exportBtn')
};

// 初始化
async function init() {
  await loadFiles();
  setupEventListeners();
  renderFileTree();
}

// 设置事件监听
function setupEventListeners() {
  elements.addFileBtn.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', handleFileSelect);
  elements.searchBtn.addEventListener('click', toggleSearch);
  elements.searchInput.addEventListener('input', handleSearch);
  elements.closeSidebarBtn.addEventListener('click', () => toggleSidebar());
  elements.toggleTocBtn.addEventListener('click', () => toggleToc());
  elements.closeTocBtn.addEventListener('click', () => toggleToc());
  elements.exportBtn.addEventListener('click', exportToHTML);
}

// 处理文件选择
async function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  for (const file of files) {
    const content = await readFile(file);
    const fileData = {
      id: Date.now() + Math.random(),
      name: file.name,
      content: content,
      lastModified: file.lastModified
    };
    state.files.push(fileData);
  }
  await saveFiles();
  renderFileTree();
  elements.fileInput.value = '';
}

// 读取文件内容
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// 渲染文件树
function renderFileTree(filter = '') {
  const filteredFiles = filter
    ? state.files.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()))
    : state.files;

  if (filteredFiles.length === 0) {
    elements.fileTree.innerHTML = `
      <div class="empty-state">
        <p>${filter ? '未找到匹配的文件' : '点击"添加文件"按钮上传 Markdown 文件'}</p>
      </div>
    `;
    return;
  }

  elements.fileTree.innerHTML = filteredFiles
    .map(file => `
      <div class="file-item ${state.currentFile?.id === file.id ? 'active' : ''}" 
           data-file-id="${file.id}">
        <svg class="file-item-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor">
          <path d="M5 2h6l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
          <path d="M8 2v4h4"/>
        </svg>
        <span>${escapeHtml(file.name)}</span>
      </div>
    `)
    .join('');

  // 添加点击事件
  elements.fileTree.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', () => {
      const fileId = item.dataset.fileId;
      const file = state.files.find(f => f.id == fileId);
      if (file) {
        selectFile(file);
      }
    });
  });
}

// 选择文件
function selectFile(file) {
  state.currentFile = file;
  renderFileTree();
  renderMarkdown(file.content);
  updateBreadcrumb(file.name);
  generateTOC();
}

// 渲染 Markdown
function renderMarkdown(content) {
  if (!content) {
    elements.markdownContent.innerHTML = '<div class="welcome-screen"><h1>Markdown Viewer</h1><p>文件内容为空</p></div>';
    return;
  }

  // 配置 marked
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: true,
    mangle: false
  });

  // 渲染 HTML
  const html = marked.parse(content);
  elements.markdownContent.innerHTML = html;

  // 处理代码块，添加复制按钮
  processCodeBlocks();
  
  // 添加标题 ID（用于目录导航）
  addHeadingIds();
  
  // 更新目录高亮
  updateTocHighlight();
}

// 处理代码块，添加复制按钮
function processCodeBlocks() {
  const codeBlocks = elements.markdownContent.querySelectorAll('pre code');
  
  codeBlocks.forEach(code => {
    const pre = code.parentElement;
    if (pre.tagName === 'PRE') {
      // 检查是否已经添加了复制按钮
      if (pre.parentElement.classList.contains('code-block-wrapper')) {
        return;
      }

      // 创建包装器
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';
      
      // 创建头部
      const header = document.createElement('div');
      header.className = 'code-block-header';
      
      // 检测语言
      const lang = code.className.replace('language-', '') || 'code';
      const langLabel = document.createElement('span');
      langLabel.textContent = lang;
      header.appendChild(langLabel);
      
      // 创建复制按钮
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor"><rect x="5" y="5" width="8" height="8" rx="1"/><path d="M3 11V5a2 2 0 0 1 2-2h6"/></svg> 复制';
      copyBtn.addEventListener('click', () => copyCode(code.textContent, copyBtn));
      header.appendChild(copyBtn);
      
      // 包装 pre 元素
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
    }
  });
}

// 复制代码
function copyCode(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.innerHTML;
    button.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M13 8L6 15l-4-4"/></svg> 已复制';
    button.classList.add('copied');
    setTimeout(() => {
      button.innerHTML = originalText;
      button.classList.remove('copied');
    }, 2000);
  }).catch(err => {
    console.error('复制失败:', err);
    alert('复制失败，请手动复制');
  });
}

// 添加标题 ID
function addHeadingIds() {
  const headings = elements.markdownContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach((heading, index) => {
    if (!heading.id) {
      const text = heading.textContent.trim();
      const id = text.toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-|-$/g, '') || `heading-${index}`;
      heading.id = id;
    }
  });
}

// 生成目录
function generateTOC() {
  const headings = elements.markdownContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
  
  if (headings.length === 0) {
    elements.toc.innerHTML = '<p class="empty-toc">暂无目录</p>';
    return;
  }

  const tocItems = [];
  let currentLevel = 0;
  const stack = [];

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    const text = heading.textContent.trim();
    const id = heading.id || `heading-${index}`;

    // 调整堆栈
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    const item = {
      level,
      text,
      id,
      children: []
    };

    if (stack.length === 0) {
      tocItems.push(item);
    } else {
      stack[stack.length - 1].children.push(item);
    }

    stack.push(item);
  });

  elements.toc.innerHTML = renderTOCItems(tocItems);
  
  // 添加点击事件
  elements.toc.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.getAttribute('href').substring(1);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // 更新活动状态
        elements.toc.querySelectorAll('a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');
      }
    });
  });

  // 监听滚动，更新高亮
  elements.markdownContent.addEventListener('scroll', updateTocHighlight);
}

// 渲染目录项
function renderTOCItems(items, level = 0) {
  if (items.length === 0) return '';
  
  return `
    <ul>
      ${items.map(item => `
        <li>
          <a href="#${item.id}" data-level="${item.level}">${escapeHtml(item.text)}</a>
          ${item.children.length > 0 ? renderTOCItems(item.children, level + 1) : ''}
        </li>
      `).join('')}
    </ul>
  `;
}

// 更新目录高亮
function updateTocHighlight() {
  const headings = elements.markdownContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const links = elements.toc.querySelectorAll('a');
  
  let activeId = null;
  const scrollTop = elements.markdownContent.scrollTop;
  const offset = 100;

  for (let i = headings.length - 1; i >= 0; i--) {
    const heading = headings[i];
    const rect = heading.getBoundingClientRect();
    const contentRect = elements.markdownContent.getBoundingClientRect();
    
    if (rect.top <= contentRect.top + offset) {
      activeId = heading.id;
      break;
    }
  }

  links.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${activeId}`);
  });
}

// 更新面包屑
function updateBreadcrumb(filename) {
  elements.breadcrumb.textContent = filename || '未选择文件';
}

// 切换搜索
function toggleSearch() {
  const isVisible = elements.searchContainer.style.display !== 'none';
  elements.searchContainer.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) {
    elements.searchInput.focus();
  }
}

// 处理搜索
function handleSearch(event) {
  const query = event.target.value;
  renderFileTree(query);
}

// 切换侧边栏
function toggleSidebar() {
  state.sidebarVisible = !state.sidebarVisible;
  elements.fileTree.closest('.sidebar-left').classList.toggle('hidden', !state.sidebarVisible);
}

// 切换目录
function toggleToc() {
  state.tocVisible = !state.tocVisible;
  elements.tocContainer.closest('.sidebar-right').classList.toggle('hidden', !state.tocVisible);
}

// 导出 HTML
function exportToHTML() {
  if (!state.currentFile) {
    alert('请先选择一个文件');
    return;
  }

  const content = elements.markdownContent.innerHTML;
  const styles = Array.from(document.styleSheets)
    .map(sheet => {
      try {
        return Array.from(sheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch (e) {
        return '';
      }
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(state.currentFile.name)}</title>
  <style>
    ${styles}
    body {
      margin: 0;
      padding: 0;
    }
    .container {
      display: block;
    }
    .sidebar {
      display: none;
    }
    .content-header {
      display: none;
    }
    .markdown-content {
      padding: 32px 48px;
      max-width: 900px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <main class="content">
      <div class="markdown-content">
        ${content}
      </div>
    </main>
  </div>
  <script>
    // 代码复制功能
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const code = this.closest('.code-block-wrapper').querySelector('code');
        navigator.clipboard.writeText(code.textContent).then(() => {
          const originalText = this.innerHTML;
          this.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M13 8L6 15l-4-4"/></svg> 已复制';
          this.classList.add('copied');
          setTimeout(() => {
            this.innerHTML = originalText;
            this.classList.remove('copied');
          }, 2000);
        });
      });
    });
  </script>
</body>
</html>`;

  // 创建下载链接
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = state.currentFile.name.replace(/\.md$/, '.html');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 保存文件到存储
async function saveFiles() {
  const filesToSave = state.files.map(f => ({
    id: f.id,
    name: f.name,
    content: f.content,
    lastModified: f.lastModified
  }));
  await chrome.storage.local.set({ files: filesToSave });
}

// 从存储加载文件
async function loadFiles() {
  const result = await chrome.storage.local.get(['files']);
  if (result.files) {
    state.files = result.files;
  }
}

// 转义 HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 启动应用
init();

