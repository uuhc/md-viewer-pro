<template>
    <a-layout class="app-layout">
        <!-- 左侧目录侧边栏 -->
        <a-layout-sider v-model:collapsed="tocCollapsed" :width="280" :collapsed-width="0" collapsible :trigger="null"
            class="sidebar-left toc-sidebar">
            <TableOfContents :items="tocItems" />
        </a-layout-sider>

        <!-- 中间内容区 -->
        <a-layout-content class="content-area">
            <a-layout-header class="content-header">
                <div class="breadcrumb">
                    <span>{{ currentFile?.name || '未选择文件' }}</span>
                </div>
            </a-layout-header>
            <div class="markdown-content-wrapper">
                <MarkdownContent v-if="currentFile" :content="currentFile.content" @toc-updated="handleTocUpdated" />
                <div v-else class="welcome-screen">
                    <h1>Markdown Viewer</h1>
                    <p>请打开一个 Markdown 文件进行预览</p>
                </div>
            </div>
        </a-layout-content>

        <!-- 悬浮按钮组 - 垂直排列 -->
        <div class="float-buttons">
            <!-- 目录悬浮按钮 -->
            <a-tooltip placement="left" :title="tocDrawerOpen ? '隐藏目录' : '显示目录'">
                <a-button type="primary" shape="circle" :icon="h(MenuOutlined)" class="toc-float-button"
                    @click="toggleToc" />
            </a-tooltip>

            <!-- 主题切换悬浮按钮 - 已隐藏 -->
            <!-- <a-tooltip placement="left" :title="getThemeTooltip()">
        <a-button
          type="primary"
          shape="circle"
          class="theme-float-button"
          :class="{ 'theme-auto-button': getThemeIcon() === 'Auto' }"
          @click="cycleTheme"
        >
          <span class="theme-icon" :class="{ 'theme-auto-text': getThemeIcon() === 'Auto' }">{{ getThemeIcon() }}</span>
        </a-button>
      </a-tooltip> -->

            <!-- 导出 HTML 悬浮按钮 -->
            <a-tooltip placement="left" :title="currentFile ? '导出为 HTML 文件' : '请先选择文件'">
                <a-button type="primary" shape="circle" class="export-float-button" :disabled="!currentFile"
                    @click="handleExport">
                    <template #icon>
                        <span class="export-icon-wrapper">
                            <DownloadOutlined class="export-icon" />
                            <span class="export-text">HTML</span>
                        </span>
                    </template>
                </a-button>
            </a-tooltip>

            <!-- curl 转 Python 悬浮按钮 -->
            <a-tooltip placement="left" title="curl 转 Python">
                <a-button type="primary" shape="circle" class="curl-float-button" @click="handleCurlToPython">
                    <template #icon>
                        <span class="curl-icon-wrapper">
                            <span class="curl-text">curl</span>
                        </span>
                    </template>
                </a-button>
            </a-tooltip>

            <!-- 回到顶部悬浮按钮 -->
            <a-tooltip placement="left" title="回到顶部">
                <a-button type="primary" shape="circle" class="back-to-top-button" @click="handleBackToTop">
                    <template #icon>
                        <span class="back-to-top-icon">↑</span>
                    </template>
                </a-button>
            </a-tooltip>
        </div>

        <!-- 底部文档统计信息 -->
        <div v-if="currentFile && stats.words > 0" class="document-stats">
            <span class="stat-item">{{ formatNumber(stats.words) }} 字</span>
            <span class="stat-separator">·</span>
            <span class="stat-item">{{ formatNumber(stats.characters) }} 字符</span>
            <span class="stat-separator">·</span>
            <span class="stat-item">{{ stats.readingTime }} 分钟阅读</span>
        </div>
    </a-layout>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue';
import { DownloadOutlined, MenuOutlined } from '@ant-design/icons-vue';
import MarkdownContent from './components/MarkdownContent.vue';
import TableOfContents from './components/TableOfContents.vue';
import { useFileManager } from './composables/useFileManager';
import { useExport } from './composables/useExport';
import { useTheme, globalThemeState } from './composables/useTheme';
import { useDocumentStats } from './composables/useDocumentStats';
import { AUTO_PREVIEW_STORAGE_KEYS, getAutoPreviewFileUrl, readAutoPreviewFile } from './utils/autoPreview';

const tocDrawerOpen = ref(true); // 默认打开目录
const tocCollapsed = ref(!tocDrawerOpen.value); // 与 tocDrawerOpen 同步
const tocItems = ref([]);

const { files, currentFile, loadFiles, selectFile, saveFiles } = useFileManager();
const { exportToHTML } = useExport();
const { theme, currentTheme, cycleTheme, getThemeIcon, getThemeTooltip, initTheme } = useTheme();

// 文档统计信息
const contentForStats = computed(() => currentFile.value?.content || '');
const { stats } = useDocumentStats(contentForStats);

