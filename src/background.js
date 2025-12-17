// Background Script - 监听 file:// 协议的 markdown 文件
// 默认使用 content script 注入（保持 file:// 地址）
// 可以通过配置选择是否重定向到扩展页面

// 获取配置：是否使用重定向模式（false = 使用 content script，true = 重定向到扩展页面）
async function shouldRedirect() {
  const result = await chrome.storage.local.get(['useRedirectMode']);
  return result.useRedirectMode === true;
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 只处理完全加载的标签页
  if (changeInfo.status !== 'complete') {
    return;
  }

  // 检查是否是 file:// 协议的 markdown 文件
  if (tab.url && tab.url.startsWith('file://')) {
    const url = new URL(tab.url);
    const pathname = decodeURIComponent(url.pathname).toLowerCase();
    
    // 检查是否是 markdown 文件
    if (pathname.endsWith('.md') || pathname.endsWith('.markdown')) {
      // 如果配置为重定向模式，则重定向到扩展页面
      // 否则让 content script 处理（保持 file:// 地址）
      if (await shouldRedirect()) {
        handleMarkdownFile(tab.url, tabId);
      }
      // 如果不重定向，content script 会自动处理
    }
  }
});

// 处理 markdown 文件
async function handleMarkdownFile(fileUrl, tabId) {
  try {
    // 使用 fetch 读取文件内容
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error('无法读取文件');
    }
    
    const content = await response.text();
    
    // 提取文件名
    const url = new URL(fileUrl);
    const fileName = decodeURIComponent(url.pathname.split('/').pop() || 'untitled.md');
    
    // 创建文件数据对象
    const fileData = {
      id: Date.now(),
      name: fileName,
      content: content,
      lastModified: Date.now(),
      url: fileUrl,
      isAutoPreview: true,
    };
    
    // 保存到 storage
    await chrome.storage.local.set({ 
      autoPreviewFile: fileData,
      autoPreviewMode: true,
    });
    
    // 打开预览页面（替换当前标签页）
    chrome.tabs.update(tabId, {
      url: chrome.runtime.getURL('viewer.html?auto=true'),
    });
    
  } catch (error) {
    console.error('读取文件失败:', error);
    // 如果读取失败，仍然打开预览页面，但显示错误信息
    await chrome.storage.local.set({ 
      autoPreviewError: error.message,
      autoPreviewMode: true,
    });
    chrome.tabs.update(tabId, {
      url: chrome.runtime.getURL('viewer.html?auto=true&error=true'),
    });
  }
}

// 监听来自 content script 的消息，用于读取 file:// 文件内容
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'readFile') {
    console.log('Background: 收到读取文件请求:', request.fileUrl);
    // 在 background script 中读取文件（有权限）
    fetch(request.fileUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.text();
      })
      .then(content => {
        console.log('Background: 文件读取成功，内容长度:', content?.length || 0);
        sendResponse({ success: true, content: content });
      })
      .catch(error => {
        console.error('Background: 读取文件失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // 返回 true 表示异步响应
    return true;
  }
  
  // 如果消息不匹配，返回 false 表示同步响应（或不响应）
  return false;
});
