<template>
  <div class="markdown-content" ref="contentRef">
    <div class="markdown-body-wrapper">
      <div v-html="renderedContent" class="markdown-body"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick, onUnmounted } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';
import mermaid from 'mermaid';
import { globalThemeState, onThemeChange } from '../composables/useTheme';

const props = defineProps({
  content: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['toc-updated']);

const contentRef = ref(null);
const renderedContent = ref('');
let styleLink = null;
let themeObserver = null;
let themeUnsubscribe = null;
let mermaidInitialized = false;

// 初始化 Mermaid
const initMermaid = (isDark) => {
  const theme = isDark ? 'dark' : 'default';

  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme,
      securityLevel: 'loose',
      fontFamily: 'inherit',
    });
    mermaidInitialized = true;
  } catch (err) {
    console.warn('Mermaid 初始化失败:', err);
  }
};

// 更新 Mermaid 主题
const updateMermaidTheme = (isDark) => {
  const theme = isDark ? 'dark' : 'default';
  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme,
      securityLevel: 'loose',
      fontFamily: 'inherit',
    });
    // 重新渲染所有 Mermaid 图表
    renderAllMermaidDiagrams();
  } catch (err) {
    console.warn('Mermaid 主题更新失败:', err);
  }
};

// 根据主题加载对应的 highlight.js 样式
const loadHighlightStyle = (isDark) => {
  // 移除旧的样式
  if (styleLink) {
    styleLink.remove();
    styleLink = null;
  }

  // 创建新的样式链接
  styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.id = 'highlight-style';
  // 使用 CDN，稳定可靠
  styleLink.href = isDark
    ? 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github-dark.min.css'
    : 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css';

  // 添加加载失败的处理
  styleLink.onerror = () => {
    console.warn('代码高亮样式加载失败，使用内联样式');
    // 如果 CDN 加载失败，依赖内联的 CSS 样式
  };

  document.head.appendChild(styleLink);
};

// 初始化样式
const initHighlightStyle = () => {
  const isDark = globalThemeState.isDark;
  loadHighlightStyle(isDark);
};

// 监听主题变化（使用全局主题状态）
const observeThemeChange = () => {
  // 使用全局主题状态监听器
  themeUnsubscribe = onThemeChange((_newTheme, isDark) => {
    loadHighlightStyle(isDark);
    // 更新 Mermaid 主题
    updateMermaidTheme(isDark);
    // 重新应用内联样式以确保颜色正确
    nextTick(() => {
      setTimeout(() => {
        applyInlineStyles();
      }, 100);
    });
  });
  
  // 同时保留 DOM 监听作为备用
  const observer = new MutationObserver(() => {
    const isDark = document.documentElement.classList.contains('dark-theme');
    if (isDark !== globalThemeState.isDark) {
      // 如果 DOM 状态与全局状态不一致，同步全局状态
      globalThemeState.isDark = isDark;
      globalThemeState.currentTheme = isDark ? 'dark' : 'light';
    }
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });
  
  return observer;
};

// 配置 marked 使用 highlight.js 进行代码高亮
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: true,
  mangle: false,
  highlight: function(code, lang) {
    // 如果没有语言标识，使用纯文本
    if (!lang || lang === '') {
      // 使用 highlight 自动检测
      try {
        const result = hljs.highlightAuto(code);
        return result.value;
      } catch (err) {
        return `<code class="hljs">${code}</code>`;
      }
    }

    // 检查语言是否支持
    if (hljs.getLanguage(lang)) {
      try {
        const result = hljs.highlight(code, { language: lang });
        return result.value;
      } catch (err) {
        console.warn(`代码高亮失败 (${lang}):`, err);
      }
    }

    // 如果高亮失败，尝试自动检测
    try {
      const result = hljs.highlightAuto(code);
      return result.value;
    } catch (err) {
      return `<code class="hljs">${code}</code>`;
    }
  },
});

