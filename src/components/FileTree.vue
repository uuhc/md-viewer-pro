<template>
    <div class="file-tree-container">
        <div class="file-tree-header">
            <h3>文件</h3>
            <div class="header-actions">
                <a-button type="text" @click="showSearch = !showSearch" size="small" title="搜索文件">
                    <template #icon>
                        <SearchOutlined />
                    </template>
                </a-button>
                <a-button type="text" @click="triggerFolderInput" size="small" title="打开文件夹">
                    <template #icon>
                        <FolderOpenOutlined />
                    </template>
                </a-button>
                <a-button type="text" @click="triggerFileInput" size="small" title="添加文件">
                    <template #icon>
                        <PlusOutlined />
                    </template>
                </a-button>
            </div>
        </div>

        <div v-if="showSearch" class="search-container">
            <a-input v-model:value="searchQuery" placeholder="搜索文件..." size="small">
                <template #prefix>
                    <SearchOutlined />
                </template>
            </a-input>
        </div>

        <div class="file-tree-content">
            <a-tree v-if="treeData.length > 0" :tree-data="treeData" :selected-keys="selectedKeys"
                :expanded-keys="expandedKeys" @select="handleSelect" block-node>
                <template #title="{ title }">
                    <span>{{ title }}</span>
                </template>
            </a-tree>
            <a-empty v-else :description="searchQuery ? '未找到匹配的文件' : '点击「添加文件」按钮上传 Markdown 文件'"
                :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        </div>

        <input ref="fileInputRef" type="file" multiple accept=".md,.markdown" style="display: none"
            @change="handleFileSelect" />
        <input ref="folderInputRef" type="file" webkitdirectory multiple style="display: none"
            @change="handleFolderSelect" />
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { SearchOutlined, PlusOutlined, FolderOpenOutlined } from '@ant-design/icons-vue';
import { Empty } from 'ant-design-vue';

const props = defineProps({
    files: {
        type: Array,
        default: () => [],
    },
    currentFileId: {
        type: [Number, String],
        default: null,
    },
});

const emit = defineEmits(['select-file', 'add-files', 'search']);

const showSearch = ref(false);
const searchQuery = ref('');
const fileInputRef = ref(null);
const folderInputRef = ref(null);
const selectedKeys = ref([]);
const expandedKeys = ref([]);

const filteredFiles = computed(() => {
    if (!searchQuery.value) {
        return props.files;
    }
    const query = searchQuery.value.toLowerCase();
    return props.files.filter((file) =>
        file.name.toLowerCase().includes(query)
    );
});

const treeData = computed(() => {
    return filteredFiles.value.map((file) => ({
        key: file.id,
        title: file.name,
        isLeaf: true,
        file: file,
    }));
});

watch(
    () => props.currentFileId,
    (newId) => {
        if (newId) {
            selectedKeys.value = [newId];
        }
    },
    { immediate: true }
);

const handleSelect = (selectedKeys, info) => {
    if (info.selected && info.node.file) {
        emit('select-file', info.node.file);
    }
};

const triggerFileInput = () => {
    fileInputRef.value?.click();
};

const triggerFolderInput = () => {
    folderInputRef.value?.click();
};

const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
        emit('add-files', files);
        event.target.value = '';
    }
};

const handleFolderSelect = async (event) => {
    const files = Array.from(event.target.files);
    // 只筛选 Markdown 文件
    const markdownFiles = files.filter(file => {
        const name = file.name.toLowerCase();
        return name.endsWith('.md') || name.endsWith('.markdown');
    });

    if (markdownFiles.length > 0) {
        emit('add-files', markdownFiles);
        event.target.value = '';
    } else {
        // 可以显示提示：文件夹中没有 Markdown 文件
        console.warn('所选文件夹中没有 Markdown 文件');
    }
};

watch(searchQuery, (value) => {
    emit('search', value);
});
</script>

<style scoped>
.file-tree-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
    transition: background-color 0.3s;
}

.file-tree-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border-bottom: 1px solid var(--border-color);
    transition: border-color 0.3s;
    height: 48px;
}

.file-tree-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    transition: color 0.3s;
}

.header-actions {
    display: flex;
    gap: 4px;
}

.search-container {
    padding: 12px;
    border-bottom: 1px solid var(--border-color);
    transition: border-color 0.3s;
}

.file-tree-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
}

:deep(.ant-tree-node-selected) {
    background-color: var(--bg-tertiary);
}

/* 确保 Ant Design 组件在 dark 主题下正确显示 */
:deep(.ant-tree) {
    background: transparent;
    color: var(--text-primary);
}

:deep(.ant-tree-node-content-wrapper) {
    color: var(--text-primary);
}

:deep(.ant-tree-node-content-wrapper:hover) {
    background-color: var(--bg-tertiary);
}

:deep(.ant-input) {
    background: var(--bg-primary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

:deep(.ant-input::placeholder) {
    color: var(--text-tertiary);
}

:deep(.ant-empty-description) {
    color: var(--text-secondary);
}

:deep(.ant-btn-text) {
    color: var(--text-primary);
}

:deep(.ant-btn-text:hover) {
    background-color: var(--bg-tertiary);
    color: var(--accent-color);
}
</style>
