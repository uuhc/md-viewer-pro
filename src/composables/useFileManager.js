import { ref } from 'vue';

export function useFileManager() {
  const files = ref([]);
  const currentFile = ref(null);

  const readFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const loadFiles = async () => {
    try {
      const result = await chrome.storage.local.get(['files']);
      if (result.files) {
        files.value = result.files;
      }
    } catch (error) {
      console.error('加载文件失败:', error);
    }
  };

  const saveFiles = async () => {
    try {
      const filesToSave = files.value.map((f) => ({
        id: f.id,
        name: f.name,
        content: f.content,
        lastModified: f.lastModified,
      }));
      await chrome.storage.local.set({ files: filesToSave });
    } catch (error) {
      console.error('保存文件失败:', error);
    }
  };

  const addFiles = async (fileList) => {
    try {
      for (const file of fileList) {
        const content = await readFile(file);
        const fileData = {
          id: Date.now() + Math.random(),
          name: file.name,
          content: content,
          lastModified: file.lastModified,
        };
        files.value.push(fileData);
      }
      await saveFiles();
    } catch (error) {
      console.error('添加文件失败:', error);
      throw error;
    }
  };

  const selectFile = (file) => {
    currentFile.value = file;
  };

  return {
    files,
    currentFile,
    loadFiles,
    addFiles,
    selectFile,
    saveFiles,
  };
}

