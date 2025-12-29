<script setup>
import { ref, onMounted } from 'vue';
import request from '@/utilis/requests';

import Sidebar from '@/components/Sidebar.vue';
import ChatWindow from '@/components/ChatWindow.vue';
import DocumentManager from '@/components/DocumentManager.vue'; // 引入文档管理组件
const user = ref({ username: 'Loading...' });
const sessions = ref([]);
const currentSessionId = ref(null);
const activeView = ref('chat'); // 默认显示对话视图
const isCreating = ref(false); // 状态锁

const init = async () => {
  try {
    const userRes = await request.get('/user/info');
    user.value = userRes.data.data;

    // 调用获取所有会话元数据的接口
    const res = await request.get('/qa/chatMemory');
    if (res.data.code === 200) {
      // 格式化会话数据
      sessions.value = Object.entries(res.data.data).map(([id, name]) => ({
        id: parseInt(id),
        title: name || `会话 ${id}`,
        messages: []
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
  if (isCreating.value) return; // 如果正在创建，则直接返回
  isCreating.value = true;

  try {
    // 调用后端创建新会话的接口
    const res = await request.get(`/qa/chatMemory/create`);
    if (res.data.code === 200) {
      // 检查前端是否已经存在该 ID，防止重复 push
      if (!sessions.value.find(s => s.id === res.data.data.sessionId)) {
        sessions.value.push({
          id: res.data.data.sessionId,
          title: res.data.data.sessionName,
          messages: []
        });
      }
      currentSessionId.value = res.data.data.sessionId;
    }
  } catch (err) {
    console.error("创建新会话失败", err);
  } finally {
    isCreating.value = false; // 无论结果如何，解锁
  }
};

// 重命名会话
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

// 切换视图
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
        :active-view="activeView"
        @select-session="currentSessionId = $event"
        @new-chat="handleNewChat"
        @rename-session="renameSession"
        @switch-view="handleViewSwitch"
    />
    <div class="main-content flex-grow-1 overflow-auto">
      <!-- 根据当前视图显示不同内容 -->
      <ChatWindow
          v-if="activeView === 'chat'"
          :sessionId="currentSessionId"
          @session-updated="(updatedSession) => {
            const index = sessions.value.findIndex(s => s.id === updatedSession.id);
            if (index !== -1) sessions.value[index] = updatedSession;
          }"
      />

      <div v-if="activeView === 'documents'" class="p-4">
        <DocumentManager />
      </div>
    </div>
  </div>
</template>

<!--<style scoped>-->
<!--.app-wrapper { height: 100vh; width: 100vw; overflow: hidden; }-->
<!--.main-content { background: #f8f9fa; }-->
<!--</style>-->

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