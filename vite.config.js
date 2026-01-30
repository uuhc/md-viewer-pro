import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';

// 构建后复制 manifest.json 和图标文件
function copyManifest() {
  return {
    name: 'copy-manifest',
    closeBundle() {
      try {
        const distDir = resolve(__dirname, 'dist');
        if (!existsSync(distDir)) {
          mkdirSync(distDir, { recursive: true });
        }

        // 复制 manifest.json
        if (existsSync(resolve(__dirname, 'manifest.json'))) {
          copyFileSync(
            resolve(__dirname, 'manifest.json'),
            resolve(distDir, 'manifest.json')
          );
        }

        // 复制 background.js
        const backgroundSrc = resolve(__dirname, 'src/background.js');
        const backgroundDist = resolve(distDir, 'background.js');
        if (existsSync(backgroundSrc)) {
          copyFileSync(backgroundSrc, backgroundDist);
        }

        // 复制 content.js
        const contentSrc = resolve(__dirname, 'src/content.js');
        const contentDist = resolve(distDir, 'content.js');
        if (existsSync(contentSrc)) {
          copyFileSync(contentSrc, contentDist);
        }

        // 复制图标文件（如果存在）
        const iconsSrcDir = resolve(__dirname, 'icons');
        const iconsDistDir = resolve(distDir, 'icons');
        if (existsSync(iconsSrcDir)) {
          if (!existsSync(iconsDistDir)) {
            mkdirSync(iconsDistDir, { recursive: true });
          }
          ['icon16.png', 'icon48.png', 'icon128.png'].forEach(icon => {
            const iconPath = resolve(iconsSrcDir, icon);
            if (existsSync(iconPath)) {
              copyFileSync(iconPath, resolve(iconsDistDir, icon));
            }
          });
        }
      } catch (error) {
        console.error('复制文件失败:', error);
      }
    },
  };
}

export default defineConfig({
  plugins: [vue(), copyManifest()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        viewer: resolve(__dirname, 'viewer.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'viewer.html') {
            return 'viewer.html';
          }
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