// 渲染 Mermaid 图表
const renderMermaidDiagrams = async () => {
  if (!contentRef.value || !mermaidInitialized) return;

  const mermaidBlocks = contentRef.value.querySelectorAll('pre code.language-mermaid');

  if (mermaidBlocks.length === 0) return;

  for (const block of mermaidBlocks) {
    const pre = block.parentElement;
    const code = block.textContent.trim();

    // 跳过空的代码块
    if (!code) continue;

    // 生成唯一 ID
    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // 使用 Mermaid API 渲染
      const { svg } = await mermaid.render(id, code);

      // 创建容器替换原有的代码块
      const wrapper = document.createElement('div');
      wrapper.className = 'mermaid-diagram';
      wrapper.innerHTML = svg;

      // 替换整个 pre 元素
      pre.replaceWith(wrapper);
    } catch (err) {
      console.warn('Mermaid 渲染失败:', err);
      // 渲染失败时保留原始代码块
      block.parentElement.classList.add('mermaid-error');
    }
  }
};

// 重新渲染所有 Mermaid 图表（用于主题切换）
const renderAllMermaidDiagrams = async () => {
  if (!contentRef.value) return;

  const mermaidDiagrams = contentRef.value.querySelectorAll('.mermaid-diagram');

  for (const diagram of mermaidDiagrams) {
    const svg = diagram.querySelector('svg');
    if (!svg) continue;

    // 获取原始代码（存储在 data 属性中）
    const code = diagram.getAttribute('data-mermaid-code');
    if (!code) continue;

    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const { svg: newSvg } = await mermaid.render(id, code);
      diagram.innerHTML = newSvg;
    } catch (err) {
      console.warn('Mermaid 重新渲染失败:', err);
    }
  }
};

const renderMarkdown = (content) => {
  if (!content) {
    renderedContent.value = '<div class="welcome-screen"><h1>Markdown Viewer</h1><p>文件内容为空</p></div>';
    return;
  }

  const html = marked.parse(content);
  renderedContent.value = html;

  nextTick(() => {
    processCodeBlocks();
    addHeadingIds();
    generateTOC();
    setupScrollListener();
    renderMermaidDiagrams();

    // 额外延迟，确保高亮样式完全应用
    setTimeout(() => {
      applyInlineStyles();
    }, 100);
  });
};

