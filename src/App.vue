<script setup>
/**
 * 这里通常存放全局逻辑，比如：
 * 1. 检查本地 Token 是否过期
 * 2. 初始化全局主题
 * 3. 监听全局错误
 */
</script>

<template>
  <router-view />
</template>

<style scoped>
/* 全局样式：建议把原 dashboard.html 中的通用 CSS 放在这里 */
:root {
  --sidebar-bg: #171717;
  --active-gray: #2f2f2f;
}

html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* 统一滚动条样式（可选，让界面更像 AI 助手） */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}


</style>
