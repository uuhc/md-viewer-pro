export function useExport() {
  const exportToHTML = (file, tocItems = [], currentTheme = 'light') => {
    if (!file) {
      return;
    }

    const contentElement = document.querySelector('.markdown-body');
    if (!contentElement) {
      alert('无法获取内容');
      return;
    }

    const content = contentElement.innerHTML;
    
    // 生成目录 HTML（与预览效果一致）
    const generateTocHTML = (items) => {
      if (items.length === 0) return '';
      
      const renderTocItems = (items, level = 0) => {
        return items.map(item => {
          const indent = level * 16;
          const children = item.children && item.children.length > 0 
            ? renderTocItems(item.children, level + 1) 
            : '';
          return `
            <li style="margin: 4px 0; padding-left: ${indent}px;">
              <a href="#${item.id}" class="toc-link" data-href="#${item.id}">
                ${escapeHtml(item.text)}
              </a>
              ${children ? `<ul style="list-style: none; padding: 0; margin: 0;">${children}</ul>` : ''}
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
      --code-bg: #1f1f1f;
      --code-border: #434343;
      --code-text: #ff7eb6;
      --blockquote-bg: #1f1f1f;
      --blockquote-border: #177ddc;
      --table-header-bg: #1f1f1f;
      --table-row-bg: #1f1f1f;
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
      --code-bg: #f5f5f5;
      --code-border: #e8e8e8;
      --code-text: #e83e8c;
      --blockquote-bg: #fafafa;
      --blockquote-border: #1890ff;
      --table-header-bg: #fafafa;
      --table-row-bg: #fafafa;
    `;

    // Markdown 内容专用样式（确保完整，与预览效果一致）
    const markdownStyles = `
/* CSS 变量定义 */
:root {
  ${themeVars}
}

/* 布局样式 - 与预览效果一致 */
body {
  display: flex;
  margin: 0;
  padding: 0;
  height: 100vh;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s, color 0.3s;
}

/* 目录侧边栏样式 - 右侧固定，与预览效果一致 */
.toc-sidebar {
  width: 280px;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 100;
  transition: background-color 0.3s, border-color 0.3s;
}

.toc-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
  transition: background-color 0.3s, border-color 0.3s;
}

.toc-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s;
}

.toc-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 13px;
  display: block;
  padding: 4px 0;
  transition: color 0.2s;
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
  padding: 32px 48px;
  max-width: 900px;
  margin: 0 auto;
  margin-right: 280px;
  height: 100vh;
  overflow-y: auto;
  width: calc(100% - 280px);
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
  font-size: 14px;
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

.copy-btn {
  padding: 4px 12px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.copy-btn:hover {
  background: var(--accent-hover);
}

.copy-btn.copied {
  background: #52c41a;
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

.code-block-wrapper pre code {
  background: transparent;
  border: none;
  padding: 0;
  font-size: inherit;
  color: inherit;
}
`;

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(file.name)}</title>
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
  ${tocHTML}
  <div class="markdown-content">
    <div class="markdown-body">
      ${content}
    </div>
  </div>
  <script>
    // 代码复制功能
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const code = this.closest('.code-block-wrapper').querySelector('code');
        navigator.clipboard.writeText(code.textContent).then(() => {
          const originalText = this.innerHTML;
          this.innerHTML = '✅ 已复制';
          this.classList.add('copied');
          setTimeout(() => {
            this.innerHTML = originalText;
            this.classList.remove('copied');
          }, 2000);
        }).catch(err => {
          console.error('复制失败:', err);
          alert('复制失败，请手动复制');
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
          const markdownContent = document.querySelector('.markdown-content');
          const containerRect = markdownContent.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          const offset = elementRect.top - containerRect.top + markdownContent.scrollTop - 100;
          
          markdownContent.scrollTo({
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
    const markdownContent = document.querySelector('.markdown-content');
    if (markdownContent) {
      const updateTocHighlight = () => {
        const headings = markdownContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const links = document.querySelectorAll('.toc-link');
        
        if (headings.length === 0 || links.length === 0) return;
        
        let activeId = null;
        const containerRect = markdownContent.getBoundingClientRect();
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
      
      markdownContent.addEventListener('scroll', updateTocHighlight, { passive: true });
      updateTocHighlight(); // 初始触发
      
      // 延迟触发一次，确保 DOM 完全渲染
      setTimeout(updateTocHighlight, 100);
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

