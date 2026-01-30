import { createApp } from 'vue';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import './styles/theme.css';
import App from './App.vue';

// 设置 favicon
function setFavicon() {
  // 检查是否在 Chrome 扩展环境中
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    // 在扩展环境中，使用 chrome.runtime.getURL 获取图标
    const iconUrl = chrome.runtime.getURL('icons/icon16.png');
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = iconUrl;
  } else {
    // 在开发环境中，使用相对路径
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = '/icons/icon16.png';
  }
}

// 立即设置 favicon
setFavicon();

const app = createApp(App);
app.use(Antd);
app.mount('#app');
