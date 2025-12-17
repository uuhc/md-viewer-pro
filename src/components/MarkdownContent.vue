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
  document.head.appendChild(styleLink);
};

// 检测当前主题
const getCurrentTheme = () => {
  return document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light';
};

// 初始化样式
const initHighlightStyle = () => {
  const isDark = getCurrentTheme() === 'dark';
  loadHighlightStyle(isDark);
};

// 监听主题变化
const observeThemeChange = () => {
  const observer = new MutationObserver(() => {
    const isDark = getCurrentTheme() === 'dark';
    loadHighlightStyle(isDark);
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
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (err) {
        console.warn('代码高亮失败:', err);
      }
    }
    // 如果没有指定语言或语言不支持，尝试自动检测
    try {
      return hljs.highlightAuto(code).value;
    } catch (err) {
      return code;
    }
  },
});

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
  });
};

const processCodeBlocks = () => {
  if (!contentRef.value) return;

  const codeBlocks = contentRef.value.querySelectorAll('pre code');

  codeBlocks.forEach((code) => {
    const pre = code.parentElement;
    if (pre.tagName === 'PRE') {
      if (pre.parentElement.classList.contains('code-block-wrapper')) {
        return;
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      const header = document.createElement('div');
      header.className = 'code-block-header';

      const lang = code.className.replace('language-', '') || 'code';
      const langLabel = document.createElement('span');
      langLabel.textContent = lang;
      header.appendChild(langLabel);

      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.innerHTML = '📋 复制';
      copyBtn.addEventListener('click', () => copyCode(code.textContent, copyBtn));
      header.appendChild(copyBtn);

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
    }
  });
};

const copyCode = (text, button) => {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.innerHTML;
    button.innerHTML = '✅ 已复制';
    button.classList.add('copied');
    setTimeout(() => {
      button.innerHTML = originalText;
      button.classList.remove('copied');
    }, 2000);
  }).catch((err) => {
    console.error('复制失败:', err);
    alert('复制失败，请手动复制');
  });
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
  });
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
    const text = heading.textContent.trim();
    const id = heading.id || `heading-${index}`;

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
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 48px;
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

:deep(.copy-btn) {
  padding: 4px 12px;
  background: var(--accent-color);
  color: #ffffff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s, color 0.2s;
}

:deep(.copy-btn:hover) {
  background: var(--accent-hover);
  color: #ffffff;
}

:deep(.copy-btn.copied) {
  background: #52c41a;
  color: #ffffff;
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
</style>

