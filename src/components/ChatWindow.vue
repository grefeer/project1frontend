<script setup>
import {nextTick, onMounted, onUnmounted, ref, watch} from 'vue';
import request from '@/utilis/requests'; // 引入我们刚刚创建的实例

const props = defineProps(['sessionId', 'initialMessages']);
const messages = ref([]);
const rawMessages = ref([]); // 保存原始消息用于删除操作
const inputMsg = ref('');
const scrollBox = ref(null);
const isWaiting = ref(false); // 是否正在等待 AI 回答
const memoryId = ref(0);
const isSending = ref(false); // 状态锁
let pollTimer = null;

const isDeleteMode = ref(false); // 是否进入删除选择模式
const showContextMenu = ref(false);
const contextMenuPos = ref({ x: 0, y: 0 });
const activeRightClickId = ref(null); // 当前右键点击的消息 ID

const selectedIndices = ref(new Set()); // 存储选中的消息索引

const ragMode = ref(3); // 检索模式，默认3（带反思的检索）
// RAG模式配置项
const ragModeOptions = ref([
  { value: 1, label: '简单检索' },
  { value: 2, label: '子问题检索' },
  { value: 3, label: '带反思的检索' }
]);
const showRagDropdown = ref(false); // 控制RAG模式下拉菜单显示/隐藏

const emit = defineEmits(['session-updated', 'auto-rename']); // 增加 auto-rename 声明

// 进入删除模式
const enterDeleteMode = () => {
  isDeleteMode.value = true;
  showContextMenu.value = false;
};

// 取消删除模式
const cancelDelete = () => {
  isDeleteMode.value = false;
  selectedIndices.value.clear();
};

// 切换单个消息块选中状态
const toggleSelection = (index) => {
  if (selectedIndices.value.has(index)) {
    selectedIndices.value.delete(index);
  } else {
    selectedIndices.value.add(index);
  }
};

// 全选所有消息块
const selectAll = () => {
  selectedIndices.value.clear();
  for (let i = 0; i < messages.value.length; i++) {
    selectedIndices.value.add(i);
  }
};

// 确认删除：收集所有被选中消息的 memoryIds
const confirmDelete = async () => {
  if (selectedIndices.value.size === 0) return;

  const allMemoryIds = [];
  for (const index of selectedIndices.value) {
    const msg = messages.value[index];
    if (msg && msg.memoryIds) {
      allMemoryIds.push(...msg.memoryIds); // 展开数组
    }
  }

  if (allMemoryIds.length === 0) return;

  try {
    let sessionId =  props.sessionId;
    await request.delete(`/qa/chatMemory/delete/${sessionId}`, {
      data: allMemoryIds // ✅ 这才是正确的 memoryIds 集合
    });

    // 重新加载会话
    await loadSessionContent(props.sessionId);
    cancelDelete();
  } catch (err) {
    console.error("删除失败", err);
  }
};

// 处理右键点击
const handleContextMenu = (event, memoryId) => {
  event.preventDefault();
  contextMenuPos.value = {
    x: event.clientX,
    y: event.clientY
  };
  showContextMenu.value = true;
  activeRightClickId.value = memoryId;
};

// 切换RAG模式
const changeRagMode = (mode) => {
  console.log("切换RAG模式为：", mode); // 新增日志，便于调试
  ragMode.value = mode; // 确保赋值成功
  showRagDropdown.value = false; // 强制关闭下拉菜单
  // 新增：强制更新视图（解决响应式未触发的问题）
  nextTick(() => {
    showRagDropdown.value = false;
  });
};

