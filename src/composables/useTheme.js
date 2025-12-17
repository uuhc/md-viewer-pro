import { ref, watch, reactive } from 'vue';

// 全局主题状态，可以在任何地方访问
export const globalThemeState = reactive({
  theme: 'light', // 'light' | 'dark' | 'auto'
  currentTheme: 'light', // 实际应用的主题 'light' | 'dark'
  isDark: false, // 便捷的布尔值，表示是否为暗色模式
});

// 主题变化事件监听器列表
const themeChangeListeners = new Set();

// 通知所有监听器主题已变化
const notifyThemeChange = (newTheme) => {
  globalThemeState.currentTheme = newTheme;
  globalThemeState.isDark = newTheme === 'dark';
  themeChangeListeners.forEach(listener => {
    try {
      listener(newTheme, globalThemeState.isDark);
    } catch (error) {
      console.error('主题变化监听器执行失败:', error);
    }
  });
};

// 注册主题变化监听器
export const onThemeChange = (listener) => {
  themeChangeListeners.add(listener);
  // 返回取消注册函数
  return () => {
    themeChangeListeners.delete(listener);
  };
};

export function useTheme() {
  const theme = ref('light'); // 'light' | 'dark' | 'auto'
  const currentTheme = ref('light'); // 实际应用的主题

  // 检测系统主题
  const getSystemTheme = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // 应用主题
  const applyTheme = (themeValue) => {
    const root = document.documentElement;

    if (themeValue === 'dark') {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
      currentTheme.value = 'dark';
      // 同步到全局状态
      globalThemeState.currentTheme = 'dark';
      globalThemeState.isDark = true;
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
      currentTheme.value = 'light';
      // 同步到全局状态
      globalThemeState.currentTheme = 'light';
      globalThemeState.isDark = false;
    }

    // 通知所有监听器
    notifyThemeChange(currentTheme.value);
  };

  // 切换主题
  const setTheme = async (newTheme) => {
    theme.value = newTheme;
    // 同步到全局状态
    globalThemeState.theme = newTheme;

    if (newTheme === 'auto') {
      const systemTheme = getSystemTheme();
      applyTheme(systemTheme);
    } else {
      applyTheme(newTheme);
    }

    // 保存到 storage
    try {
      await chrome.storage.local.set({ theme: newTheme });
    } catch (error) {
      console.error('保存主题失败:', error);
    }
  };

  // 循环切换主题
  const cycleTheme = async () => {
    const themes = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(theme.value);
    const nextIndex = (currentIndex + 1) % themes.length;
    await setTheme(themes[nextIndex]);
  };

  // 获取主题图标
  const getThemeIcon = () => {
    if (theme.value === 'light') return '☀️';
    if (theme.value === 'dark') return '🌙';
    return 'Auto';
  };

  // 获取主题提示
  const getThemeTooltip = () => {
    if (theme.value === 'light') return '当前：亮色模式，点击切换到暗色模式';
    if (theme.value === 'dark') return '当前：暗色模式，点击切换到自动模式';
    return '当前：自动模式，点击切换到亮色模式';
  };

  // 监听系统主题变化
  let mediaQuery = null;
  let systemThemeChangeHandler = null;

  const setupSystemThemeListener = () => {
    // 移除旧的监听器
    if (mediaQuery && systemThemeChangeHandler) {
      mediaQuery.removeEventListener('change', systemThemeChangeHandler);
    }

    // 只在 auto 模式下监听系统主题变化
    if (theme.value === 'auto') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      systemThemeChangeHandler = (e) => {
        if (theme.value === 'auto') {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      };
      mediaQuery.addEventListener('change', systemThemeChangeHandler);
    }
  };

  // 初始化主题
  const initTheme = async () => {
    // 从 storage 加载主题
    try {
      const result = await chrome.storage.local.get(['theme']);
      if (result.theme) {
        await setTheme(result.theme);
      } else {
        // 默认使用自动模式
        await setTheme('auto');
      }
    } catch (error) {
      console.error('加载主题失败:', error);
      applyTheme('light');
    }

    // 设置系统主题监听
    setupSystemThemeListener();

    // 确保全局状态已初始化
    globalThemeState.theme = theme.value;
    globalThemeState.currentTheme = currentTheme.value;
    globalThemeState.isDark = currentTheme.value === 'dark';
  };

  // 监听主题变化，同步到系统主题变化
  watch(theme, (newTheme) => {
    if (newTheme === 'auto') {
      const systemTheme = getSystemTheme();
      applyTheme(systemTheme);
    }
    // 重新设置系统主题监听器
    setupSystemThemeListener();
  });

  return {
    theme,
    currentTheme,
    setTheme,
    cycleTheme,
    getThemeIcon,
    getThemeTooltip,
    initTheme,
    // 导出全局状态访问
    globalThemeState,
  };
}

