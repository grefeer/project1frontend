<script setup>
import {nextTick, onUnmounted, ref, watch} from 'vue';
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

// 解析消息逻辑：处理合并 AI 思考过程
const processMessages = (rawMessages) => {

  rawMessages.forEach((content) => {
    if (!content) return;

    const isUser = content.includes("<用户问题>");
    const isThought = content.includes("<AI思考>") || content.includes("<系统改进建议>");
    const isFinal = content.includes("<最终回答>");

    // 提取纯文本（去掉所有标签）
    let cleanContent = content.replace(/<[^>]+>/g, '').trim();
    if (!cleanContent) return; // 如果去掉标签后没内容，跳过（比如空的建议标签）

    if (isUser) {
      messages.value.push({
        role: 'user',
        text: cleanContent,
        thought: null
      });
    } else {
      // AI 处理逻辑
      let lastMsg = messages.value[messages.value.length - 1];

      // 如果上一条不是 AI，或者上一条是用户，则新建一条 AI 消息
      if (!lastMsg || lastMsg.role !== 'ai') {
        messages.value.push({
          role: 'ai',
          text: isFinal ? cleanContent : "",
          thought: isThought ? cleanContent : ""
        });
      } else {
        // 如果连续多条都是 AI 的（思考或最终回答），进行追加或覆盖
        if (isThought) {
          // 避免重复追加相同的思考内容
          if (!lastMsg.thought.includes(cleanContent)) {
            lastMsg.thought += (lastMsg.thought ? "\n": "") + cleanContent;
          }
        }
        if (isFinal) {
          lastMsg.text = cleanContent;
        }
        // 特殊处理：如果后端返回的内容既不是明确的思考也不是最终回答（比如半成品），也存入 text
        if (!isThought && !isFinal) {
          lastMsg.text = cleanContent;
        }
      }
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
    if (res.data.code === 200) {
      rawMessages.value = res.data.data.answer || [];
    } else if (res.data.code === 202 || res.data.data === null) {
      rawMessages.value = [];
    }
    messages.value = [];
    processMessages(rawMessages.value);
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

</script>

<template>
  <div class="chat-window d-flex flex-column h-100 bg-white">
    <div class="message-area flex-grow-1 overflow-auto p-4" ref="scrollBox">
      <div v-for="(msg, i) in messages" :key="i" :class="['d-flex mb-3', msg.role === 'user' ? 'justify-content-end' : 'justify-content-start']">

        <div :class="['p-3 rounded-3', msg.role === 'user' ? 'bg-primary text-white' : 'bg-light border']" style="max-width: 80%">
          <div v-if="msg.thought" class="thought-box mb-2 p-2 bg-dark bg-opacity-10 rounded small">
            <i class="bi bi-lightbulb"></i> {{ msg.thought }}
          </div>
          <div v-if="msg.text" style="white-space: pre-wrap;">{{ msg.text }}</div>
          <div v-if="!msg.text && !msg.thought && msg.role === 'ai'">正在思考...</div>
        </div>

      </div>
      <div v-if="isWaiting" class="text-start"><div class="spinner-border spinner-border-sm text-secondary"></div></div>
    </div>

    <div class="p-3 border-top">
      <div class="input-group">
        <input v-model="inputMsg" class="form-control" @keyup.enter="send" :disabled="isWaiting" placeholder="输入您的问题...">
        <button class="btn btn-primary" @click="send" :disabled="isWaiting || !sessionId">发送</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.thought-box { border-left: 3px solid #6c757d; color: #495057; }
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