// 应用内联样式增强高亮效果（使用 CSS 变量）
const applyInlineStyles = () => {
  if (!contentRef.value) return;

  // 获取所有代码块，包括没有 hljs 类的
  const codeElements = contentRef.value.querySelectorAll('pre code');
  const isDark = globalThemeState.isDark;

  // 从 CSS 变量获取颜色，确保与主题一致
  const root = document.documentElement;
  const getCSSVar = (varName) => {
    return getComputedStyle(root).getPropertyValue(varName).trim();
  };

  // 根据主题选择颜色方案（使用 CSS 变量）
  const colors = isDark ? {
    keyword: getCSSVar('--hl-keyword') || '#ff7b72',
    string: getCSSVar('--hl-string') || '#a5d6ff',
    number: getCSSVar('--hl-number') || '#79c0ff',
    comment: getCSSVar('--hl-comment') || '#8b949e',
    function: getCSSVar('--hl-function') || '#d2a8ff',
    operator: getCSSVar('--hl-operator') || '#ff7b72',
    className: getCSSVar('--hl-class') || '#ff7b72',
    tag: getCSSVar('--hl-tag') || '#7ee787',
    attribute: getCSSVar('--hl-attribute') || '#79c0ff',
    property: getCSSVar('--hl-property') || '#79c0ff',
    punctuation: getCSSVar('--hl-punctuation') || '#c9d1d9',
    variable: getCSSVar('--hl-variable') || '#ffa657'
  } : {
    keyword: getCSSVar('--hl-keyword') || '#d73a49',
    string: getCSSVar('--hl-string') || '#032f62',
    number: getCSSVar('--hl-number') || '#005cc5',
    comment: getCSSVar('--hl-comment') || '#6a737d',
    function: getCSSVar('--hl-function') || '#6f42c1',
    operator: getCSSVar('--hl-operator') || '#d73a49',
    className: getCSSVar('--hl-class') || '#d73a49',
    tag: getCSSVar('--hl-tag') || '#22863a',
    attribute: getCSSVar('--hl-attribute') || '#6f42c1',
    property: getCSSVar('--hl-property') || '#005cc5',
    punctuation: getCSSVar('--hl-punctuation') || '#24292e',
    variable: getCSSVar('--hl-variable') || '#e36209'
  };

  codeElements.forEach((code) => {
    // 确保 code 元素有 hljs 类
    if (!code.classList.contains('hljs')) {
      code.classList.add('hljs');
    }

    const spans = code.querySelectorAll('span[class*="hljs-"]');
    spans.forEach(span => {
      // 只对没有内联样式的元素添加
      if (!span.style.color) {
        const className = span.className;

        // 使用具体的颜色值而不是 CSS 变量
        if (className.includes('hljs-keyword') || className.includes('hljs-selector-tag')) {
          span.style.color = colors.keyword;
          span.style.fontWeight = 'bold';
        } else if (className.includes('hljs-string')) {
          span.style.color = colors.string;
        } else if (className.includes('hljs-number')) {
          span.style.color = colors.number;
        } else if (className.includes('hljs-comment')) {
          span.style.color = colors.comment;
          span.style.fontStyle = 'italic';
        } else if (className.includes('hljs-function')) {
          span.style.color = colors.function;
        } else if (className.includes('hljs-title')) {
          span.style.color = colors.function;
          span.style.fontWeight = 'bold';
        } else if (className.includes('hljs-class')) {
          span.style.color = colors.className;
          span.style.fontWeight = 'bold';
        } else if (className.includes('hljs-tag')) {
          span.style.color = colors.tag;
        } else if (className.includes('hljs-attribute')) {
          span.style.color = colors.attribute;
        } else if (className.includes('hljs-property')) {
          span.style.color = colors.property;
        } else if (className.includes('hljs-operator')) {
          span.style.color = colors.operator;
        } else if (className.includes('hljs-punctuation')) {
          span.style.color = colors.punctuation;
        } else if (className.includes('hljs-variable')) {
          span.style.color = colors.variable;
        } else if (className.includes('hljs-literal')) {
          span.style.color = colors.number;
        } else if (className.includes('hljs-built_in')) {
          span.style.color = colors.function;
        } else if (className.includes('hljs-meta')) {
          span.style.color = colors.tag;
        } else if (className.includes('hljs-selector-pseudo')) {
          span.style.color = colors.keyword;
        } else if (className.includes('hljs-regexp')) {
          span.style.color = colors.function;
        } else if (className.includes('hljs-link')) {
          span.style.color = colors.function;
          span.style.textDecoration = 'underline';
        } else if (className.includes('hljs-subst')) {
          span.style.color = colors.keyword;
          span.style.fontWeight = 'bold';
        } else if (className.includes('hljs-type')) {
          span.style.color = colors.className;
          span.style.fontWeight = 'bold';
        } else if (className.includes('hljs-doctag')) {
          span.style.color = colors.string;
        } else if (className.includes('hljs-template-variable')) {
          span.style.color = colors.number;
        } else if (className.includes('hljs-variable.language_')) {
          span.style.color = colors.variable;
        } else if (className.includes('hljs-tag .hljs-attr')) {
          span.style.color = colors.number;
        } else if (className.includes('hljs-addition')) {
          span.style.color = colors.punctuation;
        } else if (className.includes('hljs-deletion')) {
          span.style.color = colors.keyword;
        } else if (className.includes('hljs-symbol')) {
          span.style.color = colors.function;
        } else if (className.includes('hljs-emphasis')) {
          span.style.fontStyle = 'italic';
        } else if (className.includes('hljs-strong')) {
          span.style.fontWeight = 'bold';
        }
      }
    });
  });
};

