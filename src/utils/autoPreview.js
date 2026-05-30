export const AUTO_PREVIEW_STORAGE_KEYS = [
  'autoPreviewFile',
  'autoPreviewMode',
  'autoPreviewError',
];

export function buildAutoPreviewUrl(fileUrl) {
  return `viewer.html?auto=true&file=${encodeURIComponent(fileUrl)}`;
}

export function getAutoPreviewFileUrl(search) {
  const params = new URLSearchParams(search);
  if (params.get('auto') !== 'true') {
    return null;
  }

  return params.get('file');
}

export function createAutoPreviewFile(fileUrl, content, now = Date.now()) {
  const url = new URL(fileUrl);
  const fileName = decodeURIComponent(url.pathname.split('/').pop() || 'untitled.md');

  return {
    id: now,
    name: fileName,
    content,
    lastModified: now,
    url: fileUrl,
    isAutoPreview: true,
  };
}

export async function readAutoPreviewFile(fileUrl, sendMessage = chrome.runtime.sendMessage) {
  const response = await sendMessage({
    action: 'readFile',
    fileUrl,
  });

  if (!response) {
    throw new Error('Background script 未响应，请检查扩展是否正常运行');
  }

  if (!response.success) {
    throw new Error(response.error || '无法读取文件');
  }

  return createAutoPreviewFile(fileUrl, response.content);
}
