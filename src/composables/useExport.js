export function useExport() {
  // 将图标转换为 base64（用于导出的 HTML）
  const getIconAsBase64 = async (iconName) => {
    try {
      // 尝试从扩展资源获取
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        const iconUrl = chrome.runtime.getURL(iconName);
        const response = await fetch(iconUrl);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }
      // 如果不在扩展环境中，尝试从当前页面获取
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } catch (e) {
            resolve('');
          }
        };
        
        img.onerror = () => {
          resolve('');
        };
        
        // 尝试多个可能的路径
        const paths = [`/${iconName}`, `./${iconName}`, iconName];
        let currentPathIndex = 0;
        const tryNextPath = () => {
          if (currentPathIndex >= paths.length) {
            resolve('');
            return;
          }
          img.src = paths[currentPathIndex];
          currentPathIndex++;
        };
        tryNextPath();
      });
    } catch (e) {
      return '';
    }
  };

  const exportToHTML = async (file, tocItems = [], currentTheme = 'light') => {
    if (!file) {
      return;
    }

    const contentElement = document.querySelector('.markdown-body');
    if (!contentElement) {
      alert('无法获取内容');
      return;
    }
    
    // 获取图标 base64
    const iconBase64 = await getIconAsBase64('icons/icon16.png');
    const faviconLink = iconBase64 ? `<link rel="icon" type="image/png" href="${iconBase64}">` : '';

    // 克隆内容以避免修改原始 DOM
    const contentClone = contentElement.cloneNode(true);

    // 处理代码块，添加语言标签和复制按钮
    const codeBlocks = contentClone.querySelectorAll('pre code');
    codeBlocks.forEach((code) => {
      const pre = code.parentElement;
      if (pre.tagName === 'PRE') {
        // 如果已经有包装器，跳过
        if (pre.parentElement.classList.contains('code-block-wrapper')) {
          return;
        }

        // 获取语言信息
        let lang = 'plain';
        const classList = Array.from(code.classList);
        for (const cls of classList) {
          if (cls.startsWith('language-')) {
            lang = cls.replace('language-', '');
            break;
          } else if (cls === 'hljs') {
            // 如果没有明确的语言，尝试从 data-language 属性获取
            lang = code.getAttribute('data-language') || 'plain';
          }
        }

        // 创建包装器
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';

        // 创建头部
        const header = document.createElement('div');
        header.className = 'code-block-header';

        // 语言标签
        const langLabel = document.createElement('span');
        langLabel.textContent = lang;
        header.appendChild(langLabel);

        // 按钮容器
        const btnContainer = document.createElement('div');
        btnContainer.className = 'code-btn-container';

        // 换行按钮
        const wrapBtn = document.createElement('button');
        wrapBtn.className = 'wrap-btn';
        wrapBtn.innerHTML = '↩ 换行';
        btnContainer.appendChild(wrapBtn);

        // 复制按钮（注意：这个按钮的事件监听器不会在导出的 HTML 中使用）
        // 导出的 HTML 使用 script 标签中的 copyToClipboard 函数
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '📋 复制';
        // 这个事件监听器只是为了在导出前预览时使用，实际导出的 HTML 会使用 script 中的函数
        // 使用降级方案，避免权限策略警告
        copyBtn.addEventListener('click', () => {
          const textArea = document.createElement('textarea');
          textArea.value = code.textContent;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
              const originalText = copyBtn.innerHTML;
              copyBtn.innerHTML = '✅ 已复制';
              copyBtn.classList.add('copied');
              setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.classList.remove('copied');
              }, 2000);
            } else {
              alert('复制失败，请手动选择文本复制');
            }
          } catch (err) {
            document.body.removeChild(textArea);
            alert('复制失败，请手动选择文本复制');
          }
        });
        btnContainer.appendChild(copyBtn);

        header.appendChild(btnContainer);

        // 包装结构
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
      }
    });

    const content = contentClone.innerHTML;
    
    // 生成目录 HTML（与预览效果一致）
    const generateTocHTML = (items) => {
      if (items.length === 0) return '';
      
      const renderTocItems = (items, level = 0) => {
        return items.map((item, index) => {
          // Ant Design Anchor 的缩进方式：第一级 0px，第二级 16px，第三级 32px
          const indent = level * 16;
          const children = item.children && item.children.length > 0 
            ? renderTocItems(item.children, level + 1) 
            : '';
          // 第一项不需要上边距，其他项需要
          const marginTop = (level === 0 && index === 0) ? '0' : (level === 0 ? '1px' : '2px');
          return `
            <li class="toc-item" style="padding-left: ${indent}px; margin-top: ${marginTop};">
              <a href="#${item.id}" class="toc-link" data-href="#${item.id}">
                ${escapeHtml(item.text)}
              </a>
              ${children ? `<ul class="toc-sublist">${children}</ul>` : ''}
            </li>
          `;
        }).join('');
      };
      
      return `
        <div class="toc-sidebar">
          <div class="toc-header">
            <h3>目录</h3>
          </div>
          <div class="toc-content">
            <ul class="toc-list">
              ${renderTocItems(items)}
            </ul>
          </div>
        </div>
      `;
    };
    
    const tocHTML = generateTocHTML(tocItems);
    
    // 提取所有样式表
    let allStyles = '';
    
    // 方法1: 从 document.styleSheets 提取
    try {
      const stylesFromSheets = Array.from(document.styleSheets)
        .map((sheet) => {
          try {
            return Array.from(sheet.cssRules)
              .map((rule) => rule.cssText)
              .join('\n');
          } catch (e) {
            // 跨域样式表无法访问，尝试从 link 标签获取
            if (sheet.href) {
              return `@import url('${sheet.href}');`;
            }
            return '';
          }
        })
        .filter(Boolean)
        .join('\n');
      allStyles += stylesFromSheets;
    } catch (e) {
      console.warn('提取样式表失败:', e);
    }
    
    // 方法2: 从 style 标签提取
    try {
      const styleTags = Array.from(document.querySelectorAll('style'))
        .map((tag) => tag.textContent || tag.innerHTML)
        .join('\n');
      allStyles += '\n' + styleTags;
    } catch (e) {
      console.warn('提取 style 标签失败:', e);
    }

    // 根据当前主题生成样式
    const isDark = currentTheme === 'dark';
    
    // 获取 highlight.js 的 CDN 样式
    const highlightStyles = isDark
      ? `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github-dark.min.css">`
      : `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css">`;
    const themeVars = isDark ? `
      --bg-primary: #141414;
      --bg-secondary: #1f1f1f;
      --bg-tertiary: #262626;
      --border-color: #434343;
      --text-primary: rgba(255, 255, 255, 0.85);
      --text-secondary: rgba(255, 255, 255, 0.65);
      --text-tertiary: rgba(255, 255, 255, 0.45);
      --accent-color: #177ddc;
      --accent-hover: #3c9fe8;
      --code-bg: #0d1117;
      --code-border: #30363d;
      --code-text: #ff7b72;
      --blockquote-bg: #1f1f1f;
      --blockquote-border: #177ddc;
      --table-header-bg: #1f1f1f;
      --table-row-bg: #1f1f1f;
      /* 语法高亮颜色 - GitHub Dark */
      --hl-keyword: #ff7b72;
      --hl-string: #a5d6ff;
      --hl-number: #79c0ff;
      --hl-comment: #8b949e;
      --hl-function: #d2a8ff;
      --hl-operator: #ff7b72;
      --hl-class: #ff7b72;
      --hl-tag: #7ee787;
      --hl-attribute: #79c0ff;
      --hl-property: #79c0ff;
      --hl-punctuation: #c9d1d9;
      --hl-variable: #ffa657;
    ` : `
      --bg-primary: #ffffff;
      --bg-secondary: #f8f9fa;
      --bg-tertiary: #f1f3f5;
      --border-color: #e9ecef;
      --text-primary: #212529;
      --text-secondary: #6c757d;
      --text-tertiary: #adb5bd;
      --accent-color: #1890ff;
      --accent-hover: #40a9ff;
      --code-bg: #f6f8fa;
      --code-border: #d0d7de;
      --code-text: #d73a49;
      --blockquote-bg: #fafafa;
      --blockquote-border: #1890ff;
      --table-header-bg: #fafafa;
      --table-row-bg: #fafafa;
      /* 语法高亮颜色 - GitHub */
      --hl-keyword: #d73a49;
      --hl-string: #032f62;
      --hl-number: #005cc5;
      --hl-comment: #6a737d;
      --hl-function: #6f42c1;
      --hl-operator: #d73a49;
      --hl-class: #d73a49;
      --hl-tag: #22863a;
      --hl-attribute: #6f42c1;
      --hl-property: #005cc5;
      --hl-punctuation: #24292e;
      --hl-variable: #e36209;
    `;

    // Markdown 内容专用样式（确保完整，与预览效果一致）
    const markdownStyles = `
/* CSS 变量定义 */
:root {
  ${themeVars}
}

/* 布局样式 - 与预览效果一致 */
body {
  margin: 0;
  padding: 0;
  height: 100vh;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s, color 0.3s;
}

/* 主容器 - 使用与预览相同的布局 */
.main-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* 内容区域 */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  transition: background-color 0.3s;
  overflow: hidden;
}

/* 内容头部 */
.content-header {
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  height: 48px;
  transition: background-color 0.3s, border-color 0.3s;
}

.breadcrumb {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  transition: color 0.3s;
}

/* Markdown 内容包装器 */
.markdown-content-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* 目录侧边栏样式 - 左侧固定，与预览效果一致 */
.toc-sidebar {
  width: 280px;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
  z-index: 100;
  transition: background-color 0.3s, border-color 0.3s;
  overflow: hidden; /* 确保容器不会溢出 */
  min-height: 0; /* 允许 flex 容器缩小 */
  flex-shrink: 0;
}

.toc-header {
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
  transition: background-color 0.3s, border-color 0.3s;
  flex-shrink: 0;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.toc-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s;
  text-align: center;
}

.toc-content {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  min-height: 0; /* 重要：允许 flex 子元素缩小，这样才能正确滚动 */
  position: relative;
  /* 滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: var(--text-tertiary) var(--bg-secondary);
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box; /* 确保 padding 包含在高度计算内 */
  /* 确保内容区域可以正确计算高度 */
  height: 0; /* 配合 flex: 1 使用，强制 flex 子元素遵守高度限制 */
}

/* 目录侧边栏滚动条样式 */
.toc-content::-webkit-scrollbar {
  width: 8px;
}

.toc-content::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 4px;
}

.toc-content::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: 4px;
  min-height: 20px;
}

.toc-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  height: auto; /* 允许列表根据内容自动调整高度 */
  min-height: 0; /* 允许缩小 */
}

.toc-item {
  position: relative;
  padding: 0;
  margin: 0;
  line-height: 1.5;
}

.toc-item:first-child {
  margin-top: 0;
}

.toc-sublist {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 13px;
  display: block;
  padding: 1px 0;
  line-height: 1.5;
  transition: color 0.2s;
  position: relative;
}

.toc-link:hover {
  color: var(--accent-color);
}

.toc-link.active {
  color: var(--accent-color);
  font-weight: 500;
}

/* Markdown 内容样式 - 与预览效果完全一致 */
.markdown-content {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  padding: 0;
  /* 使用 RTL 方向让滚动条在右侧 */
  direction: rtl;
  /* 确保滚动条可见 */
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) var(--bg-secondary);
}

/* 内容区域居中显示，但滚动条在页面最右侧 */
.markdown-body-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 48px 100px 48px; /* 增加底部 padding，避免与统计信息框重叠 */
  min-height: calc(100% + 1px); /* 确保内容高度足够触发滚动条 */
  box-sizing: border-box;
  /* 恢复文本方向为从左到右 */
  direction: ltr;
  /* 确保内容可以正常显示 */
  text-align: left;
  /* 确保内容不会因为 RTL 而反向 */
  unicode-bidi: embed;
}

/* 自定义滚动条样式，确保在右侧可见 */
.markdown-content::-webkit-scrollbar {
  width: 8px;
}

.markdown-content::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.markdown-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.markdown-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

.markdown-body {
  line-height: 1.8;
  color: var(--text-primary);
  transition: color 0.3s;
}

.markdown-body h1 {
  font-size: 32px;
  font-weight: 700;
  margin: 32px 0 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border-color);
  color: var(--text-primary);
  transition: color 0.3s, border-color 0.3s;
}

.markdown-body h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 28px 0 12px;
  color: var(--text-primary);
  transition: color 0.3s;
}

.markdown-body h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 24px 0 10px;
  color: var(--text-primary);
  transition: color 0.3s;
}

.markdown-body h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 20px 0 8px;
  color: var(--text-primary);
  transition: color 0.3s;
}

.markdown-body h5,
.markdown-body h6 {
  font-size: 14px;
  font-weight: 600;
  margin: 16px 0 6px;
  color: var(--text-primary);
  transition: color 0.3s;
}

.markdown-body p {
  margin: 12px 0;
}

.markdown-body ul,
.markdown-body ol {
  margin: 12px 0;
  padding-left: 24px;
}

.markdown-body li {
  margin: 6px 0;
}

.markdown-body blockquote {
  margin: 16px 0;
  padding: 12px 20px;
  border-left: 4px solid var(--blockquote-border);
  background: var(--blockquote-bg);
  border-radius: 4px;
  color: var(--text-secondary);
  transition: background-color 0.3s, border-color 0.3s, color 0.3s;
}

.markdown-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

.markdown-body table th,
.markdown-body table td {
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  text-align: left;
  transition: border-color 0.3s;
}

.markdown-body table th {
  background: var(--table-header-bg);
  font-weight: 600;
  transition: background-color 0.3s;
}

.markdown-body table tr:nth-child(even) {
  background: var(--table-row-bg);
  transition: background-color 0.3s;
}

.markdown-body hr {
  margin: 24px 0;
  border: none;
  border-top: 1px solid var(--border-color);
  transition: border-color 0.3s;
}

.markdown-body a {
  color: var(--accent-color);
  text-decoration: none;
  transition: color 0.2s;
}

.markdown-body a:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}

.markdown-body img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 16px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.markdown-body code {
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 0.9em;
  color: var(--code-text);
  transition: background-color 0.3s, border-color 0.3s, color 0.3s;
}

/* 代码块样式 */
.code-block-wrapper {
  position: relative;
  margin: 16px 0;
}

.code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--code-border);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
  transition: background-color 0.3s, border-color 0.3s, color 0.3s;
}

.code-btn-container {
  display: flex;
  gap: 8px;
  align-items: center;
}

.wrap-btn {
  padding: 4px 12px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--code-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.wrap-btn:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--accent-color);
}

.wrap-btn.wrapped {
  background: var(--accent-color);
  color: #ffffff;
  border-color: var(--accent-color);
}

.copy-btn {
  padding: 4px 12px;
  background: var(--accent-color);
  color: #ffffff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s, color 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.copy-btn:hover {
  background: var(--accent-hover);
  color: #ffffff;
}

.copy-btn.copied {
  background: #52c41a;
  color: #ffffff;
}

.code-block-wrapper pre {
  margin: 0;
  border-radius: 0 0 8px 8px;
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  padding: 16px;
  overflow-x: auto;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  transition: background-color 0.3s, border-color 0.3s, color 0.3s;
}

.code-block-wrapper pre.code-wrapped {
  white-space: pre-wrap;
  word-wrap: break-word;
  word-break: break-all;
}

.code-block-wrapper pre.code-wrapped code {
  white-space: pre-wrap;
  word-wrap: break-word;
  word-break: break-all;
}

.code-block-wrapper pre code {
  background: transparent;
  border: none;
  padding: 0;
  font-size: inherit;
  color: inherit;
}

/* 确保代码高亮样式正确应用 */
pre code.hljs {
  display: block;
  overflow-x: auto;
  padding: 0;
  background: transparent;
}

/* 代码语法高亮样式 - 使用 CSS 变量适配主题 */
.hljs-keyword,
.hljs-selector-tag,
.hljs-subst {
  color: var(--hl-keyword);
  font-weight: bold;
}

.hljs-number,
.hljs-literal,
.hljs-variable,
.hljs-template-variable,
.hljs-tag .hljs-attr {
  color: var(--hl-number);
}

.hljs-string,
.hljs-doctag {
  color: var(--hl-string);
}

.hljs-comment,
.hljs-quote {
  color: var(--hl-comment);
  font-style: italic;
}

.hljs-function,
.hljs-title,
.hljs-section,
.hljs-regexp {
  color: var(--hl-function);
}

.hljs-operator,
.hljs-meta,
.hljs-selector-pseudo {
  color: var(--hl-operator);
}

.hljs-class .hljs-title,
.hljs-type {
  color: var(--hl-class);
  font-weight: bold;
}

.hljs-tag {
  color: var(--hl-tag);
}

.hljs-attribute {
  color: var(--hl-attribute);
}

.hljs-property {
  color: var(--hl-property);
}

.hljs-punctuation,
.hljs-built_in,
.hljs-bullet,
.hljs-code,
.hljs-addition {
  color: var(--hl-punctuation);
}

.hljs-variable.language_ {
  color: var(--hl-variable);
}

/* 标题链接样式 */
.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  position: relative;
}

.markdown-body h1:hover .header-link,
.markdown-body h2:hover .header-link,
.markdown-body h3:hover .header-link,
.markdown-body h4:hover .header-link,
.markdown-body h5:hover .header-link,
.markdown-body h6:hover .header-link {
  opacity: 1;
}

.markdown-body .header-link {
  opacity: 0;
  margin-left: 8px;
  color: var(--text-tertiary);
  text-decoration: none;
  font-size: 0.8em;
  vertical-align: middle;
  transition: opacity 0.2s, color 0.2s;
}

.markdown-body .header-link:hover {
  color: var(--accent-color);
}

/* 悬浮按钮容器 - 垂直排列 */
.float-buttons {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 目录悬浮按钮 */
.toc-float-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--accent-color);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, background 0.2s;
}

.toc-float-button:hover {
  transform: scale(1.1);
  background: var(--accent-hover);
}

/* curl 转 Python 悬浮按钮 */
.curl-float-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--accent-color);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, background 0.2s;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.curl-float-button:hover {
  transform: scale(1.1);
  background: var(--accent-hover);
}

.curl-text {
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.3px;
}

/* 回到顶部悬浮按钮 */
.back-to-top-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--accent-color);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, background 0.2s;
}

.back-to-top-button:hover {
  transform: scale(1.1);
  background: var(--accent-hover);
}

.back-to-top-icon {
  font-size: 20px;
  line-height: 1;
  font-weight: bold;
}

/* 导出 HTML 悬浮按钮 */
.export-float-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--accent-color);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, background 0.2s;
  position: relative;
}

.export-float-button:hover {
  transform: scale(1.1);
  background: var(--accent-hover);
}

.export-icon-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 100%;
  height: 100%;
}

.export-icon {
  font-size: 16px;
  line-height: 1;
}

.export-text {
  font-size: 9px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.3px;
}

/* Tooltip 样式 */
.tooltip {
  position: absolute;
  z-index: 1002;
  padding: 6px 12px;
  background: #262626;
  color: rgba(255, 255, 255, 0.85);
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.tooltip::before {
  content: '';
  position: absolute;
  width: 0;
  height: 0;
  border: 5px solid transparent;
}

.tooltip.show {
  opacity: 1;
}

/* Tooltip 位置 - 左侧 */
.tooltip.left {
  right: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip.left::before {
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  border-left-color: #262626;
}

/* 暗色主题下的 tooltip */
.dark-theme .tooltip {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.dark-theme .tooltip.left::before {
  border-left-color: var(--bg-tertiary);
}
`;

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(file.name)}</title>
  ${faviconLink}
  <!-- Highlight.js 样式 -->
  ${highlightStyles}
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      background: #fff;
    }

    ${allStyles}
    ${markdownStyles}
  </style>
