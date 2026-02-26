<script setup>
import { ref, computed } from "vue";

// 定义组件属性
const props = defineProps(['sessions', 'favoriteSessions', 'currentSessionId', 'username', 'role', 'activeView']);

// 定义组件事件（合并为一个 call，避免报错）
const emit = defineEmits(['select-session', 'new-chat', 'switch-view', 'rename-session', 'set-favorite-session']);

// 右键菜单状态控制
const contextMenu = ref({ visible: false, style: {}, targetSession: null });

/**
 * 判断会话是否为收藏状态
 */
const isFavorite = computed(() => (sessionId) => {
  return props.favoriteSessions.some(item => item.id === sessionId);
});

/**
 * 显示自定义右键菜单
 */
const showContextMenu = (e, session) => {
  contextMenu.value = {
    visible: true,
    targetSession: session,
    style: {
      position: 'fixed',
      top: `${e.clientY}px`,
      left: `${e.clientX}px`,
      zIndex: 2000
    }
  };

  const close = () => {
    contextMenu.value.visible = false;
    document.removeEventListener('click', close);
  };
  document.addEventListener('click', close);
};

/**
 * 触发重命名逻辑
 */
const triggerRename = () => {
  const session = contextMenu.value.targetSession;
  if (!session) return;

  const newName = prompt("请输入新的会话名称：", session.title);
  if (newName !== null && newName.trim() !== "") {
    emit('rename-session', session.id, newName);
  }
};

/**
 * 触发收藏对话逻辑
 */
const setFavorite = () => {
  const session = contextMenu.value.targetSession;
  if (!session) return;
  emit('set-favorite-session', session.id, 1);
  // 关闭右键菜单
  contextMenu.value.visible = false;
};

/**
 * 触发取消收藏对话逻辑
 */
const resetFavorite = () => {
  const session = contextMenu.value.targetSession;
  if (!session) return;
  emit('set-favorite-session', session.id, 0);
  // 关闭右键菜单
  contextMenu.value.visible = false;
};

</script>

