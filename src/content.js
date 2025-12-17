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

  // 读取文件内容 - 通过 background script 读取（避免 CORS 问题）
  async function loadFileContent() {
    try {
      console.log('开始读取文件:', url);
      // 通过消息传递请求 background script 读取文件
      const response = await chrome.runtime.sendMessage({
        action: 'readFile',
        fileUrl: url
      });
      
      if (!response) {
        throw new Error('Background script 未响应，请检查扩展是否正常运行');
      }
      
      if (response && response.success) {
        console.log('文件读取成功，内容长度:', response.content?.length || 0);
        return response.content;
      } else {
        throw new Error(response?.error || '无法读取文件');
      }
    } catch (error) {
      console.error('读取文件失败:', error);
      // 显示错误提示
      if (document.body) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #fff;
          padding: 20px;
          border: 2px solid #ff4d4f;
          border-radius: 8px;
          z-index: 1000000;
          max-width: 500px;
        `;
        errorDiv.innerHTML = `
          <h3 style="color: #ff4d4f; margin: 0 0 10px 0;">预览失败</h3>
          <p style="margin: 0; color: #666;">${error.message}</p>
        `;
        document.body.appendChild(errorDiv);
      }
      return null;
    }
  }

  // 创建预览界面
  async function createPreview() {
    const content = await loadFileContent();
    if (!content) {
      console.error('无法读取文件内容');
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

    // 先保存到 storage，确保数据已准备好
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

