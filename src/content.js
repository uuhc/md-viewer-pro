// Content Script - 在 file:// 页面上注入预览界面
// 这个脚本会在 file:// 协议的 markdown 文件页面上运行

(function() {
  'use strict';

  // 检查是否是 markdown 文件
  const url = window.location.href;
  if (!url.startsWith('file://')) {
    return;
  }

  const pathname = decodeURIComponent(new URL(url).pathname).toLowerCase();
  if (!pathname.endsWith('.md') && !pathname.endsWith('.markdown')) {
    return;
  }

  // 防止重复注入
  if (document.getElementById('markdown-viewer-wrapper')) {
    return;
  }

  // 创建预览界面
  async function createPreview() {
    // 创建 iframe 嵌入预览页面
    const wrapper = document.createElement('div');
    wrapper.id = 'markdown-viewer-wrapper';
    wrapper.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 999999;
      background: #fff;
    `;

    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL(`viewer.html?auto=true&file=${encodeURIComponent(url)}`);
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
    `;

    // 等待 iframe 加载完成
    iframe.onload = () => {
      console.log('预览界面加载完成');
    };

    iframe.onerror = (error) => {
      console.error('预览界面加载失败:', error);
    };

    wrapper.appendChild(iframe);
    
    // 确保 body 存在
    if (!document.body) {
      document.body = document.createElement('body');
      document.documentElement.appendChild(document.body);
    }
    
    document.body.appendChild(wrapper);

    // 隐藏原始内容
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    
    // 隐藏 html 元素的默认样式
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
  }

  // 等待页面加载完成后创建预览
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createPreview);
  } else {
    createPreview();
  }
})();