<template>
  <div id="sidebar">
    <div class="view-tabs">
      <button
          class="view-tab"
          :class="{ active: activeView === 'chat' }"
          @click="$emit('switch-view', 'chat')"
      >
        <i class="bi bi-chat-left"></i> 对话
      </button>
      <button
          class="view-tab"
          :class="{ active: activeView === 'documents' }"
          @click="$emit('switch-view', 'documents')"
      >
        <i class="bi bi-file-earmark"></i> 文档
      </button>

      <button
          v-if="role === 'ADMIN'"
          class="view-tab"
          :class="{ active: activeView === 'dashboard' }"
          @click="$emit('switch-view', 'dashboard')"
          title="系统仪表盘"
      >
        <i class="bi bi-speedometer2"></i> 概览
      </button>

      <button
          v-if="role === 'ADMIN'"
          class="view-tab"
          :class="{ active: activeView === 'users' }"
          @click="$emit('switch-view', 'users')"
      >
        <i class="bi bi-people"></i> 用户
      </button>
      <button
          v-if="role === 'ADMIN'"
          class="view-tab"
          :class="{ active: activeView === 'tags' }"
          @click="$emit('switch-view', 'tags')"
      >
        <i class="bi bi-tags"></i> 标签
      </button>
    </div>

    <button class="sidebar-btn" @click="$emit('new-chat')">
      <i class="bi bi-plus-lg me-2"></i>新建对话
    </button>

    <div class="flex-grow-1 overflow-y-auto sessions-scroll-area">
      <div class="favorite-section mt-2 px-2">
        <div class="favorite-title mb-1 d-flex align-items-center">
          <i class="bi bi-star-fill text-yellow-500 me-2"></i>
          <span class="text-sm text-gray-400">已收藏</span>
          <div class="favorite-divider flex-grow-1 ms-2"></div>
        </div>
        <div class="sessions-list favorite-sessions-list px-1">
          <div
              v-for="session in favoriteSessions"
              :key="session.id"
              class="session-item-container favorite-session-item"
              :class="{ 'is-active': currentSessionId === session.id }"
              @click="$emit('select-session', session.id)"
              @contextmenu.prevent="showContextMenu($event, session)"
          >
            <div class="active-indicator"></div>
            <div class="session-content">
              <i class="bi bi-star-fill text-yellow-500 me-2"></i>
              <span class="session-title">{{ session.title }}</span>
            </div>
          </div>
          <div v-if="favoriteSessions.length === 0" class="empty-favorite text-center py-4 text-gray-500 text-sm">
            <i class="bi bi-star me-1"></i>暂无收藏的对话
          </div>
        </div>
      </div>

      <div class="normal-sessions-section mt-3 px-2">
        <div class="normal-title mb-1 d-flex align-items-center">
          <i class="bi bi-chat-left text-gray-400 me-2"></i>
          <span class="text-sm text-gray-400">最近对话</span>
          <div class="normal-divider flex-grow-1 ms-2"></div>
        </div>
        <div class="sessions-list px-1">
          <div
              v-for="session in sessions"
              :key="session.id"
              class="session-item-container"
              :class="{ 'is-active': currentSessionId === session.id }"
              @click="$emit('select-session', session.id)"
              @contextmenu.prevent="showContextMenu($event, session)"
          >
            <div class="active-indicator"></div>
            <div class="session-content">
              <i class="bi bi-chat-left-text me-2 icon-dim"></i>
              <span class="session-title">{{ session.title }}</span>
            </div>
          </div>
          <div v-if="sessions.length === 0" class="empty-sessions text-center py-4 text-gray-500 text-sm">
            <i class="bi bi-chat-left me-1"></i>暂无对话记录
          </div>
        </div>
      </div>
    </div>

    <div v-if="contextMenu.visible" :style="contextMenu.style" class="context-menu shadow-lg">...</div>

    <div class="sidebar-footer border-top border-secondary p-3">
      <div
          class="d-flex align-items-center p-2 rounded user-profile-btn"
          :class="{ 'active-bg': activeView === 'profile' }"
          @click="$emit('switch-view', 'profile')"
          style="cursor: pointer;"
      >
        <div class="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2"
             style="width: 32px; height: 32px; font-size: 14px; flex-shrink: 0;">
          {{ username?.charAt(0).toUpperCase() }}
        </div>

        <div class="flex-grow-1 overflow-hidden">
          <div class="text-truncate fw-bold" style="font-size: 0.9rem;">
            {{ username }}
          </div>
          <div class="text-white" style="font-size: 0.75rem; opacity: 0.5;">
            {{ role === 'ADMIN' ? '系统管理员' : '普通用户' }}
          </div>
        </div>

        <i class="bi bi-gear-fill text-white ms-1" style="font-size: 1.1rem; opacity: 0.5;"></i>
      </div>
    </div>
  </div>
</template>


<style scoped>
#sidebar {
  width: 310px;
  min-width: 310px;
  max-width: 310px;
  flex-shrink: 0;
  background-color: #111827; /* 极深背景 */
  display: flex;
  flex-direction: column;
  height: 100vh;
  border-right: 1px solid #2d2d2d;
  transition: none;
}

/* 视图切换 Tabs */
.view-tabs {
  display: flex;
  padding: 8px;
  gap: 4px;
  background: rgba(255, 255, 255, 0.05);
  margin: 16px 12px;
  border-radius: 12px;
}