const processCodeBlocks = () => {
  if (!contentRef.value) return;

  const codeBlocks = contentRef.value.querySelectorAll('pre code');

  codeBlocks.forEach((code) => {
    const pre = code.parentElement;
    if (pre.tagName === 'PRE') {
      // 如果已经有包装器，跳过
      if (pre.parentElement.classList.contains('code-block-wrapper')) {
        return;
      }

      // 确保代码有 hljs 类
      if (!code.classList.contains('hljs')) {
        code.classList.add('hljs');
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      const header = document.createElement('div');
      header.className = 'code-block-header';

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

      // 显示语言标签
      const langLabel = document.createElement('span');
      langLabel.textContent = lang;
      header.appendChild(langLabel);

      // 按钮容器
      const btnContainer = document.createElement('div');
      btnContainer.className = 'code-btn-container';

      // 换行/取消换行按钮
      const wrapBtn = document.createElement('button');
      wrapBtn.className = 'wrap-btn';
      wrapBtn.innerHTML = '↩ 换行';
      wrapBtn.addEventListener('click', () => toggleWrap(pre, wrapBtn));
      btnContainer.appendChild(wrapBtn);

      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.innerHTML = '📋 复制';
      copyBtn.addEventListener('click', () => copyCode(code.textContent, copyBtn));
      btnContainer.appendChild(copyBtn);

      header.appendChild(btnContainer);

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
    }
  });
};

// 降级复制方案：使用 document.execCommand
const fallbackCopyToClipboard = (text) => {
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
};

const copyCode = (text, button) => {
  const originalText = button.innerHTML;
  
  // 直接使用降级方案，避免触发权限策略警告
  // document.execCommand('copy') 在大多数情况下都能正常工作，且不会触发权限策略警告
  fallbackCopyToClipboard(text).then(() => {
    button.innerHTML = '✅ 已复制';
    button.classList.add('copied');
    setTimeout(() => {
      button.innerHTML = originalText;
      button.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    alert('复制失败，请手动选择文本复制');
  });
};

// 切换代码换行
const toggleWrap = (pre, button) => {
  const isWrapped = pre.classList.toggle('code-wrapped');
  button.innerHTML = isWrapped ? '↪ 取消换行' : '↩ 换行';
  button.classList.toggle('wrapped', isWrapped);
};

const addHeadingIds = () => {
  if (!contentRef.value) return;

  const headings = contentRef.value.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach((heading, index) => {
    if (!heading.id) {
      const text = heading.textContent.trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-|-$/g, '') || `heading-${index}`;
      heading.id = id;
    }

    // 为每个标题添加 headerlink
    addHeaderLink(heading);
  });
};

// 添加 headerlink 功能
const addHeaderLink = (heading) => {
  // 如果已经有链接，先移除旧的
  const existingLink = heading.querySelector('.header-link');
  if (existingLink) {
    existingLink.remove();
  }

  // 保存原始文本（不包含链接）
  const originalText = Array.from(heading.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE || node.nodeName !== 'A')
    .map(node => node.textContent)
    .join('')
    .trim();

  // 创建链接图标
  const link = document.createElement('a');
  link.className = 'header-link';
  link.href = `#${heading.id}`;
  link.setAttribute('aria-label', '链接');
  link.innerHTML = '🔗';
  // 设置 data-original-text 属性，供目录生成时使用
  link.setAttribute('data-original-text', originalText);

  // 点击链接时更新目录高亮
  link.addEventListener('click', (e) => {
    e.preventDefault();

    // 滚动到标题位置
    heading.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    // 更新 URL hash
    window.history.pushState(null, null, `#${heading.id}`);

    // 触发目录更新高亮
    setTimeout(() => {
      // 模拟滚动事件以更新目录高亮
      const contentElement = contentRef.value;
      if (contentElement) {
        contentElement.dispatchEvent(new Event('scroll'));
      }
    }, 100);
  });

  // 将链接添加到标题的末尾
  heading.appendChild(link);
};

const generateTOC = () => {
  if (!contentRef.value) return;

  const headings = contentRef.value.querySelectorAll('h1, h2, h3, h4, h5, h6');

  if (headings.length === 0) {
    emit('toc-updated', []);
    return;
  }

  const tocItems = [];
  const stack = [];

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    const id = heading.id || `heading-${index}`;

    // 获取标题的原始文本，不包含链接图标
    let text = heading.textContent.trim();
    const headerLink = heading.querySelector('.header-link');
    if (headerLink) {
      const originalText = headerLink.getAttribute('data-original-text');
      if (originalText) {
        text = originalText;
      } else {
        // 如果没有保存的原始文本，手动过滤掉链接图标
        const tempText = heading.textContent.replace(/🔗\s*$/, '').trim();
        text = tempText;
      }
    }

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    const item = {
      level,
      text,
      id,
      children: [],
    };

    if (stack.length === 0) {
      tocItems.push(item);
    } else {
      stack[stack.length - 1].children.push(item);
    }

    stack.push(item);
  });

  emit('toc-updated', tocItems);
};