onMounted(async () => {
    // 初始化主题
    await initTheme();

    await loadFiles();

    // 检查是否是自动预览模式
    const urlParams = new URLSearchParams(window.location.search);
    const isAutoByUrl = urlParams.get('auto') === 'true';
    const autoPreviewFileUrl = getAutoPreviewFileUrl(window.location.search);

    // 兼容旧版本遗留的 storage 自动预览数据。
    const storageResult = await chrome.storage.local.get(AUTO_PREVIEW_STORAGE_KEYS);
    const isAutoByStorage = storageResult.autoPreviewMode === true || !!storageResult.autoPreviewFile;

    const isAuto = isAutoByUrl || isAutoByStorage;

    if (isAuto) {
        if (autoPreviewFileUrl) {
            try {
                const autoPreviewFile = await readAutoPreviewFile(autoPreviewFileUrl);
                selectFile(autoPreviewFile);
            } catch (error) {
                console.error('自动预览失败:', error);
            }
        } else if (storageResult.autoPreviewError) {
            // 显示错误信息
            console.error('自动预览失败:', storageResult.autoPreviewError);
            // 可以在这里显示错误提示
        } else if (storageResult.autoPreviewFile) {
            const autoPreviewFile = storageResult.autoPreviewFile;

            // 根据 URL 查找是否已存在相同文件（避免重复添加）
            const existingFile = files.value.find(f => f.url === autoPreviewFile.url);

            if (existingFile) {
                // 如果文件已存在，更新内容并选择它
                existingFile.content = autoPreviewFile.content;
                existingFile.lastModified = autoPreviewFile.lastModified;
                selectFile(existingFile);
                await saveFiles();
            } else {
                // 如果文件不存在，添加到列表
                files.value.push(autoPreviewFile);
                selectFile(autoPreviewFile);
                await saveFiles();
            }
        }

        // 清除自动预览标记（延迟清除，确保应用已加载）
        setTimeout(() => {
            chrome.storage.local.remove(AUTO_PREVIEW_STORAGE_KEYS);
        }, 1000);
    }
});

const handleTocUpdated = (items) => {
    tocItems.value = items;
};

const handleExport = async () => {
    if (currentFile.value) {
        // 使用全局主题状态，确保有值
        const theme = globalThemeState.currentTheme || 'light';
        await exportToHTML(currentFile.value, tocItems.value, theme);
    }
};

const toggleToc = () => {
    tocDrawerOpen.value = !tocDrawerOpen.value;
    tocCollapsed.value = !tocDrawerOpen.value;
};

// curl 转 Python
const handleCurlToPython = () => {
    const url = 'https://tool.uuhc.top/tools/curl-to-python';
    if (chrome && chrome.tabs) {
        chrome.tabs.create({ url });
    } else {
        window.open(url, '_blank');
    }
};

// 回到顶部
const handleBackToTop = () => {
    const contentElement = document.querySelector('.markdown-content');
    if (contentElement) {
        contentElement.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    } else {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
};

// 格式化数字（添加千位分隔符）
const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
</script>

<style scoped>
.app-layout {
    height: 100vh;
    width: 100vw;
    overflow: hidden;
}

.sidebar-left {
    background: var(--bg-primary);
    border-right: 1px solid var(--border-color);
    transition: background-color 0.3s, border-color 0.3s;
    height: 100vh;
    overflow: hidden;
}

/* 确保侧边栏内容可以滚动 */
:deep(.sidebar-left .ant-layout-sider-children) {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* 确保子元素可以正确计算高度 */
    min-height: 0;
}

/* 确保隐藏时完全不占据空间 */
:deep(.sidebar-left.ant-layout-sider-collapsed) {
    width: 0 !important;
    min-width: 0 !important;
    max-width: 0 !important;
}

.content-area {
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
    transition: background-color 0.3s;
}

.content-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
    height: 48px;
    transition: background-color 0.3s, border-color 0.3s;
}

.breadcrumb {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    transition: color 0.3s;
}

.markdown-content-wrapper {
    flex: 1;
    overflow: hidden;
    position: relative;
}

.welcome-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary);
    transition: color 0.3s;
}

.welcome-screen h1 {
    font-size: 32px;
    margin-bottom: 16px;
    color: var(--text-primary);
    transition: color 0.3s;
}



/* 悬浮按钮容器 - 垂直排列 */
.float-buttons {
    position: fixed;
    right: 54px;
    /* 24px + 30px = 54px */
    bottom: 24px;
    z-index: 1001;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* 目录悬浮按钮 */
.toc-float-button {
    width: 48px;
    height: 48px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: right 0.3s ease, transform 0.2s;
}

.toc-float-button:hover {
    transform: scale(1.1);
}

.toc-float-button-open {
    /* 当目录打开时，按钮位置不变，因为侧边栏会覆盖 */
}

/* 主题切换悬浮按钮 */
.theme-float-button {
    width: 48px;
    height: 48px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s;
}

.theme-float-button:hover {
    transform: scale(1.1);
}

.theme-icon {
    font-size: 20px;
    line-height: 1;
}

.theme-auto-text {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.5px;
}

/* 导出 HTML 悬浮按钮 */
.export-float-button {
    width: 48px;
    height: 48px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s;
    position: relative;
}

.export-float-button:hover:not(:disabled) {
    transform: scale(1.1);
}

.export-float-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.export-icon-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    width: 100%;
    height: 100%;
}

.export-icon {
    font-size: 16px;
    line-height: 1;
}

.export-text {
    font-size: 9px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.3px;
}

/* curl 转 Python 悬浮按钮 */
.curl-float-button {
    width: 48px;
    height: 48px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s;
    position: relative;
}

.curl-float-button:hover {
    transform: scale(1.1);
}

.curl-icon-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}

.curl-text {
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0.3px;
}

/* 回到顶部悬浮按钮 */
.back-to-top-button {
    width: 48px;
    height: 48px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s;
    position: relative;
}

.back-to-top-button:hover {
    transform: scale(1.1);
}

.back-to-top-icon {
    font-size: 20px;
    line-height: 1;
    font-weight: bold;
}

/* 底部文档统计信息 */
.document-stats {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 13px;
    color: var(--text-secondary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background-color 0.3s, border-color 0.3s, color 0.3s;
    backdrop-filter: blur(10px);
}

.stat-item {
    color: var(--text-secondary);
    transition: color 0.3s;
}

.stat-separator {
    color: var(--text-tertiary);
    margin: 0 2px;
}
</style>
