<script setup>
import { ref, onMounted } from 'vue';
import request from '@/utilis/requests';
import Sidebar from '@/components/Sidebar.vue';
import ChatWindow from '@/components/ChatWindow.vue';
import DocumentManager from '@/components/DocumentManager.vue';
import UserManagement from '@/views/UserManagement.vue';
import TagManagement from '@/views/TagManagement.vue';
import Profile from '@/views/Profile.vue'; // 确保路径正确
import SystemOverview from '@/views/SystemOverview.vue'; // 引入新组件

const user = ref({ username: 'Loading...', role: '' });
const sessions = ref([]);
const favoriteSessions = ref([]);
const currentSessionId = ref(null);
const activeView = ref('chat');
const isCreating = ref(false);

const init = async () => {
  try {
    const userRes = await request.get('/user/info');
    user.value = userRes.data.data;

    const res = await request.get('/qa/chatMemory');
    if (res.data.code === 200) {
      Object.entries(res.data.data).forEach(([id, name]) => {
        // name类似于对话1::true,对话2::false，::是分隔符,后面的true，false是是否收藏，如果收藏，放入favoriteSessions中，否则放入sessions中
        const sessionName = name || `会话 ${id}::false`;
        const [title, isFavoriteStr] = sessionName.split('::');
        const isFavorite = isFavoriteStr === 'true';
        const sessionId = parseInt(id);

        const sessionItem = {
          id: sessionId,
          title: title || `会话 ${sessionId}`, // 标题为空时用默认值
          messages: [],
        };
        if (isFavorite) {
          favoriteSessions.value.push(sessionItem);
        } else {
          sessions.value.push(sessionItem);
        }

      });
      // sessions.value = Object.entries(res.data.data).map(([id, name]) => ({
      //   id: parseInt(id),
      //   title: name || `会话 ${id}`,
      //   messages: [],
      // }));
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

const setChatFavorite = async (sessionId, favorite) => {
  try {
    let res;
    // favorite=1 表示收藏，favorite=0 表示取消收藏
    if (favorite === 1) {
      res = await request.post(`/qa/favorite/set/${sessionId}`);
    } else {
      res = await request.post(`/qa/favorite/reset/${sessionId}`);
    }

    if (res.data.code === 200) {
      if (favorite === 0) {
        // --- 取消收藏逻辑修正 ---
        // 1. 从收藏列表中找到这个会话对象
        const index = favoriteSessions.value.findIndex(s => s.id === sessionId);
        if (index !== -1) {
          const targetSession = favoriteSessions.value[index];
          // 2. 从收藏列表移除
          favoriteSessions.value.splice(index, 1);
          // 3. 添加回普通列表
          sessions.value.push(targetSession);
        }
      } else {
        // --- 收藏逻辑修正 ---
        // 1. 从普通列表中找到这个会话对象
        const index = sessions.value.findIndex(s => s.id === sessionId);
        if (index !== -1) {
          const targetSession = sessions.value[index];
          // 2. 检查是否已经在收藏夹（防重）
          const isAlreadyFavorited = favoriteSessions.value.some(s => s.id === sessionId);
          if (!isAlreadyFavorited) {
            // 3. 从普通列表移除并加入收藏列表
            sessions.value.splice(index, 1);
            favoriteSessions.value.push(targetSession);
          }
        }
      }
      // 这里的 log 逻辑之前写反了，favorite 为 0 是取消收藏
      console.log(`会话 ${sessionId} ${favorite === 1 ? '收藏' : '取消收藏'} 成功`);
    }
  } catch (err) {
    console.error(`操作失败`, err);
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
        :favoriteSessions="favoriteSessions"
        :currentSessionId="currentSessionId"
        :username="user.username"
        :role="user.role"
        :active-view="activeView"
        @select-session="currentSessionId = $event; activeView = 'chat'"
        @new-chat="handleNewChat"
        @rename-session="renameSession"
        @set-favorite-session="setChatFavorite"
        @switch-view="handleViewSwitch"
    />

    <div class="main-content flex-grow-1 overflow-auto bg-light">
      <ChatWindow v-if="activeView === 'chat'" :sessionId="currentSessionId" @session-updated="(updatedSession) => { const index = sessions.value.findIndex(s => s.id === updatedSession.id); if (index !== -1) sessions.value[index] = updatedSession; }" />
      <div v-if="activeView === 'documents'" class="p-4">
        <DocumentManager />
      </div>

      <div v-if="activeView === 'dashboard'" class="p-4">
        <SystemOverview />
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