<template>
    <div class="toc-container">
        <div class="toc-header">
            <h3>目录</h3>
        </div>
        <div class="toc-content">
            <a-anchor v-if="anchorItems.length > 0" ref="anchorRef" :items="anchorItems" :offset-top="100"
                :get-container="getContainer" :bounds="5" />
            <a-empty v-else description="暂无目录" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        </div>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { Empty } from 'ant-design-vue';

const props = defineProps({
    items: {
        type: Array,
        default: () => [],
    },
});

const anchorRef = ref(null);

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

// Ant Design Vue 的 Anchor 组件会自动监听滚动并高亮
// 我们只需要确保 getContainer 返回正确的滚动容器即可
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
}

.toc-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-primary);
    transition: background-color 0.3s, border-color 0.3s;
    flex-shrink: 0;
}

.toc-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    transition: color 0.3s;
}

.toc-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 8px;
    min-height: 0;
    /* 重要：允许 flex 子元素缩小 */
    /* 确保滚动条可见 */
    scrollbar-width: thin;
    scrollbar-color: var(--border-color) var(--bg-secondary);
    /* 确保内容可以滚动 */
    position: relative;
    -webkit-overflow-scrolling: touch;
}

/* 自定义滚动条样式 - 使用 CSS 变量，自动适配主题 */
.toc-content::-webkit-scrollbar {
    width: 6px;
}

.toc-content::-webkit-scrollbar-track {
    background: var(--bg-secondary);
    transition: background-color 0.3s;
}

.toc-content::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
    transition: background-color 0.3s;
}

.toc-content::-webkit-scrollbar-thumb:hover {
    background: var(--text-tertiary);
    transition: background-color 0.3s;
}

/* 确保滚动条在暗色主题下也可见 */
.dark-theme .toc-content::-webkit-scrollbar-thumb {
    background: var(--border-color);
}

.dark-theme .toc-content::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
}

.light-theme .toc-content::-webkit-scrollbar-thumb {
    background: var(--border-color);
}

.light-theme .toc-content::-webkit-scrollbar-thumb:hover {
    background: var(--text-tertiary);
}

/* Anchor 组件基础样式 - 使用 CSS 变量，自动适配主题 */
:deep(.ant-anchor) {
    font-size: 13px;
    margin: 0;
    padding: 0;
    background: transparent;
}

/* 确保 anchor 容器可以正常滚动 */
:deep(.ant-anchor-wrapper) {
    overflow: visible;
    margin: 0;
    padding: 0;
    height: 100%;
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
</style>