const setupScrollListener = () => {
  if (!contentRef.value) return;

  const handleScroll = () => {
    // 滚动高亮逻辑可以在 TableOfContents 组件中处理
  };

  contentRef.value.addEventListener('scroll', handleScroll);
};

watch(
  () => props.content,
  (newContent) => {
    renderMarkdown(newContent);
  },
  { immediate: true }
);

onMounted(() => {
  // 初始化代码高亮样式
  initHighlightStyle();
  // 初始化 Mermaid
  initMermaid(globalThemeState.isDark);
  // 监听主题变化
  themeObserver = observeThemeChange();

  if (props.content) {
    renderMarkdown(props.content);
  }
});

onUnmounted(() => {
  // 清理主题监听器
  if (themeObserver) {
    themeObserver.disconnect();
  }
  // 取消全局主题监听
  if (themeUnsubscribe) {
    themeUnsubscribe();
  }
  // 清理样式链接
  if (styleLink) {
    styleLink.remove();
  }
});
</script>

<style scoped>
/* 滚动容器占据全宽，滚动条在页面最右侧（目录的右侧） */
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

:deep(.markdown-body) {
  line-height: 1.8;
  color: var(--text-primary);
  transition: color 0.3s;
}

:deep(.markdown-body h1) {
  font-size: 32px;
  font-weight: 700;
  margin: 32px 0 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border-color);
  color: var(--text-primary);
  transition: color 0.3s, border-color 0.3s;
}

:deep(.markdown-body h2) {
  font-size: 24px;
  font-weight: 600;
  margin: 28px 0 12px;
  color: var(--text-primary);
  transition: color 0.3s;
}

:deep(.markdown-body h3) {
  font-size: 20px;
  font-weight: 600;
  margin: 24px 0 10px;
  color: var(--text-primary);
  transition: color 0.3s;
}

:deep(.markdown-body h4) {
  font-size: 16px;
  font-weight: 600;
  margin: 20px 0 8px;
  color: var(--text-primary);
  transition: color 0.3s;
}

:deep(.markdown-body h5),
:deep(.markdown-body h6) {
  font-size: 14px;
  font-weight: 600;
  margin: 16px 0 6px;
  color: var(--text-primary);
  transition: color 0.3s;
}

:deep(.markdown-body p) {
  margin: 12px 0;
}

:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  margin: 12px 0;
  padding-left: 24px;
}