.view-tab {
  flex: 1;
  background: transparent;
  border: none;
  color: #9ca3af;
  padding: 8px 4px;
  font-size: 0.8rem;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.view-tab.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* 新建按钮 */
.sidebar-btn {
  background-color: transparent;
  border: 1px dashed #444;
  color: #ececf1;
  margin: 0 12px 12px;
  padding: 12px;
  border-radius: 10px;
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.sidebar-btn:hover {
  background-color: #4f46e4;
  border-style: solid;
}

/* 会话列表项容器 - 基础样式 */
.session-item-container {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px 14px;
  margin-bottom: 2px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  color: #acacbe;
  user-select: none;
}

.session-item-container:hover {
  background-color: #2b2b2b;
  color: #fff;
}

.session-item-container.is-active {
  background-color: #4f46e4;
  color: #ffffff;
  font-weight: 500;
}

/* 保持原有样式，并确保滚动条样式应用到新的容器 */
.sessions-scroll-area::-webkit-scrollbar {
  width: 4px;
}
.sessions-scroll-area::-webkit-scrollbar-thumb {
  background: #343541;
  border-radius: 10px;
}
.sessions-scroll-area::-webkit-scrollbar-track {
  background: transparent;
}

/* 左侧白条指示器 */
.is-active .active-indicator {
  position: absolute;
  left: 0;
  width: 3px;
  height: 18px;
  background-color: #fff;
  border-radius: 0 4px 4px 0;
}

.session-content {
  display: flex;
  align-items: center;
  width: 100%;
  overflow: hidden;
}

.session-title {
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.icon-dim {
  font-size: 1rem;
  opacity: 0.6;
}

/* 收藏栏专属样式 */
.favorite-section {
  background: rgba(30, 41, 59, 0.3);
  border-radius: 10px;
  margin: 0 12px;
  padding-bottom: 8px;
}

.favorite-title {
  font-size: 0.75rem;
  padding: 4px 8px;
}

.text-yellow-500 {
  color: #eab308;
}

.text-sm {
  font-size: 0.75rem;
}

.text-gray-400 {
  color: #94a3b8;
}

.text-gray-500 {
  color: #64748b;
}

.favorite-divider, .normal-divider {
  height: 1px;
  background: rgba(148, 163, 184, 0.1);
}

.favorite-sessions-list {
  max-height: none; /* 限制收藏栏高度 */
}

.favorite-session-item {
  border-left: 2px solid transparent;
}

/* 3. 悬停效果优化：没选中前是淡金色背景 */
.favorite-session-item:hover:not(.is-active) {
  background-color: rgba(234, 179, 8, 0.15); /* 淡淡的金色透明背景 */
  color: #fff;
}

/* 4. 如果你想让收藏对话里的图标在选中时也保持金色而不是变白 */
.favorite-session-item.is-active .bi-star-fill {
  color: #facc15 !important;
}

.favorite-session-item.is-active {
  background-color: #cc6800 !important; /* 深金色背景，!important 确保覆盖上面的蓝色 */
  color: #ffffff;
  border-left: 2px solid #facc15; /* 选中时左侧条变为亮金色 */
}

.empty-favorite {
  color: #64748b;
  font-size: 0.8rem;
}

/* 普通会话栏样式 */
.normal-sessions-section {
  margin: 0 12px;
}

.normal-title {
  font-size: 0.75rem;
  padding: 4px 8px;
}

.empty-sessions {
  color: #64748b;
  font-size: 0.8rem;
}

/* 右键弹出菜单 */
.context-menu {
  background: #202123;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 5px;
  min-width: 130px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
}

.menu-item {
  padding: 10px 12px;
  color: #eee;
  font-size: 0.85rem;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.menu-item:hover {
  background: #343541;
}

/* 底部用户信息 */
.sidebar-footer {
  padding: 16px 12px;
  border-top: 1px solid #2d2d2d;
  margin-top: auto; /* 固定在底部 */
}

.user-profile-btn:hover {
  background-color: rgb(79, 70, 228);
}

.user-profile-btn.active-bg {
  background-color: rgba(255, 255, 255, 0.15);
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #f1f5f9;
}

/* 滚动条样式 */
.sessions-list::-webkit-scrollbar {
  width: 4px;
}
.sessions-list::-webkit-scrollbar-thumb {
  background: #343541;
  border-radius: 10px;
}
.sessions-list::-webkit-scrollbar-track {
  background: transparent;
}
</style>