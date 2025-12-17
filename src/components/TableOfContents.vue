<template>
    <div class="toc-container">
        <div class="toc-header">
            <h3>目录</h3>
        </div>
        <div class="toc-content" ref="tocContentRef">
            <a-anchor v-if="anchorItems.length > 0" ref="anchorRef" :items="anchorItems" :offset-top="100"
                :get-container="getContainer" :bounds="5" :affix="false" :show-ink-in-fixed="false" />
            <a-empty v-else description="暂无目录" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        </div>
    </div>
</template>

<script setup>
import { computed, ref, onMounted, nextTick } from 'vue';
import { Empty } from 'ant-design-vue';

const props = defineProps({
    items: {
        type: Array,
        default: () => [],
    },
});

const anchorRef = ref(null);
const tocContentRef = ref(null);

const convertToAnchorItems = (items) => {
    return items.map((item) => ({
        key: item.id,
        href: `#${item.id}`,
        title: item.text,
        children: item.children.length > 0 ? convertToAnchorItems(item.children) : undefined,
    }));
};

const anchorItems = computed(() => {
    return convertToAnchorItems(props.items);
});

const getContainer = () => {
    // 返回 Markdown 内容的滚动容器
    return document.querySelector('.markdown-content');
};

// 初始化时确保目录可以正常滚动
onMounted(() => {
    nextTick(() => {
        // 确保目录内容区域可以滚动
        if (tocContentRef.value) {
            // 强制刷新滚动容器的计算
            const tocContent = tocContentRef.value;
            tocContent.scrollTop = 0;

            // 确保 Anchor 组件不会阻止滚动
            if (anchorRef.value && anchorRef.value.$el) {
                const anchorEl = anchorRef.value.$el;
                // 移除可能阻止滚动的事件监听
                anchorEl.style.overflow = 'visible';
                const anchorWrapper = anchorEl.querySelector('.ant-anchor-wrapper');
                if (anchorWrapper) {
                    anchorWrapper.style.overflow = 'visible';
                }
            }
        }
    });
});
</script>

<style scoped>
.toc-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
    transition: background-color 0.3s;
    overflow: hidden;
    /* 确保容器占满父元素 */
    min-height: 0;
    max-height: 100%;
}

.toc-header {
    padding: 0 16px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-primary);
    transition: background-color 0.3s, border-color 0.3s;
    flex-shrink: 0;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.toc-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    transition: color 0.3s;
    text-align: center;
}

.toc-content {
    flex: 1 1 auto;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    padding: 8px;
    min-height: 0;
    height: 0;
    /* 关键：配合 flex: 1 使用，强制 flex 子元素遵守高度限制 */
    /* 重要：允许 flex 子元素缩小 */
    /* 确保滚动条可见 - 使用更明显的颜色 */
    scrollbar-width: thin;
    scrollbar-color: var(--text-tertiary) var(--bg-secondary);
    /* 确保内容可以滚动 */
    -webkit-overflow-scrolling: touch;
    /* 确保滚动容器有明确的高度限制 */
    position: relative;
    box-sizing: border-box;
    /* 确保 padding 包含在高度计算内 */
    /* 强制容器可滚动 */
    overscroll-behavior: contain;
    /* 防止滚动事件冒泡 */
    touch-action: pan-y;
}

/* 自定义滚动条样式 - 使用 CSS 变量，自动适配主题 */
.toc-content::-webkit-scrollbar {
    width: 8px;
    /* 增加宽度，让滚动条更明显 */
}

.toc-content::-webkit-scrollbar-track {
    background: var(--bg-secondary);
    transition: background-color 0.3s;
    border-radius: 4px;
}

.toc-content::-webkit-scrollbar-thumb {
    background: var(--text-tertiary);
    /* 使用更明显的颜色 */
    border-radius: 4px;
    transition: background-color 0.3s;
    /* 确保滚动条始终可见 */
    min-height: 20px;
}

.toc-content::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
    /* hover 时更明显 */
    transition: background-color 0.3s;
}

/* 确保滚动条在暗色主题下也可见 - 使用 CSS 变量 */
.dark-theme .toc-content::-webkit-scrollbar-thumb {
    background: var(--text-tertiary);
    /* 暗色主题下使用更亮的颜色 */
}

.dark-theme .toc-content::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
}

