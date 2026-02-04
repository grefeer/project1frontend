<script setup>
import { ref, onMounted } from 'vue';
import request from '@/utilis/requests';
import Sidebar from '@/components/Sidebar.vue';
import ChatWindow from '@/components/ChatWindow.vue';
import DocumentManager from '@/components/DocumentManager.vue';
import UserManagement from '@/views/UserManagement.vue';
import TagManagement from '@/views/TagManagement.vue';

const user = ref({ username: 'Loading...', role: '' });
const sessions = ref([]);
const currentSessionId = ref(null);
const activeView = ref('chat');
const isCreating = ref(false);

const init = async () => {
  try {
    const userRes = await request.get('/user/info');
    user.value = userRes.data.data;

    const res = await request.get('/qa/chatMemory');
    if (res.data.code === 200) {
      sessions.value = Object.entries(res.data.data).map(([id, name]) => ({
        id: parseInt(id),
        title: name || `会话 ${id}`,
        messages: [],
      }));
    }

    if (sessions.value.length > 0) {
      currentSessionId.value = sessions.value[sessions.value.length - 1].id;
    }
  } catch (err) {
    console.error("初始化失败", err);
  }
};

const handleNewChat = async () => {
  if (isCreating.value) return;
  isCreating.value = true;
  try {
    const res = await request.get(`/qa/chatMemory/create`);
    if (res.data.code === 200) {
      if (!sessions.value.find(s => s.id === res.data.data.sessionId)) {
        sessions.value.push({
          id: res.data.data.sessionId,
          title: res.data.data.sessionName,
          messages: [],
        });
      }
      currentSessionId.value = res.data.data.sessionId;
    }
  } catch (err) {
    console.error("创建新会话失败", err);
  } finally {
    isCreating.value = false;
  }
};

const renameSession = async (sessionId, newName) => {
  try {
    await request.get(`/qa/chatMemory/reName/${sessionId}`);
    const session = sessions.value.find(s => s.id === sessionId);
    if (session) {
      session.title = newName;
    }
  } catch (err) {
    console.error("重命名会话失败", err);
  }
};

const handleViewSwitch = (view) => {
  activeView.value = view;
};

onMounted(init);
</script>

<template>
  <div class="app-wrapper d-flex">
    <Sidebar
        :sessions="sessions"
        :currentSessionId="currentSessionId"
        :username="user.username"
        :role="user.role"
        :active-view="activeView"
        @select-session="currentSessionId = $event"
        @new-chat="handleNewChat"
        @rename-session="renameSession"
        @switch-view="handleViewSwitch"
    />
    <div class="main-content flex-grow-1 overflow-auto">
      <ChatWindow v-if="activeView === 'chat'" :sessionId="currentSessionId" @session-updated="(updatedSession) => { const index = sessions.value.findIndex(s => s.id === updatedSession.id); if (index !== -1) sessions.value[index] = updatedSession; }" />
      <div v-if="activeView === 'documents'" class="p-4">
        <DocumentManager />
      </div>
      <!-- 用户管理视图 (仅管理员可见) -->
      <div v-if="activeView === 'users'" class="p-4">
        <UserManagement />
      </div>
      <!-- 标签管理视图 (仅管理员可见) -->
      <div v-if="activeView === 'tags'" class="p-4">
        <TagManagement />
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-wrapper {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: var(--bg-main);
}
.main-content {
  background: transparent;
  transition: all 0.3s;
}
/* 给文档管理视图增加一些内边距，使其看起来更像独立的模块 */
.p-4 {
  padding: 2rem 5% !important;
}
</style>