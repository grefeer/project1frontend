<script setup>
import {ref, onMounted, computed, onUnmounted, nextTick} from 'vue';
import request from '@/utilis/requests';
// import {s} from "vue-router/dist/devtools-EWN81iOl.mjs";

const docs = ref([]);
const keyword = ref('');
const sessionId = ref('0'); // 默认sessionID=0

// --- 新增分页相关状态 ---
const pageNum = ref(1);
const pageSize = ref(10); // 每页显示10条
const total = ref(0);     // 总记录数

const eventSource = ref(null);
const statusLogs = ref([]);
const statusLogContainer = ref(null); // 新增：绑定日志容器DOM的ref（避免重名）
const reconnectCount = ref(0);
const MAX_RECONNECT_COUNT = 3;
const reconnectIntervals = [10000, 20000, 40000];

const BASE_URL = '';

// const fetchDocs = async () => {
//   const res = await request.get(`/document/list`, {
//     params: {
//       keyword: keyword.value,
//       pageNum: 1,
//       pageSize: 100
//     }
//   });
//   docs.value = res.data.data.list || [];
// };
// 获取文档列表（带分页参数）

/**
 * 状态文字颜色（可选，提升视觉体验）
 * @param {String} status 原始状态值
 * @returns {String} 颜色值
 */
const getStatusColor = (status) => {
  const colorMap = {
    NOT_EMBEDDED: '#666',
    AVAILABLE: '#52c41a',
  };
  return colorMap[status] || '#333';
};

/**
 * 格式化状态显示文本（可选，根据业务调整）
 * @param {String} status 原始状态值
 * @returns {String} 格式化后的文本
 */
const formatStatus = (status) => {
  const statusMap = {
    AVAILABLE: '处理完成',
    NOT_EMBEDDED: '待处理',
  };
  return statusMap[status] || status;
};

// 初始化SSE连接（替代仅在上传后创建）
/**
 * 初始化SSE连接
 */
const initSSE = () => {
  // 避免重复创建连接
  // 先加日志，确认这个方法是否执行
  console.log('===== 开始执行initSSE方法 =====');
  if (eventSource.value) {
    console.log('SSE连接已存在，跳过创建');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    appendStatus('错误', '未登录，无法建立SSE连接');
    return;
  }
  // 替换为你的后端SSE接口地址，userId可从登录态/URL参数获取
  const sseUrl = `api/v1/sse/connect?token=${token}`;

  console.log('当前token:', token); // 检查token是否存在
  console.log('准备发起SSE请求的URL:', sseUrl);

  try {
    // 创建SSE连接
    eventSource.value = new EventSource(sseUrl);

    // 1. 监听连接成功事件（后端初始化推送）
    eventSource.value.addEventListener('connect', (e) => {
      appendStatus('初始化', e.data || 'SSE连接建立成功，等待文档状态更新...');
    });

    // 2. 监听文档状态更新事件（核心：更新doc.status + 展示日志）
    eventSource.value.addEventListener('documentStatus', (e) => {
      try {
        // 解析后端推送的JSON数据
        const docStatus = JSON.parse(e.data);
        const { documentId, status } = docStatus;

        // ① 展示状态更新日志
        appendStatus(
            '状态更新',
            `文档ID：${documentId}，最新状态：${formatStatus(status)}，更新时间：${new Date().toLocaleString()}`
        );

        // ② 自动更新对应文档的status（核心逻辑）
        const targetDocIndex = docs.value.findIndex(item => item.documentId === documentId);
        if (targetDocIndex > -1) {
          // 响应式更新，表格会自动刷新
          docs.value[targetDocIndex] = {
            ...docs.value[targetDocIndex],
            status: status,
            uploadTime: new Date().toLocaleString()
          };
        } else {
          appendStatus('警告', `未找到文档ID为${documentId}的记录`);
        }
      } catch (parseError) {
        appendStatus('解析错误', `数据解析失败：${parseError.message}，原始数据：${e.data}`);
      }
    });

    // 3. 监听SSE连接错误
    eventSource.value.onerror = (e) => {
      let errorMsg = '未知错误';
      if (e.message) {
        errorMsg = e.message;
      } else if (e.target?.readyState === EventSource.CLOSED) {
        errorMsg = '连接被关闭（后端主动断开/超时）';
      } else if (e.target?.readyState === EventSource.CONNECTING) {
        errorMsg = '正在重连（连接未建立）';
        // 关键：CONNECTING状态不重连，直接返回，避免循环
        appendStatus('错误', `SSE连接异常：${errorMsg}，忽略重连`);
        return; // 终止当前onerror逻辑，不触发重连
      }
      console.error('SSE错误详情:', e);
      appendStatus('错误', `SSE连接异常：${errorMsg}`);

      // 只有CLOSED状态才重连
      if (eventSource.value?.readyState === EventSource.CLOSED) {
        eventSource.value.close();
        eventSource.value = null;

        reconnectCount.value += 1;
        if (reconnectCount.value > MAX_RECONNECT_COUNT) {
          appendStatus('错误', `SSE重连${MAX_RECONNECT_COUNT}次失败，停止重连`);
          reconnectCount.value = 0;
          return;
        }

        const interval = reconnectIntervals[reconnectCount.value - 1];
        appendStatus('重连', `${interval/1000}秒后尝试重连（剩余次数：${MAX_RECONNECT_COUNT - reconnectCount.value}）`);
        setTimeout(initSSE, interval);
      }
    };

  } catch (createError) {
    appendStatus('创建失败', `SSE连接创建失败：${createError.message}`);
  }
};