// 解析消息逻辑：处理合并 AI 思考过程
// 修改后的解析逻辑
const processMessages = (rawMessages, memoryIdArrays) => {
  rawMessages.map((content, index) => {
    if (!content) return;
    let memoryId_ = memoryIdArrays[index];

    const isUser = content.includes("<用户问题>");
    const isThought = content.includes("<AI思考>") || content.includes("<系统改进建议>");
    const isFinal = content.includes("<最终回答>");

    let cleanContent = content.replace(/<[^>]+>/g, '').trim();
    if (!cleanContent) return;

    if (isThought || isFinal) {
      let lastMsg = messages.value[messages.value.length - 1];

      // 如果上一条不是 AI，则新建一条 AI 消息对象
      if (!lastMsg || lastMsg.role !== 'ai') {
        messages.value.push({
          role: 'ai',
          text: isFinal ? cleanContent : "",
          thoughts: isThought ? [cleanContent] : [], // 如果第一条就是思考，直接放入数组
          memoryIds: [memoryId_]
        });
      } else {
        lastMsg.memoryIds.push(memoryId_);

        // 如果是思考过程，推入数组（独立存储）
        if (isThought && !lastMsg.thoughts.includes(cleanContent)) {
          // 检查重复，防止轮询时重复推入
          lastMsg.thoughts.push(cleanContent);
        }
        // 如果是最终回答
        if (isFinal) {
          lastMsg.text = cleanContent;
        }
        // 处理半成品内容
        if (!isThought && !isFinal) {
          lastMsg.text = cleanContent;
        }
      }
    } else {
      messages.value.push({
        role: 'user',
        text: cleanContent,
        thoughts: [], // 初始化为空数组
        memoryIds: [memoryId_]
      });
    }

  });
  return messages.value;
};

const send = async () => {
  if (!inputMsg.value.trim() || !props.sessionId || isWaiting.value) return;
  if(isSending.value) return;
  isSending.value = true;

  const question = inputMsg.value;
  inputMsg.value = '';

  isWaiting.value = true;
  try {
    // 2. 发送问题 (路径严格对应: /qa/ask)
    const res = await request.post('/qa/ask', {
      question: question,
      sessionId: props.sessionId,
      ragMode: ragMode.value
    });

    if (res.data.code === 200) {
      // 假设后端 ask 返回的数据中包含 memoryId, 加上发送的问题
      memoryId.value = res.data.data.memoryId;
      startPolling();
    }
  } catch (err) {
    console.error("发送失败", err);
    isWaiting.value = false;
  } finally {
    isSending.value = false;
  }
};

// 加载会话内容
const loadSessionContent = async (sessionId) => {
  if (!sessionId) return;

  try {
    const res = await request.get(`/qa/chatMemory/${sessionId}`);
    let memoryIdArrays = [];
    if (res.data.code === 200 || res.data.code === 206) {
      rawMessages.value = res.data.data.answer || [];
      memoryIdArrays = res.data.data.memoryIds;
    } else if (res.data.code === 202 || res.data.data === null) {
      rawMessages.value = [];
    }
    messages.value = [];
    processMessages(rawMessages.value, memoryIdArrays);
    await nextTick(scrollToBottom);
  } catch (err) {
    console.error("加载会话内容失败", err);
  }
};

const startPolling = () => {
  stopPolling();
  pollTimer = setInterval(async () => {
    try {
      const res = await request.get('/qa/status', {
        params: {
          sessionId: props.sessionId,
          memoryId: memoryId.value
        }
      });

      if (res.data.code === 200 || res.data.code === 206) {
        const data = res.data.data;
        if (data && data.answer && data.answer.length > 0) {
          processMessages(data.answer, data.memoryIds);
          // 修复：更新为最新的memoryId（而非总数）
          if (data.memoryIds && data.memoryIds.length > 0) {
            memoryId.value = data.memoryIds[data.memoryIds.length - 1];
          }
          scrollToBottom();
        }
        // 回答完成时停止轮询
        if (data.status === 'COMPLETED' || res.data.code === 200) {
          if(3 <= memoryId.value && memoryId.value <= 10)
            emit('auto-rename', props.sessionId);
          stopPolling();
        }
      }

    } catch (err) {
      console.error("轮询/status失败", err);
      stopPolling(); // 出错时停止轮询，避免无限请求
      isWaiting.value = false;
      alert("获取回答失败，请重试"); // 可选：用户提示
    }
  }, 2000);
};

const stopPolling = () => {
  if (pollTimer) clearInterval(pollTimer);
  isWaiting.value = false;
};

const scrollToBottom = () => {
  if (scrollBox.value) scrollBox.value.scrollTop = scrollBox.value.scrollHeight;
};

// 监听会话切换
watch(() => props.sessionId, (newId) => {
  stopPolling();
  loadSessionContent(newId);
  nextTick(scrollToBottom);
}, { immediate: true });

