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


// 新增：文件上传相关
const fileInput = ref(null);

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
    await request.post(`/qa/chatMemory/delete/${sessionId}`, {
      memoryIds: allMemoryIds // ✅ 这才是正确的 memoryIds 集合
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

// const processMessages = (rawMessages) => {
//
//   rawMessages.forEach((content) => {
//     if (!content) return;
//
//     const isUser = content.includes("<用户问题>");
//     const isThought = content.includes("<AI思考>") || content.includes("<系统改进建议>");
//     const isFinal = content.includes("<最终回答>");
//
//     // 提取纯文本（去掉所有标签）
//     let cleanContent = content.replace(/<[^>]+>/g, '').trim();
//     if (!cleanContent) return; // 如果去掉标签后没内容，跳过（比如空的建议标签）
//
//     if (isUser) {
//       messages.value.push({
//         role: 'user',
//         text: cleanContent,
//         thought: null
//       });
//     } else {
//       // AI 处理逻辑
//       let lastMsg = messages.value[messages.value.length - 1];
//
//       // 如果上一条不是 AI，或者上一条是用户，则新建一条 AI 消息
//       if (!lastMsg || lastMsg.role !== 'ai') {
//         messages.value.push({
//           role: 'ai',
//           text: isFinal ? cleanContent : "",
//           thought: isThought ? cleanContent : ""
//         });
//       } else {
//         // 如果连续多条都是 AI 的（思考或最终回答），进行追加或覆盖
//         if (isThought) {
//           // 避免重复追加相同的思考内容
//           if (!lastMsg.thought.includes(cleanContent)) {
//             lastMsg.thought += (lastMsg.thought ? "\n": "") + cleanContent;
//           }
//         }
//         if (isFinal) {
//           lastMsg.text = cleanContent;
//         }
//         // 特殊处理：如果后端返回的内容既不是明确的思考也不是最终回答（比如半成品），也存入 text
//         if (!isThought && !isFinal) {
//           lastMsg.text = cleanContent;
//         }
//       }
//     }
//   });
//   return messages.value;
// };

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
      sessionId: props.sessionId
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
      // 3. 轮询状态 (路径严格对应: /qa/status)
      const res = await request.get('/qa/status', {
        params: {
          sessionId: props.sessionId,
          memoryId: memoryId.value
        }
      });

      if (res.data.code === 200 || res.data.code === 206) {
        const data = res.data.data; // 假设返回格式包含 messages 和 status
        if (data && data.answer && data.answer.length > 0) {
          processMessages(data.answer);
          memoryId.value = data.currentChatMemoryCount;

          // messages.value.splice(baseIndex, messages.value.length - baseIndex, ...newAiMessages);

          // // 找到当前会话中最后一条用户消息的位置，替换其后的所有 AI 回复
          // const lastUserIndex = messages.value.findLastIndex(m => m.role === 'user');
          // if (lastUserIndex !== -1) {
          //   messages.value.splice(lastUserIndex + 1, messages.value.length, ...newAiMessages);
          // } else {
          //   messages.value = newAiMessages;
          // }

          scrollToBottom();

        }
        // 如果后端标志回答结束（比如 status 为 1 或 'COMPLETED'）
        if (data.status === 'COMPLETED' || res.data.code === 200) {
          stopPolling();
        }
      }

    } catch (err) {
      stopPolling();
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

  // if (props.initialMessages) {
  //   messages.value = processMessages(props.initialMessages)
  // } else {
  //   messages.value = [];
  // }
  nextTick(scrollToBottom);
}, { immediate: true });


onUnmounted(stopPolling);
// 监听全局点击关闭菜单
onMounted(() => {
  window.addEventListener('click', () => showContextMenu.value = false);
});

</script>

<!--<template>-->
<!--  <div class="chat-window d-flex flex-column h-100 bg-white">-->
<!--    <div class="message-area flex-grow-1 overflow-auto p-4" ref="scrollBox">-->
<!--      <div v-for="(msg, i) in messages" :key="i" :class="['d-flex mb-3', msg.role === 'user' ? 'justify-content-end' : 'justify-content-start']">-->

<!--        <div :class="['p-3 rounded-3', msg.role === 'user' ? 'bg-primary text-white' : 'bg-light border']" style="max-width: 80%">-->
<!--          <div v-if="msg.thought" class="thought-box mb-2 p-2 bg-dark bg-opacity-10 rounded small">-->
<!--            <i class="bi bi-lightbulb"></i> {{ msg.thought }}-->
<!--          </div>-->
<!--          <div v-if="msg.text" style="white-space: pre-wrap;">{{ msg.text }}</div>-->
<!--          <div v-if="!msg.text && !msg.thought && msg.role === 'ai'">正在思考...</div>-->
<!--        </div>-->

