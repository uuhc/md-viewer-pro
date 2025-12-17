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

  // 读取文件内容
  async function loadFileContent() {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('无法读取文件');
      }
      return await response.text();
    } catch (error) {
      console.error('读取文件失败:', error);
      return null;
    }
  }

  // 创建预览界面
  async function createPreview() {
    const content = await loadFileContent();
    if (!content) {
      return;
    }

    // 提取文件名
    const fileName = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'untitled.md');

    // 创建文件数据对象
    const fileData = {
      id: Date.now(),
      name: fileName,
      content: content,
      lastModified: Date.now(),
      url: url,
      isAutoPreview: true,
    };

    // 保存到 storage
    await chrome.storage.local.set({
      autoPreviewFile: fileData,
      autoPreviewMode: true,
    });

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
    iframe.src = chrome.runtime.getURL('viewer.html?auto=true');
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
    `;

    wrapper.appendChild(iframe);
    document.body.appendChild(wrapper);

    // 隐藏原始内容
    if (document.body) {
      document.body.style.overflow = 'hidden';
    }
  }

  // 等待页面加载完成后创建预览
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createPreview);
  } else {
    createPreview();
  }
})();