</head>
<body>
  <div class="main-container">
    <!-- 左侧目录侧边栏 -->
    ${tocHTML}
    
    <!-- 中间内容区 -->
    <div class="content-area">
      <div class="content-header">
        <div class="breadcrumb">
          <span>${escapeHtml(file.name)}</span>
        </div>
      </div>
      <div class="markdown-content-wrapper">
        <div class="markdown-content">
          <div class="markdown-body-wrapper">
            <div class="markdown-body">
              ${content}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 悬浮按钮组 - 垂直排列 -->
    <div class="float-buttons">
      <!-- 目录悬浮按钮 -->
      <button class="toc-float-button" id="toc-toggle-btn" data-tooltip="显示/隐藏目录">
        <span style="font-size: 20px;">☰</span>
        <span class="tooltip left">显示/隐藏目录</span>
      </button>

      <!-- curl 转 Python 悬浮按钮 -->
      <button class="curl-float-button" id="curl-to-python-btn" data-tooltip="curl 转 Python">
        <span class="curl-text">curl</span>
        <span class="tooltip left">curl 转 Python</span>
      </button>

      <!-- 回到顶部悬浮按钮 -->
      <button class="back-to-top-button" id="back-to-top-btn" data-tooltip="回到顶部">
        <span class="back-to-top-icon">↑</span>
        <span class="tooltip left">回到顶部</span>
      </button>
    </div>
  </div>
  <script>
    // 代码复制功能（直接使用降级方案，避免权限策略警告）
    // document.execCommand('copy') 在大多数情况下都能正常工作，且不会触发权限策略警告
    function copyToClipboard(text) {
      return fallbackCopyToClipboard(text);
    }
    
    // 降级复制方案：使用 document.execCommand
    function fallbackCopyToClipboard(text) {
      return new Promise((resolve, reject) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          if (successful) {
            resolve();
          } else {
            reject(new Error('execCommand 复制失败'));
          }
        } catch (err) {
          document.body.removeChild(textArea);
          reject(err);
        }
      });
    }
    
    // 为所有换行按钮绑定事件
    document.querySelectorAll('.wrap-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const pre = this.closest('.code-block-wrapper').querySelector('pre');
        if (!pre) return;
        
        const isWrapped = pre.classList.toggle('code-wrapped');
        this.innerHTML = isWrapped ? '↪ 取消换行' : '↩ 换行';
        this.classList.toggle('wrapped', isWrapped);
      });
    });
    
    // 为所有复制按钮绑定事件
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const code = this.closest('.code-block-wrapper').querySelector('code');
        if (!code) return;
        
        const originalText = this.innerHTML;
        copyToClipboard(code.textContent).then(() => {
          this.innerHTML = '✅ 已复制';
          this.classList.add('copied');
          setTimeout(() => {
            this.innerHTML = originalText;
            this.classList.remove('copied');
          }, 2000);
        }).catch(err => {
          console.error('复制失败:', err);
          // 如果都失败了，尝试提示用户手动选择复制
          const textArea = document.createElement('textarea');
          textArea.value = code.textContent;
          textArea.style.position = 'fixed';
          textArea.style.left = '50%';
          textArea.style.top = '50%';
          textArea.style.transform = 'translate(-50%, -50%)';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
            this.innerHTML = '✅ 已复制';
            this.classList.add('copied');
            setTimeout(() => {
              this.innerHTML = originalText;
              this.classList.remove('copied');
            }, 2000);
          } catch (e) {
            alert('复制失败，请手动选择文本复制');
          }
          document.body.removeChild(textArea);
        });
      });
    });
    
    // 目录点击跳转
    document.querySelectorAll('.toc-link').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const id = this.getAttribute('href').substring(1);
        const element = document.getElementById(id);
        if (element) {
        const markdownContentForScroll = document.querySelector('.markdown-content');
        const containerRect = markdownContentForScroll.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const offset = elementRect.top - containerRect.top + markdownContentForScroll.scrollTop - 100;
        
        markdownContentForScroll.scrollTo({
            top: offset,
            behavior: 'smooth'
          });
          
          // 更新活动状态
          document.querySelectorAll('.toc-link').forEach(a => a.classList.remove('active'));
          this.classList.add('active');
        }
      });
    });
    
    // 滚动时高亮目录（与预览效果一致）
    const markdownContentForToc = document.querySelector('.markdown-content');
    if (markdownContentForToc) {
      const updateTocHighlight = () => {
        const headings = markdownContentForToc.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const links = document.querySelectorAll('.toc-link');
        
        if (headings.length === 0 || links.length === 0) return;
        
        let activeId = null;
        const containerRect = markdownContentForToc.getBoundingClientRect();
        const offset = 100;
        
        // 从下往上找第一个进入视口的标题
        for (let i = headings.length - 1; i >= 0; i--) {
          const heading = headings[i];
          const rect = heading.getBoundingClientRect();
          
          if (rect.top <= containerRect.top + offset) {
            activeId = heading.id;
            break;
          }
        }
        
        // 如果没有找到，使用第一个标题
        if (!activeId && headings.length > 0) {
          activeId = headings[0].id;
        }
        
        links.forEach(link => {
          const href = link.getAttribute('href').substring(1);
          link.classList.toggle('active', href === activeId);
        });
      };
      
      markdownContentForToc.addEventListener('scroll', updateTocHighlight, { passive: true });
      updateTocHighlight(); // 初始触发
      
      // 延迟触发一次，确保 DOM 完全渲染
      setTimeout(updateTocHighlight, 100);
    }
    
    // Tooltip 功能
    function initTooltips() {
      const buttons = document.querySelectorAll('[data-tooltip]');
      buttons.forEach(button => {
        const tooltip = button.querySelector('.tooltip');
        if (!tooltip) return;
        
        let hideTimeout;
        
        button.addEventListener('mouseenter', function() {
          clearTimeout(hideTimeout);
          tooltip.classList.add('show');
        });
        
        button.addEventListener('mouseleave', function() {
          hideTimeout = setTimeout(() => {
            tooltip.classList.remove('show');
          }, 100);
        });
      });
    }
    
    // 初始化 tooltip
    initTooltips();
    
    // 目录切换功能
    const tocToggleBtn = document.getElementById('toc-toggle-btn');
    const tocSidebar = document.querySelector('.toc-sidebar');
    if (tocToggleBtn && tocSidebar) {
      let tocVisible = true;
      tocToggleBtn.addEventListener('click', function() {
        tocVisible = !tocVisible;
        if (tocVisible) {
          tocSidebar.style.display = 'flex';
        } else {
          tocSidebar.style.display = 'none';
        }
      });
    }
    
    // curl 转 Python 功能
    const curlToPythonBtn = document.getElementById('curl-to-python-btn');
    if (curlToPythonBtn) {
      curlToPythonBtn.addEventListener('click', function() {
        window.open('https://tool.uuhc.top/tools/curl-to-python', '_blank');
      });
    }
    
    // 回到顶部功能
    const backToTopBtn = document.getElementById('back-to-top-btn');
    const markdownContentForBackToTop = document.querySelector('.markdown-content');
    if (backToTopBtn && markdownContentForBackToTop) {
      backToTopBtn.addEventListener('click', function() {
        markdownContentForBackToTop.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
      
      // 滚动时显示/隐藏回到顶部按钮
      let isScrolling = false;
      markdownContentForBackToTop.addEventListener('scroll', function() {
        if (!isScrolling) {
          window.requestAnimationFrame(function() {
            if (markdownContentForBackToTop.scrollTop > 300) {
              backToTopBtn.style.display = 'flex';
            } else {
              backToTopBtn.style.display = 'flex'; // 始终显示
            }
            isScrolling = false;
          });
          isScrolling = true;
        }
      });
    }
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.replace(/\.md$/, '.html');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  return {
    exportToHTML,
  };
}