:deep(.markdown-body li) {
  margin: 6px 0;
}

:deep(.markdown-body blockquote) {
  margin: 16px 0;
  padding: 12px 20px;
  border-left: 4px solid var(--blockquote-border);
  background: var(--blockquote-bg);
  border-radius: 4px;
  color: var(--text-secondary);
  transition: background-color 0.3s, border-color 0.3s, color 0.3s;
}

:deep(.markdown-body table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

:deep(.markdown-body table th),
:deep(.markdown-body table td) {
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  text-align: left;
  transition: border-color 0.3s;
}

:deep(.markdown-body table th) {
  background: var(--table-header-bg);
  font-weight: 600;
  transition: background-color 0.3s;
}

:deep(.markdown-body table tr:nth-child(even)) {
  background: var(--table-row-bg);
  transition: background-color 0.3s;
}

:deep(.markdown-body a) {
  color: var(--accent-color);
  text-decoration: none;
  transition: color 0.2s;
}

:deep(.markdown-body a:hover) {
  color: var(--accent-hover);
  text-decoration: underline;
}

:deep(.markdown-body img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 16px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.markdown-body code) {
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 0.9em;
  color: var(--code-text);
  transition: background-color 0.3s, border-color 0.3s, color 0.3s;
}

:deep(.code-block-wrapper) {
  position: relative;
  margin: 16px 0;
}

:deep(.code-block-header) {
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

:deep(.code-btn-container) {
  display: flex;
  gap: 8px;
  align-items: center;
}

:deep(.wrap-btn) {
  padding: 4px 12px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--code-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

:deep(.wrap-btn:hover) {
  background: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--accent-color);
}

:deep(.wrap-btn.wrapped) {
  background: var(--accent-color);
  color: var(--btn-text);
  border-color: var(--accent-color);
}

:deep(.copy-btn) {
  padding: 4px 12px;
  background: var(--accent-color);
  color: var(--btn-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s, color 0.2s;
}

:deep(.copy-btn:hover) {
  background: var(--accent-hover);
  color: var(--btn-text);
}

:deep(.copy-btn.copied) {
  background: var(--btn-success);
  color: var(--btn-text);
}

:deep(.code-block-wrapper pre) {
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

:deep(.code-block-wrapper pre.code-wrapped) {
  white-space: pre-wrap;
  word-wrap: break-word;
  word-break: break-all;
}

:deep(.code-block-wrapper pre.code-wrapped code) {
  white-space: pre-wrap;
  word-wrap: break-word;
  word-break: break-all;
}

:deep(.code-block-wrapper pre code) {
  background: transparent;
  border: none;
  padding: 0;
  color: inherit;
}

/* 确保代码高亮样式正确应用 */
:deep(pre code.hljs) {
  display: block;
  overflow-x: auto;
  padding: 0;
  background: transparent;
}

/* 重置代码高亮样式，确保不被其他样式覆盖 */
.markdown-content :deep(.hljs) {
  color: var(--text-primary) !important;
  background: var(--code-bg) !important;
}

/* Light 模式下的语法高亮 - 使用 CSS 变量 */
.markdown-content :deep(.hljs-comment),
.markdown-content :deep(.hljs-quote) {
  color: var(--hl-comment) !important;
  font-style: italic;
}

.markdown-content :deep(.hljs-keyword),
.markdown-content :deep(.hljs-selector-tag),
.markdown-content :deep(.hljs-subst) {
  color: var(--hl-keyword) !important;
  font-weight: bold;
}

.markdown-content :deep(.hljs-number),
.markdown-content :deep(.hljs-literal),
.markdown-content :deep(.hljs-variable),
.markdown-content :deep(.hljs-template-variable),
.markdown-content :deep(.hljs-tag .hljs-attr) {
  color: var(--hl-number) !important;
}

.markdown-content :deep(.hljs-string),
.markdown-content :deep(.hljs-doctag) {
  color: var(--hl-string) !important;
}

.markdown-content :deep(.hljs-title),
.markdown-content :deep(.hljs-section),
.markdown-content :deep(.hljs-selector-id) {
  color: var(--hl-function) !important;
  font-weight: bold;
}

.markdown-content :deep(.hljs-type),
.markdown-content :deep(.hljs-class .hljs-title) {
  color: var(--hl-function) !important;
}

.markdown-content :deep(.hljs-tag),
.markdown-content :deep(.hljs-name),
.markdown-content :deep(.hljs-attribute) {
  color: var(--hl-tag) !important;
}

.markdown-content :deep(.hljs-regexp),
.markdown-content :deep(.hljs-link) {
  color: var(--hl-variable) !important;
}

.markdown-content :deep(.hljs-symbol),
.markdown-content :deep(.hljs-bullet) {
  color: var(--hl-number) !important;
}

.markdown-content :deep(.hljs-built_in),
.markdown-content :deep(.hljs-builtin-name) {
  color: var(--hl-number) !important;
}

.markdown-content :deep(.hljs-meta) {
  color: var(--hl-tag) !important;
}

.markdown-content :deep(.hljs-deletion) {
  background: var(--hl-deletion-bg) !important;
}

.markdown-content :deep(.hljs-addition) {
  background: var(--hl-addition-bg) !important;
}

.markdown-content :deep(.hljs-emphasis) {
  font-style: italic !important;
}

.markdown-content :deep(.hljs-strong) {
  font-weight: bold !important;
}

.markdown-content :deep(.hljs-variable.language_) {
  color: var(--hl-variable) !important;
}

/* Dark 模式下的语法高亮 - 使用 CSS 变量 */
.dark-theme .markdown-content :deep(.hljs-comment),
.dark-theme .markdown-content :deep(.hljs-quote) {
  color: var(--hl-comment) !important;
  font-style: italic;
}

.dark-theme .markdown-content :deep(.hljs-keyword),
.dark-theme .markdown-content :deep(.hljs-selector-tag),
.dark-theme .markdown-content :deep(.hljs-subst) {
  color: var(--hl-keyword) !important;
  font-weight: bold;
}

.dark-theme .markdown-content :deep(.hljs-number),
.dark-theme .markdown-content :deep(.hljs-literal),
.dark-theme .markdown-content :deep(.hljs-variable),
.dark-theme .markdown-content :deep(.hljs-template-variable),
.dark-theme .markdown-content :deep(.hljs-tag .hljs-attr) {
  color: var(--hl-number) !important;
}

.dark-theme .markdown-content :deep(.hljs-string),
.dark-theme .markdown-content :deep(.hljs-doctag) {
  color: var(--hl-string) !important;
}

.dark-theme .markdown-content :deep(.hljs-title),
.dark-theme .markdown-content :deep(.hljs-section),
.dark-theme .markdown-content :deep(.hljs-selector-id) {
  color: var(--hl-function) !important;
  font-weight: bold;
}

.dark-theme .markdown-content :deep(.hljs-type),
.dark-theme .markdown-content :deep(.hljs-class .hljs-title) {
  color: var(--hl-function) !important;
}

.dark-theme .markdown-content :deep(.hljs-tag),
.dark-theme .markdown-content :deep(.hljs-name),
.dark-theme .markdown-content :deep(.hljs-attribute) {
  color: var(--hl-tag) !important;
}

.dark-theme .markdown-content :deep(.hljs-regexp),
.dark-theme .markdown-content :deep(.hljs-link) {
  color: var(--hl-function) !important;
}

.dark-theme .markdown-content :deep(.hljs-symbol),
.dark-theme .markdown-content :deep(.hljs-bullet) {
  color: var(--hl-number) !important;
}

.dark-theme .markdown-content :deep(.hljs-built_in),
.dark-theme .markdown-content :deep(.hljs-builtin-name) {
  color: var(--hl-number) !important;
}

.dark-theme .markdown-content :deep(.hljs-meta) {
  color: var(--hl-tag) !important;
}

.dark-theme .markdown-content :deep(.hljs-deletion) {
  background: var(--hl-deletion-bg) !important;
}

.dark-theme .markdown-content :deep(.hljs-addition) {
  background: var(--hl-addition-bg) !important;
}

.dark-theme .markdown-content :deep(.hljs-variable.language_) {
  color: var(--hl-variable) !important;
}

/* 为代码块添加默认高亮样式（使用最高优先级） */
.markdown-content .markdown-body pre code.hljs,
.markdown-content pre code.hljs,
.markdown-content code.hljs {
  background: var(--code-bg) !important;
  color: var(--text-primary) !important;
  padding: 16px !important;
}

/* Dark 模式下代码块增强样式 - 使用 CSS 变量 */
.dark-theme .markdown-content pre code.hljs {
  background: var(--code-block-bg) !important;
  border: 1px solid var(--code-block-border) !important;
}

.dark-theme :deep(.code-block-wrapper) {
  background: var(--code-block-header-bg) !important;
}

.dark-theme :deep(.code-block-header) {
  background: var(--code-block-bg) !important;
  border: 1px solid var(--code-block-border) !important;
  border-bottom: none !important;
  color: var(--text-secondary) !important;
}

.dark-theme :deep(.copy-btn) {
  background: var(--btn-success) !important;
  color: var(--btn-text) !important;
  border: 1px solid var(--btn-success-hover) !important;
}

.dark-theme :deep(.copy-btn:hover) {
  background: var(--btn-success-hover) !important;
  border-color: var(--btn-success-hover) !important;
}

/* 为不同语言添加特定样式 - 使用 CSS 变量 */
.markdown-content :deep(.language-javascript .hljs-function),
.markdown-content :deep(.language-js .hljs-function) {
  color: var(--hl-function);
}

.markdown-content :deep(.language-python .hljs-keyword) {
  color: var(--hl-keyword);
  font-weight: bold;
}

/* Header Link 样式 */
:deep(.header-link) {
  display: inline-block;
  margin-left: 8px;
  color: var(--text-tertiary);
  text-decoration: none;
  font-size: 14px;
  opacity: 0;
  transition: all 0.2s ease;
  padding: 2px 4px;
  line-height: 1;
  vertical-align: middle;
  background: var(--bg-primary);
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

/* 悬浮在标题上时显示链接 */
:deep(.markdown-body h1:hover .header-link),
:deep(.markdown-body h2:hover .header-link),
:deep(.markdown-body h3:hover .header-link),
:deep(.markdown-body h4:hover .header-link),
:deep(.markdown-body h5:hover .header-link),
:deep(.markdown-body h6:hover .header-link) {
  opacity: 0.7;
}

:deep(.header-link:hover) {
  opacity: 1 !important;
  color: var(--accent-color);
  background: var(--bg-secondary);
  border-color: var(--accent-color);
  transform: scale(1.1);
}

/* 暗色主题下的样式调整 */
.dark-theme :deep(.header-link) {
  background: var(--bg-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.dark-theme :deep(.header-link:hover) {
  background: var(--bg-secondary);
}

/* Mermaid 图表样式 */
:deep(.mermaid-diagram) {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 24px 0;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  transition: background-color 0.3s, border-color 0.3s;
}

:deep(.mermaid-diagram svg) {
  max-width: 100%;
  height: auto;
}

/* Mermaid 渲染错误时的样式 */
:deep(.mermaid-error) {
  border: 1px solid #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
}

:deep(.mermaid-error::before) {
  content: '⚠️ Mermaid 渲染失败';
  display: block;
  padding: 8px 12px;
  color: #ff6b6b;
  font-weight: 600;
  font-size: 14px;
}
</style>