onUnmounted(stopPolling);
// 监听全局点击关闭菜单
onMounted(() => {
  window.addEventListener('click', () => {
    showContextMenu.value = false;
    showRagDropdown.value = false; // 全局点击关闭RAG下拉菜单
  });

  // 新增：监听RAG菜单容器的点击，阻止冒泡到window
  const ragMenuContainer = document.querySelector('.position-relative');
  if (ragMenuContainer) {
    ragMenuContainer.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
});

</script>

<template>
  <div class="chat-window d-flex flex-column h-100 bg-white" @click="showContextMenu = false">

    <div class="message-area flex-grow-1 overflow-auto p-4" ref="scrollBox">
      <div v-for="(msg, i) in messages" :key="i"
           :class="['d-flex mb-4 align-items-center', msg.role === 'user' ? 'justify-content-end' : 'justify-content-start']">

        <div v-if="isDeleteMode" class="me-3 animate__animated animate__fadeIn">
          <input type="checkbox"
                 :checked="selectedIndices.has(i)"
                 @change="toggleSelection(i)"
                 class="form-check-input custom-checkbox">
        </div>

        <div :class="['message-card p-3',
                      msg.role === 'user' ? 'bg-primary text-white' : 'bg-light border',
                      isDeleteMode ? 'delete-mode-card' : '']"
             style="max-width: 85%"
             @contextmenu="handleContextMenu($event, i)">

          <div v-if="msg.thoughts && msg.thoughts.length" class="thought-container mb-3">
            <div class="thought-header small mb-2 text-muted">
              <i class="bi bi-cpu-fill pulse-icon"></i> 思考过程
            </div>
            <div class="thought-list">
              <div v-for="(step, idx) in msg.thoughts" :key="idx" class="thought-item">
                <span class="step-dot"></span>
                <span class="step-text">{{ step }}</span>
              </div>
            </div>
          </div>

          <div v-if="msg.text" class="final-text" style="white-space: pre-wrap;">{{ msg.text }}</div>

          <div v-if="!msg.text && (!msg.thoughts || msg.thoughts.length === 0) && msg.role === 'ai'" class="d-flex align-items-center gap-2 text-muted">
            <div class="spinner-grow spinner-grow-sm" role="status"></div>
            <small>正在准备回答...</small>
          </div>
        </div>

      </div>

      <div v-if="isWaiting" class="text-start ms-2 mb-3">
        <div class="spinner-border spinner-border-sm text-primary" style="opacity: 0.5;"></div>
      </div>
    </div>

    <div v-if="showContextMenu"
         :style="{ left: contextMenuPos.x + 'px', top: contextMenuPos.y + 'px' }"
         class="custom-context-menu shadow-lg">
      <div class="menu-item" @click.stop="enterDeleteMode">
        <i class="bi bi-trash3 me-2"></i> 删除信息
      </div>
    </div>

    <div class="p-3 border-top">
      <div v-if="isDeleteMode" class="delete-action-bar d-flex justify-content-center align-items-center gap-3 py-2">
        <button class="btn btn-light border btn-sm px-3" @click="cancelDelete">取消</button>
        <button class="btn btn-light border btn-sm px-3" @click="selectAll">全选</button>
        <button class="btn btn-danger btn-sm px-4 shadow-sm" @click="confirmDelete" :disabled="selectedIndices.size === 0">
          删除选中 ({{ selectedIndices.size }})
        </button>
      </div>

      <div v-else class="input-container mx-auto">
        <!-- 核心修改：替换文件上传为RAG模式选择下拉按钮 -->
        <div class="input-group shadow-sm">
          <!-- RAG模式选择下拉按钮 -->
          <!-- 父容器保持relative，下拉菜单改为向上展开 -->
          <div class="position-relative" @click.stop="showRagDropdown = !showRagDropdown">
            <button class="btn btn-link text-muted d-flex align-items-center gap-1 px-2 py-1" type="button" style="white-space: nowrap; min-width: 80px;">
              <i class="bi bi-database fs-6"></i>
              <span class="small text-truncate" style="max-width: 80px;">{{ ragModeOptions.find(item => item.value === ragMode.value)?.label }}</span>
            </button>
            <!-- 核心修改：向上展开 + 强制位置约束 -->
            <div
                v-if="showRagDropdown"
                class="rag-dropdown shadow-lg position-absolute bg-white rounded-3 border z-10"
                style="
                right: auto !important;
                left: auto !important;
                top: auto !important;
                bottom: 100% !important; /* 按钮正上方展开 */
                margin-bottom: 4px;
                /* 固定最小宽度，确保选项完整显示 */
                min-width: 120px;
                max-width: 150px;
                /* 禁止超出可视区域 */
                z-index: 9999;"
            >
              <div
                  v-for="option in ragModeOptions"
                  :key="option.value"
                  class="px-3 py-2 small cursor-pointer hover-bg-light"
                  @click.stop="changeRagMode(option.value)"
              >
                {{ option.label }}
              </div>
            </div>
          </div>

          <!-- 输入框 -->
          <input
              v-model="inputMsg"
              class="form-control border-0 bg-transparent py-2"
              @keyup.enter="send"
              :disabled="isWaiting"
              placeholder="输入您的问题..."
          >

          <!-- 发送按钮 -->
          <button
              class="btn btn-primary rounded-pill px-4 ms-2 my-1 me-1"
              @click="send"
              :disabled="isWaiting || !sessionId"
          >
            <i class="bi bi-send-fill" v-if="!isWaiting"></i>
            <span v-else class="spinner-border spinner-border-sm"></span>
          </button>
        </div>

        <div class="text-center mt-2">
          <small class="text-muted" style="font-size: 0.7rem;">AI 可能会产生错误，请核查重要信息。</small>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-window { background: #f9fafb; }

.message-area {
  padding: 2rem 12% !important;
}

/* 消息卡片基础样式 */
.message-card {
  position: relative;
  transition: all 0.2s ease;
}

.bg-light {
  background-color: #ffffff !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 4px 18px 18px 18px !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.bg-primary {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%) !important;
  border-radius: 18px 4px 18px 18px !important;
}

/* 思考过程容器样式 */
.thought-container {
  background-color: #f8fafc; /* 浅灰蓝色背景 */
  border-left: 3px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px 16px;
}

.thought-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.pulse-icon {
  color: #6366f1;
  animation: pulse 2s infinite;
}

/* 独立思考项样式 */
.thought-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.thought-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.88rem;
  color: #475569;
  line-height: 1.5;
}