<!--      </div>-->
<!--      <div v-if="isWaiting" class="text-start"><div class="spinner-border spinner-border-sm text-secondary"></div></div>-->
<!--    </div>-->

<!--    <div class="p-3 border-top">-->
<!--      <div class="input-group">-->
<!--        <input type="file" ref="fileInput" class="d-none" @change="handleFileUpload" />-->
<!--        <button class="btn btn-outline-secondary" @click="$refs.fileInput.click()">-->
<!--          <i class="bi bi-paperclip"></i>-->
<!--        </button>-->
<!--        <input v-model="inputMsg" class="form-control" @keyup.enter="send" :disabled="isWaiting" placeholder="输入您的问题...">-->
<!--        <button class="btn btn-primary" @click="send" :disabled="isWaiting || !sessionId">发送</button>-->
<!--      </div>-->
<!--    </div>-->
<!--  </div>-->
<!--</template>-->

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
        <div class="input-group shadow-sm">
          <input type="file" ref="fileInput" class="d-none" @change="handleFileUpload" />
          <button class="btn btn-link text-muted" @click="$refs.fileInput.click()">
            <i class="bi bi-paperclip fs-5"></i>
          </button>
          <input
              v-model="inputMsg"
              class="form-control border-0 bg-transparent py-2"
              @keyup.enter="send"
              :disabled="isWaiting"
              placeholder="输入您的问题..."
          >
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