.light-theme .toc-content::-webkit-scrollbar-thumb {
    background: var(--text-tertiary);
    /* 亮色主题下使用更暗的颜色 */
}

.light-theme .toc-content::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
}

/* Anchor 组件基础样式 - 使用 CSS 变量，自动适配主题 */
:deep(.ant-anchor) {
    font-size: 13px;
    margin: 0;
    padding: 0;
    background: transparent;
    height: auto !important;
    overflow: visible !important;
    max-height: none !important;
}

/* 确保 anchor 容器可以正常滚动 */
:deep(.ant-anchor-wrapper) {
    overflow: visible !important;
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
    max-height: none !important;
    position: relative !important;
    /* 确保 wrapper 不会阻止父容器的滚动 */
    min-height: 0;
    /* 防止阻止滚动事件 */
    pointer-events: none;
}

/* 确保 anchor 的滚动容器不会阻止滚动 */
:deep(.ant-anchor) {
    position: relative !important;
    overflow: visible !important;
    /* 恢复点击事件 */
    pointer-events: auto;
}

/* 确保 anchor-link 不会阻止滚动 */
:deep(.ant-anchor-link) {
    position: relative !important;
    /* 恢复链接的点击事件 */
    pointer-events: auto;
}

/* 移除第一个 anchor link 的顶部间距 */
:deep(.ant-anchor-link:first-child) {
    margin-top: 0;
    padding-top: 0;
}

/* Anchor link 基础样式 */
:deep(.ant-anchor-link) {
    padding: 3px 0;
    padding-left: 0;
    line-height: 1.5;
}

:deep(.ant-anchor-link + .ant-anchor-link) {
    margin-top: 1px;
}

/* 子级缩进 */
:deep(.ant-anchor-link .ant-anchor-link) {
    padding-left: 16px;
    margin-top: 2px;
}

:deep(.ant-anchor-link .ant-anchor-link .ant-anchor-link) {
    padding-left: 32px;
}

/* Anchor link 标题样式 - 使用 CSS 变量，自动适配主题 */
:deep(.ant-anchor-link-title) {
    font-size: 13px;
    color: var(--text-secondary);
    transition: color 0.2s;
    padding: 1px 0;
    display: block;
}

:deep(.ant-anchor-link-title:hover) {
    color: var(--accent-color);
}

:deep(.ant-anchor-link-active > .ant-anchor-link-title) {
    color: var(--accent-color);
    font-weight: 500;
}

/* Anchor 指示线 - 使用 CSS 变量，自动适配主题 */
:deep(.ant-anchor-ink::before) {
    background-color: var(--border-color);
    transition: background-color 0.3s;
}

:deep(.ant-anchor-ink-ball) {
    background-color: var(--accent-color);
    border-color: var(--accent-color);
    transition: background-color 0.3s, border-color 0.3s;
}

/* Empty 组件样式 - 使用 CSS 变量，自动适配主题 */
:deep(.ant-empty) {
    color: var(--text-secondary);
}

:deep(.ant-empty-description) {
    color: var(--text-secondary);
}

/* Dark 模式下的特殊样式 */
.dark-theme {
    /* 目录容器背景 */
    background: var(--bg-primary) !important;
}

.dark-theme .toc-header {
    background: var(--bg-primary) !important;
    border-bottom-color: var(--border-color) !important;
}

.dark-theme .toc-content {
    background: var(--bg-primary) !important;
}

/* Dark 模式下锚点链接样式 - 使用 CSS 变量 */
.dark-theme :deep(.ant-anchor-link-title) {
    color: var(--text-primary) !important;
}

.dark-theme :deep(.ant-anchor-link-title:hover) {
    color: var(--accent-color) !important;
}

/* Dark 模式下锚点激活状态 */
.dark-theme :deep(.ant-anchor-link-active > .ant-anchor-link-title) {
    color: var(--accent-color) !important;
}

/* Dark 模式下的滚动条样式 */
.dark-theme .toc-content::-webkit-scrollbar-track {
    background: var(--bg-secondary) !important;
}

.dark-theme .toc-content::-webkit-scrollbar-thumb {
    background: var(--text-tertiary) !important;
}

.dark-theme .toc-content::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary) !important;
}

/* 隐藏目录中可能出现的链接标识 */
:deep(.ant-anchor-link-title) {
    position: relative;
}

:deep(.ant-anchor-link-title::after) {
    content: none !important;
}
</style>
