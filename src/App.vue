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

<style>
/* 全局变量定义 */
:root {
  --primary-color: #4f46e5; /* 现代靛蓝色 */
  --bg-main: #f9fafb;
  --sidebar-bg: #111827;
  --card-shadow: 0 4px 20px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --radius-lg: 16px;
  --radius-md: 12px;
}

html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: var(--bg-main);
  color: #1f2937;
  -webkit-font-smoothing: antialiased;
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 5px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style>