// 页面关闭时关闭SSE连接
window.onbeforeunload = function () {
  if (eventSource.value) {
    eventSource.value.close();
  }
};

const fetchDocs = async () => {
  const res = await request.get(`/document/list`, {
    params: {
      keyword: keyword.value,
      pageNum: pageNum.value,
      pageSize: pageSize.value
    }
  });
  // 假设后端返回结构为 { data: { list: [], total: 100 } }
  docs.value = res.data.data.list || [];
  total.value = res.data.data.total || 0;
};

// 计算总页数
const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

// 搜索重置页码
const handleSearch = () => {
  pageNum.value = 1;
  fetchDocs();
};

// 切换页码
const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    pageNum.value = page;
    fetchDocs();
  }
};

// 修改后的 doUpload 函数
const doUpload = async (e) => {
  const files = e.target.files;
  if (!files.length) return;

  try {
    for (let f of files) {
      // 1. 必须使用 FormData 包装文件
      const formData = new FormData();
      formData.append('file', f);
      formData.append('sessionId', sessionId.value);

      // 2. 发送请求，不要手动设置 headers 里的 Content-Type
      await request.post(`${BASE_URL}/document/upload`, formData,{
        timeout: 60000 // 设置为 60 秒
      });
    }
    await fetchDocs();
    // 添加SSE连接
    initSSE();

    alert('上传成功');
  } catch (err) {
    console.error('上传失败:', err);
    alert('上传失败，请重试');
  } finally {
    // 上传完成后清空 input，否则下次选择同一个文件不会触发 change 事件
    e.target.value = '';
  }
};

/**
 * 追加状态日志（展示文字）
 * @param {String} type 日志类型（初始化/状态更新/错误）
 * @param {String} content 日志内容
 */
const appendStatus = (type, content) => {
  const time = new Date().toLocaleString();
  // ① 向日志数组push数据（此时statusLogs还是数组，不会被DOM覆盖）
  statusLogs.value.push(`[${time}] [${type}]：${content}`);

  // ② 自动滚动到最新日志（操作DOM ref：statusLogContainer）
  nextTick(() => {
    try {
      // 判空：DOM ref是否存在
      if (!statusLogContainer.value) {
        console.warn('状态日志容器DOM不存在，跳过滚动操作');
        return;
      }
      // 执行滚动（操作DOM的scrollTop/scrollHeight）
      statusLogContainer.value.scrollTop = statusLogContainer.value.scrollHeight;
    } catch (e) {
      console.error('滚动状态日志容器失败:', e);
    }
  });
};


const downloadDoc = (doc) => {
  request({
    url: `${BASE_URL}/document/download`,
    method: 'get',
    params: { documentId: doc.documentId },
    responseType: 'blob'
  }).then(response => {
    const blob = new Blob([response.data]);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = doc.documentName;
    link.click();
    URL.revokeObjectURL(link.href);
  }).catch(err => {
    console.error('下载失败:', err);
    alert('下载失败');
  });
};

const deleteDoc = async (id) => {
  if (confirm('确认删除？')) {
    await request.delete(`${BASE_URL}/document/delete/${id}`);
    // 如果当前页只有一条且不是第一页，删除后自动跳转上一页
    if (docs.value.length === 1 && pageNum.value > 1) {
      pageNum.value--;
    }
    await fetchDocs();
  }
};