.step-dot {
  width: 6px;
  height: 6px;
  background-color: #cbd5e1;
  border-radius: 50%;
  margin-top: 7px;
  flex-shrink: 0;
}

.step-text {
  flex-grow: 1;
}

/* 最终文字样式 */
.final-text {
  font-size: 1rem;
  color: #1f2937;
  line-height: 1.6;
}
/* 自定义右键菜单 */
.custom-context-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  padding: 5px 0;
  min-width: 120px;
  border: 1px solid #eee;
}
.menu-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}
.menu-item:hover {
  background: #f3f4f6;
  color: #ef4444;
}

/* 删除模式下的整体样式 */
.delete-target {
  box-shadow: 0 0 0 2px #e5e7eb !important; /* 浅灰色外框效果 */
  transition: all 0.3s ease;
}

/* 自定义复选框样式 */
.custom-checkbox {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
}

/* 删除底部操作栏动画 */
.delete-action-bar {
  animation: slideUp 0.3s ease-out;
  background: #ffffff !important;
  z-index: 100;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* 消息卡片在删除模式下的悬停效果 */
.delete-target:hover {
  background-color: #f9fafb !important;
  border-color: #d1d5db !important;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

/* 修复RAG下拉菜单和按钮文字样式 */
.rag-dropdown {
  min-width: 120px;
  z-index: 1000;
  max-width: 150px; /* 限制下拉菜单宽度 */
}
.hover-bg-light:hover {
  background-color: #f3f4f6;
}
/* 按钮文字截断优化 */
.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 移动端适配增强 */
@media (max-width: 768px) {
  button.btn-link span.small {
    display: inline-block !important; /* 恢复文字显示，配合截断 */
    max-width: 60px !important;
  }
  .rag-dropdown {
    min-width: 100px;
    max-width: 120px;
  }
}

</style>