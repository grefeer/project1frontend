<script setup>
import { ref } from "vue";

// 定义组件属性
defineProps(['sessions', 'currentSessionId', 'username', 'role', 'activeView']);

// 定义组件事件（合并为一个 call，避免报错）
const emit = defineEmits(['select-session', 'new-chat', 'switch-view', 'rename-session']);

// 右键菜单状态控制
const contextMenu = ref({ visible: false, style: {}, targetSession: null });

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

    <div class="sessions-list flex-grow-1 overflow-auto px-2 mt-2">
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
    </div>

    <div v-if="contextMenu.visible" :style="contextMenu.style" class="context-menu shadow-lg">
      <div class="menu-item" @click="triggerRename">
        <i class="bi bi-pencil-square me-2"></i>重命名
      </div>
    </div>

    <div class="sidebar-footer">
      <div class="user-info">
        <div class="avatar-sm">{{ username.charAt(0).toUpperCase() }}</div>
        <span class="username-text ms-2 text-truncate">{{ username }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
#sidebar {
  /* 关键：固定边栏大小，防止布局抖动 */
  width: 260px;
  min-width: 260px;
  max-width: 260px;
  flex-shrink: 0;

  background-color: #111827; /* 极深背景 */
  display: flex;
  flex-direction: column;
  height: 100vh;
  border-right: 1px solid #2d2d2d;
  transition: none; /* 去掉过渡，防止切换时宽度闪烁 */
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

/* 会话列表项容器 */
.session-item-container {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px 14px;
  margin-bottom: 2px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  color: #acacbe; /* 未选中时的文字颜色较暗 */
  user-select: none;
}

/* 悬停效果 (图二) */
.session-item-container:hover {
  background-color: #2b2b2b;
  color: #fff;
}

/* 选中高亮状态 (图三) */
.session-item-container.is-active {
  background-color: #4f46e4; /* 选中时的深灰背景 */
  color: #ffffff;
  font-weight: 500;
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
  text-overflow: ellipsis; /* 关键：防止标题撑开边栏 */
}

.icon-dim {
  font-size: 1rem;
  opacity: 0.6;
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
}

.user-info {
  display: flex;
  align-items: center;
  color: #ececf1;
}

.avatar-sm {
  width: 32px;
  height: 32px;
  background: #343541;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
}

.username-text {
  font-size: 0.85rem;
  max-width: 180px;
}

/* 隐藏滚动条但保留功能 */
.sessions-list::-webkit-scrollbar {
  width: 4px;
}
.sessions-list::-webkit-scrollbar-thumb {
  background: #343541;
  border-radius: 10px;
}
</style>