onMounted(() => {
  fetchDocs();
  initSSE(); // 页面加载就建立SSE连接，而非仅上传后
});

// 页面卸载时关闭SSE连接，避免内存泄漏
onUnmounted(() => {
  if (eventSource.value) {
    eventSource.value.close();
    eventSource.value = null;
    appendStatus('初始化', '页面卸载，SSE连接已关闭');
  }
});

</script>
<template>
  <div class="section border-bottom pb-3 mb-3">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="input-group w-50">
        <input
            type="text"
            class="form-control"
            v-model="keyword"
            placeholder="搜索文档..."
            @keyup.enter="handleSearch"
        />
        <button class="btn btn-outline-secondary" @click="handleSearch">搜索</button>
      </div>
      <input type="file" ref="fileInput" class="d-none" multiple @change="doUpload" />
      <button class="btn btn-primary" @click="$refs.fileInput.click()">
        <i class="bi bi-upload"></i> 上传文档
      </button>
    </div>
    <!-- 关键：ref="statusLogs" 必须和代码中的变量名一致 -->
    <!-- 避免用v-if，改用v-show（v-if会销毁元素，导致ref为null） -->
    <div class="status-log-container" ref="statusLogContainer" v-show="true" style="height: 300px; overflow-y: auto;">
      <div v-for="(log, index) in statusLogs" :key="index" class="log-item">
        {{ log }}
      </div>
    </div>
    <div class="table-responsive" style="max-height: 400px;">
      <table class="table table-hover align-middle">
        <thead class="table-light sticky-top">
        <tr>
          <th>名称</th>
          <th>大小</th>
          <th>时间</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="doc in docs" :key="doc.documentId">
          <td><i class="bi bi-file-earmark-text me-2"></i>{{ doc.documentName }}</td>
          <td>{{ (doc.fileSize / 1024).toFixed(1) }} KB</td>
          <td>{{ doc.uploadTime }}</td>
<!--          <td>{{ doc.status }}</td>-->
          <!-- 状态自动更新，绑定docs中的status字段 -->
          <td :style="{ color: getStatusColor(doc.status) }">
            {{ formatStatus(doc.status) }}
          </td>
          <td>
            <button class="btn btn-sm btn-link" @click="downloadDoc(doc)">下载</button>
            <button class="btn btn-sm btn-link text-danger" @click="deleteDoc(doc.documentId)">
              删除
            </button>
          </td>
        </tr>
        <tr v-if="docs.length === 0">
          <td colspan="5" class="text-center py-4 text-muted">暂无文档</td>
        </tr>
        </tbody>
      </table>
    </div>

    <div class="d-flex justify-content-between align-items-center mt-3 px-2">
      <div class="text-muted small">
        共 {{ total }} 条记录，第 {{ pageNum }} / {{ totalPages || 1 }} 页
      </div>
      <nav aria-label="Page navigation">
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item" :class="{ disabled: pageNum === 1 }">
            <button class="page-link" @click="changePage(pageNum - 1)">上一页</button>
          </li>

          <li class="page-item" :class="{ active: pageNum === 1 }">
            <button class="page-link" @click="changePage(1)">1</button>
          </li>

          <li v-if="totalPages > 1" class="page-item" :class="{ active: pageNum === totalPages }">
            <button class="page-link" @click="changePage(totalPages)">{{ totalPages }}</button>
          </li>

          <li class="page-item" :class="{ disabled: pageNum === totalPages || totalPages === 0 }">
            <button class="page-link" @click="changePage(pageNum + 1)">下一页</button>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.section {
  background: #fff;
  padding: 24px;
  border-radius: var(--radius-lg);
  box-shadow: var(--card-shadow);
  border: none !important;
}

.table {
  --bs-table-hover-bg: #f9fafb;
}

.table thead th {
  background-color: #f8fafc;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  color: #64748b;
  border-top: none;
  padding: 16px;
}

.table tbody td {
  padding: 16px;
  vertical-align: middle;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
}

.btn-link {
  text-decoration: none;
  font-weight: 500;
  font-size: 0.85rem;
  color: var(--primary-color);
}

.btn-link.text-danger {
  color: #ef4444;
}

.input-group .form-control {
  background: #f1f5f9;
  border: none;
}

.pagination .page-link {
  color: var(--primary-color);
  border: 1px solid #f1f5f9;
  cursor: pointer;
}
.pagination .page-item.active .page-link {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}
.pagination .page-item.disabled .page-link {
  color: #94a3b8;
  pointer-events: none;
}

</style>