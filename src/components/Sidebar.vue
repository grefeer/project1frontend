<!--<script setup>-->
<!--defineProps(['sessions', 'currentSessionId', 'username']);-->
<!--defineEmits(['select-session', 'new-chat']);-->
<!--</script>-->

<!--<template>-->
<!--  <div id="sidebar">-->
<!--    <button class="sidebar-btn" @click="$emit('new-chat')">-->
<!--      <i class="bi bi-plus-lg"></i> 新建对话-->
<!--    </button>-->

<!--    <div class="flex-grow-1 overflow-y-auto">-->
<!--      <div-->
<!--          v-for="s in sessions"-->
<!--          :key="s.id"-->
<!--          :class="['nav-link-custom', { active: currentSessionId === s.id }]"-->
<!--          @click="$emit('select-session', s.id)"-->
<!--      >-->
<!--        <i class="bi bi-chat-left-text me-2"></i>-->
<!--        <span class="text-truncate">{{ s.title || '新对话' }}</span>-->
<!--      </div>-->
<!--    </div>-->

<!--    <div class="user-section border-top border-secondary p-3">-->
<!--      <div class="d-flex align-items-center">-->
<!--        <i class="bi bi-person-circle fs-4 me-2"></i>-->
<!--        <span>{{ username }}</span>-->
<!--      </div>-->
<!--    </div>-->
<!--  </div>-->
<!--</template>-->

<!--<style scoped>-->
<!--#sidebar { width: 260px; background: #171717; color: #ececec; display: flex; flex-direction: column; height: 100%; }-->
<!--.sidebar-btn { margin: 10px; border: 1px solid #4d4d4d; color: #fff; border-radius: 6px; padding: 10px; text-align: left; background: transparent; }-->
<!--.sidebar-btn:hover { background: #2f2f2f; }-->
<!--.nav-link-custom { padding: 10px 20px; color: #c5c5d2; cursor: pointer; display: flex; align-items: center; }-->
<!--.nav-link-custom.active { background: #2f2f2f; color: #fff; }-->
<!--.nav-link-custom:hover { background: #2f2f2f; }-->
<!--</style>-->

<script setup>
defineProps(['sessions', 'currentSessionId', 'username', 'activeView']);
defineEmits(['select-session', 'new-chat', 'switch-view']);
</script>

<template>
  <div id="sidebar">
    <!-- 视图切换选项 -->
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
        <i class="bi bi-file-earmark"></i> 文档管理
      </button>
    </div>

    <button class="sidebar-btn" @click="$emit('new-chat')">
      <i class="bi bi-plus-lg"></i> 新建对话
    </button>

    <div class="flex-grow-1 overflow-y-auto">
      <div
          v-for="s in sessions"
          :key="s.id"
          :class="['nav-link-custom', { active: currentSessionId === s.id }]"
          @click="$emit('select-session', s.id)"
      >
        <i class="bi bi-chat-left-text me-2"></i>
        <span class="text-truncate">{{ s.title || '新对话' }}</span>
      </div>
    </div>

    <div class="user-section border-top border-secondary p-3">
      <div class="d-flex align-items-center">
        <i class="bi bi-person-circle fs-4 me-2"></i>
        <span>{{ username }}</span>
      </div>
    </div>
  </div>
</template>

<!--<style scoped>-->
<!--#sidebar { width: 260px; background: #171717; color: #ececec; display: flex; flex-direction: column; height: 100%; }-->

<!--/* 视图切换样式 */-->
<!--.view-tabs { display: flex; border-bottom: 1px solid #4d4d4d; }-->
<!--.view-tab {-->
<!--  flex: 1;-->
<!--  background: transparent;-->
<!--  border: none;-->
<!--  color: #c5c5d2;-->
<!--  padding: 10px;-->
<!--  cursor: pointer;-->
<!--}-->
<!--.view-tab.active {-->
<!--  background: #2f2f2f;-->
<!--  color: #fff;-->
<!--  border-bottom: 2px solid #0d6efd;-->
<!--}-->
<!--.view-tab:hover { background: #2f2f2f; }-->

<!--.sidebar-btn { margin: 10px; border: 1px solid #4d4d4d; color: #fff; border-radius: 6px; padding: 10px; text-align: left; background: transparent; }-->
<!--.sidebar-btn:hover { background: #2f2f2f; }-->
<!--.nav-link-custom { padding: 10px 20px; color: #c5c5d2; cursor: pointer; display: flex; align-items: center; }-->
<!--.nav-link-custom.active { background: #2f2f2f; color: #fff; }-->
<!--.nav-link-custom:hover { background: #2f2f2f; }-->
<!--</style>-->
<style scoped>
#sidebar {
  width: 280px;
  background: var(--sidebar-bg);
  color: #f3f4f6;
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.view-tabs {
  display: flex;
  padding: 8px;
  gap: 4px;
  background: rgba(255,255,255,0.05);
  margin: 16px;
  border-radius: var(--radius-md);
}
.view-tab {
  flex: 1;
  background: transparent;
  border: none;
  color: #9ca3af;
  padding: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.view-tab.active {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

.sidebar-btn {
  margin: 0 16px 16px;
  border: 1px dashed rgba(255,255,255,0.2);
  color: #fff;
  border-radius: var(--radius-md);
  padding: 12px;
  background: transparent;
  transition: all 0.2s;
}
.sidebar-btn:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.4);
}

.nav-link-custom {
  padding: 10px 20px;
  margin: 2px 12px;
  color: #9ca3af;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 0.9rem;
}
.nav-link-custom.active {
  background: var(--primary-color);
  color: #fff;
}
.nav-link-custom:hover:not(.active) {
  background: rgba(255,255,255,0.05);
}

.user-section {
  background: rgba(0,0,0,0.2);
}
</style>