<!--<style scoped>-->
<!--.thought-box { border-left: 3px solid #6c757d; color: #495057; }-->
<!--</style>-->

<!--<style scoped>-->
<!--.chat-window { background: var(&#45;&#45;bg-main); }-->

<!--.message-area {-->
<!--  padding: 2rem 10% !important; /* 增加侧边留白，更像文档阅读模式 */-->
<!--}-->

<!--/* AI 消息样式 */-->
<!--.bg-light {-->
<!--  background-color: #ffffff !important;-->
<!--  border: 1px solid #e5e7eb !important;-->
<!--  box-shadow: 0 2px 4px rgba(0,0,0,0.02);-->
<!--  border-radius: 4px 16px 16px 16px !important;-->
<!--}-->

<!--/* 用户消息样式 */-->
<!--.bg-primary {-->
<!--  background: var(&#45;&#45;primary-color) !important;-->
<!--  border-radius: 16px 4px 16px 16px !important;-->
<!--  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);-->
<!--}-->

<!--.thought-box {-->
<!--  border-left: 2px solid #6366f1;-->
<!--  background: #f8fafc;-->
<!--  color: #64748b;-->
<!--  font-size: 0.85rem;-->
<!--  margin-bottom: 12px;-->
<!--}-->

<!--/* 输入区域 */-->
<!--.border-top {-->
<!--  border-top: none !important;-->
<!--  padding: 24px 10% !important;-->
<!--}-->
<!--.input-group {-->
<!--  background: #fff;-->
<!--  padding: 8px;-->
<!--  border-radius: var(&#45;&#45;radius-lg);-->
<!--  box-shadow: var(&#45;&#45;card-shadow);-->
<!--  border: 1px solid #e5e7eb;-->
<!--}-->
<!--.form-control {-->
<!--  border: none !important;-->
<!--  box-shadow: none !important;-->
<!--  padding-left: 15px;-->
<!--}-->
<!--.btn-primary {-->
<!--  border-radius: 12px !important;-->
<!--  padding: 8px 20px;-->
<!--}-->
<!--</style>-->

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

/* 响应式调整 */
@media (max-width: 768px) {
  .message-area { padding: 1rem 5% !important; }
}
</style>

<!--<script setup>-->
<!--import { ref, watch, onUnmounted, nextTick, getCurrentInstance } from 'vue';-->
<!--import request from '@/utilis/requests';-->

<!--const props = defineProps(['sessionId']);-->
<!--const emit = defineEmits(['session-updated']);-->
<!--const messages = ref([]);-->
<!--const rawMessages = ref([]); // 保存原始消息用于删除操作-->
<!--const inputMsg = ref('');-->
<!--const scrollBox = ref(null);-->
<!--const isWaiting = ref(false);-->
<!--const showContextMenu = ref(false);-->
<!--const contextMenuPos = ref({ x: 0, y: 0 });-->
<!--const selectedMemoryId = ref(null);-->
<!--let pollTimer = null;-->

<!--// 处理消息格式化-->
<!--const processMessages = (rawMessages) => {-->
<!--  const processed = [];-->

<!--  rawMessages.forEach((m) => {-->
<!--    const content = m.content || '';-->
<!--    const isUser = content.includes("<用户问题>");-->
<!--    const isThought = content.includes("<AI思考>") || content.includes("<系统改进建议>");-->
<!--    const isFinal = content.includes("<最终回答>");-->

<!--    let cleanContent = content.replace(/<[^>]+>/g, '').trim();-->
<!--    let thoughtText = isThought ? cleanContent : null;-->
<!--    let finalText = (isFinal || (!isThought && !isUser)) ? cleanContent : null;-->

<!--    if (isUser) {-->
<!--      processed.push({-->
<!--        role: 'user',-->
<!--        text: cleanContent,-->
<!--        thought: null,-->
<!--        memoryId: m.memoryId-->
<!--      });-->
<!--    } else {-->
<!--      const lastMsg = processed[processed.length - 1];-->
<!--      if (lastMsg && lastMsg.role === 'ai') {-->
<!--        if (thoughtText && !lastMsg.thought?.includes(thoughtText)) {-->
<!--          lastMsg.thought = lastMsg.thought ? lastMsg.thought + "\n" + thoughtText : thoughtText;-->
<!--        }-->
<!--        if (finalText) {-->
<!--          lastMsg.text = finalText;-->
<!--        }-->
<!--      } else {-->
<!--        processed.push({-->
<!--          role: 'ai',-->
<!--          text: finalText || null,-->
<!--          thought: thoughtText || null,-->
<!--          memoryId: m.memoryId-->
<!--        });-->
<!--      }-->
<!--    }-->
<!--  });-->
<!--  return processed;-->
<!--};-->



<!--const send = async () => {-->
<!--  if (!inputMsg.value.trim() || !props.sessionId || isWaiting.value) return;-->

<!--  const question = inputMsg.value;-->
<!--  inputMsg.value = '';-->

<!--  // 临时显示用户问题-->
<!--  messages.value.push({ role: 'user', text: question, thought: '', memoryId: null });-->
<!--  scrollToBottom();-->

<!--  isWaiting.value = true;-->
<!--  try {-->
<!--    const res = await request.post('/qa/ask', {-->
<!--      question: question,-->
<!--      sessionId: props.sessionId-->
<!--    });-->

<!--    if (res.data.code === 200 || res.data.code === 206) {-->
<!--      const memoryId = res.data.data.memoryId;-->
<!--      startPolling(memoryId);-->
<!--    }-->
<!--  } catch (err) {-->
<!--    console.error("发送失败", err);-->
<!--    isWaiting.value = false;-->
<!--  }-->
<!--};-->

<!--const startPolling = (memoryId) => {-->
<!--  stopPolling();-->
<!--  pollTimer = setInterval(async () => {-->
<!--    try {-->
<!--      const res = await request.get('/qa/status', {-->
<!--        params: {-->
<!--          sessionId: props.sessionId,-->
<!--          memoryId: memoryId-->
<!--        }-->
<!--      });-->

<!--      if (res.data.code === 200 || res.data.code === 206) {-->
<!--        const data = res.data.data;-->
<!--        if (data.messages) {-->
<!--          rawMessages.value = data.messages;-->
<!--          messages.value = processMessages(rawMessages.value);-->
<!--          scrollToBottom();-->
<!--        }-->

<!--        // 检查是否完成-->
<!--        if (res.data.code === 200) {-->
<!--          stopPolling();-->
<!--          // 尝试重命名会话（当有足够内容时）-->
<!--          if (rawMessages.value.length >= 2) {-->
<!--            const renameRes = await request.get(`/qa/chatMemory/reName/${props.sessionId}`);-->
<!--            if (renameRes.data.code === 200) {-->
<!--              emit('session-updated', {-->
<!--                id: props.sessionId,-->
<!--                title: renameRes.data.data-->
<!--              });-->
<!--            }-->
<!--          }-->
<!--        }-->
<!--      }-->
<!--    } catch (err) {-->
<!--      console.error("轮询失败", err);-->
<!--      stopPolling();-->
<!--    }-->
<!--  }, 2000);-->
<!--};-->

<!--const stopPolling = () => {-->
<!--  if (pollTimer) clearInterval(pollTimer);-->
<!--  isWaiting.value = false;-->
<!--};-->

<!--// 处理删除对话-->
<!--const handleDeleteMessage = async () => {-->
<!--  if (!selectedMemoryId.value || !props.sessionId) return;-->

<!--  try {-->
<!--    const res = await request.delete(`/qa/chatMemory/delete/${props.sessionId}/${selectedMemoryId.value}`);-->
<!--    if (res.data.code === 200) {-->
<!--      // 前端删除对应消息-->
<!--      rawMessages.value = rawMessages.value.filter(m => m.memoryId !== selectedMemoryId.value);-->
<!--      messages.value = processMessages(rawMessages.value);-->
<!--      scrollToBottom();-->
<!--    }-->
<!--  } catch (err) {-->
<!--    console.error("删除消息失败", err);-->
<!--  } finally {-->
<!--    showContextMenu.value = false;-->
<!--    selectedMemoryId.value = null;-->
<!--  }-->
<!--};-->

<!--// 右键菜单处理-->
<!--const handleContextMenu = (e, memoryId) => {-->
<!--  e.preventDefault();-->
<!--  showContextMenu.value = true;-->
<!--  contextMenuPos.value = { x: e.clientX, y: e.clientY };-->
<!--  selectedMemoryId.value = memoryId;-->
<!--};-->

<!--const scrollToBottom = () => {-->
<!--  if (scrollBox.value) scrollBox.value.scrollTop = scrollBox.value.scrollHeight;-->
<!--};-->

<!--// 监听会话切换-->
<!--watch(() => props.sessionId, (newId) => {-->
<!--  stopPolling();-->
<!--  if (newId) {-->
<!--    loadSessionContent(newId);-->
<!--  } else {-->
<!--    messages.value = [];-->
<!--    rawMessages.value = [];-->
<!--  }-->
<!--}, { immediate: true });-->

<!--// 点击其他区域关闭右键菜单-->
<!--document.addEventListener('click', () => {-->
<!--  showContextMenu.value = false;-->
<!--});-->

<!--onUnmounted(stopPolling);-->
<!--</script>-->

<!--<template>-->
<!--  <div class="chat-window d-flex flex-column h-100 bg-white">-->
<!--    <div class="message-area flex-grow-1 overflow-auto p-4" ref="scrollBox">-->
<!--      <div-->
<!--          v-for="(msg, i) in messages"-->
<!--          :key="i"-->
<!--          :class="['d-flex mb-3', msg.role === 'user' ? 'justify-content-end' : 'justify-content-start']"-->
<!--          @contextmenu="handleContextMenu($event, msg.memoryId)"-->
<!--      >-->
<!--        <div :class="['p-3 rounded-3', msg.role === 'user' ? 'bg-primary text-white' : 'bg-light border']" style="max-width: 80%">-->
<!--          <div v-if="msg.thought" class="thought-box mb-2 p-2 bg-dark bg-opacity-10 rounded small">-->
<!--            <i class="bi bi-lightbulb"></i> {{ msg.thought }}-->
<!--          </div>-->
<!--          <div v-if="msg.text" style="white-space: pre-wrap;">{{ msg.text }}</div>-->
<!--        </div>-->
<!--      </div>-->
<!--      <div v-if="isWaiting" class="text-start"><div class="spinner-border spinner-border-sm text-secondary"></div></div>-->
<!--    </div>-->

<!--    &lt;!&ndash; 右键菜单 &ndash;&gt;-->
<!--    <div-->
<!--        v-if="showContextMenu"-->
<!--        :style="{ left: contextMenuPos.x + 'px', top: contextMenuPos.y + 'px' }"-->
<!--        class="context-menu position-fixed z-10 bg-white shadow p-2 rounded border"-->
<!--    >-->
<!--      <button class="btn btn-sm btn-danger" @click="handleDeleteMessage">-->
<!--        <i class="bi bi-trash"></i> 删除-->
<!--      </button>-->
<!--    </div>-->

<!--    <div class="p-3 border-top">-->
<!--      <div class="input-group">-->
<!--        <input-->
<!--            v-model="inputMsg"-->
<!--            class="form-control"-->
<!--            @keyup.enter="send"-->
<!--            :disabled="isWaiting"-->
<!--            placeholder="输入您的问题..."-->
<!--        >-->
<!--        <button class="btn btn-primary" @click="send" :disabled="isWaiting || !sessionId">-->
<!--          发送-->
<!--        </button>-->
<!--      </div>-->
<!--    </div>-->
<!--  </div>-->
<!--</template>-->

<!--<style scoped>-->
<!--.thought-box { border-left: 3px solid #6c757d; color: #495057; }-->
<!--.context-menu { min-width: 100px; }-->
<!--.context-menu button { width: 100%; text-align: left; }-->

<!--/* 右键菜单样式 */-->
<!--.context-menu {-->
<!--  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);-->
<!--}-->
<!--.context-menu button {-->
<!--  border: none;-->
<!--  background: none;-->
<!--  width: 100%;-->
<!--  text-align: left;-->
<!--  padding: 5px 10px;-->
<!--  cursor: pointer;-->
<!--}-->
<!--.context-menu button:hover {-->
<!--  background-color: #f1f1f1;-->
<!--}-->
<!--</style>-->



