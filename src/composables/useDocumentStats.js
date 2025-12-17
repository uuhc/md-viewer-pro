import { computed } from 'vue';

export function useDocumentStats(content) {
  // 计算统计信息
  const stats = computed(() => {
    const text = typeof content === 'function' ? content() : (content?.value || content || '');
    
    if (!text || text.trim().length === 0) {
      return {
        words: 0,
        characters: 0,
        readingTime: 0,
      };
    }
    
    // 移除 Markdown 语法标记（更精确的处理）
    let plainText = text
      // 先移除代码块（包括多行代码块）
      .replace(/```[\s\S]*?```/g, '')
      // 移除行内代码
      .replace(/`[^`]+`/g, '')
      // 移除图片
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
      // 移除链接，但保留链接文本
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // 移除标题标记
      .replace(/^#+\s+/gm, '')
      // 移除粗体和斜体标记
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // 移除删除线
      .replace(/~~([^~]+)~~/g, '$1')
      // 移除列表标记
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      // 移除引用标记
      .replace(/^>\s+/gm, '')
      // 移除水平线
      .replace(/^[-*_]{3,}$/gm, '')
      // 移除表格标记
      .replace(/\|/g, ' ')
      // 移除多余的空白行
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // 计算字符数（包括空格和换行）
    const characters = plainText.length;
    
    // 计算字数（中英文混合，更精确）
    // 中文按字符数计算
    const chineseChars = (plainText.match(/[\u4e00-\u9fa5]/g) || []).length;
    
    // 英文按单词数计算（更精确的单词分割）
    // 先移除所有中文字符，然后按空格、标点等分割
    const englishText = plainText.replace(/[\u4e00-\u9fa5]/g, ' ');
    // 按空格、换行、标点符号分割单词
    const englishWords = englishText
      .split(/[\s\n\r\t\.,;:!?()[\]{}'"`\-_=+<>\/\\|~@#$%^&*]+/)
      .filter(word => word.length > 0 && /[a-zA-Z0-9]/.test(word))
      .length;
    
    // 数字单独计算（如果数字前后没有字母，算作一个"字"）
    const standaloneNumbers = (plainText.match(/\b\d+\b/g) || []).length;
    
    // 总字数 = 中文字符数 + 英文单词数 + 独立数字
    const words = chineseChars + englishWords + standaloneNumbers;
    
    // 计算阅读时间
    // 中文阅读速度：每分钟约 300-500 字，这里取 400 字/分钟
    // 英文阅读速度：每分钟约 200-250 词，这里取 225 词/分钟
    // 混合计算：假设中文和英文各占一定比例
    const chineseReadingTime = chineseChars / 400;
    const englishReadingTime = englishWords / 225;
    // 总阅读时间（分钟），至少 1 分钟
    const readingTime = Math.max(1, Math.ceil(chineseReadingTime + englishReadingTime));

    return {
      words,
      characters,
      readingTime,
    };
  });

  return {
    stats,
  };
}

