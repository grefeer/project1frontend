<script setup>
import { ref, onMounted } from 'vue';
import request from '@/utilis/requests';
import Sidebar from '@/components/Sidebar.vue';
import ChatWindow from '@/components/ChatWindow.vue';
import DocumentManager from '@/components/DocumentManager.vue';
import UserManagement from '@/views/UserManagement.vue';
import TagManagement from '@/views/TagManagement.vue';
import Profile from '@/views/Profile.vue'; // 确保路径正确

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

const handleLogout = () => {
  localStorage.clear();
  window.location.href = '/';
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
    // 如果 newName 为 null，后端接口应处理为 AI 自动生成
    const res = await request.get(`/qa/chatMemory/reName/${sessionId}${newName ? `?newName=${newName}` : ''}`);
    if (res.data.code === 200) {
      const updatedName = res.data.data; // 后端返回生成的新名字
      const session = sessions.value.find(s => s.id === sessionId);
      if (session) session.title = updatedName;
    }
  } catch (err) {
    console.error("重命名失败", err);
  }
};

const handleAutoRename = async (sessionId) => {
  // 调用现有重命名逻辑，newName 传 null 触发后端 AI 总结
  await renameSession(sessionId, null);
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
        @select-session="currentSessionId = $event; activeView = 'chat'"
        @new-chat="handleNewChat"
        @rename-session="renameSession"
        @switch-view="handleViewSwitch"
    />

    <div class="main-content flex-grow-1 overflow-auto bg-light">
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
      <div v-if="activeView === 'profile'" class="h-100">
        <Profile @logout="handleLogout" />
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