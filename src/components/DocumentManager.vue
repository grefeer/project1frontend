<script setup>
import { ref, onMounted } from 'vue';
import request from '@/utilis/requests';
import {s} from "vue-router/dist/devtools-EWN81iOl.mjs";

const docs = ref([]);
const keyword = ref('');
const sessionId = ref('0'); // 默认sessionID=0

const BASE_URL = '';

const fetchDocs = async () => {
  const res = await request.get(`/document/list`, {
    params: {
      keyword: keyword.value,
      pageNum: 1,
      pageSize: 100
    }
  });
  docs.value = res.data.data.list || [];
};

// 修改后的 doUpload 函数
const doUpload = async (e) => {
  const files = e.target.files;
  if (!files.length) return;

  try {
    for (let f of files) {
      // 1. 必须使用 FormData 包装文件
      const formData = new FormData();
      // 这里的 key "file" 必须与后端 @RequestParam("file") 一致
      formData.append('file', f);
      // 这里的 key "sessionId" 必须与后端一致，且必须用 .value 获取 ref 的值
      formData.append('sessionId', sessionId.value);

      // 2. 发送请求，不要手动设置 headers 里的 Content-Type
      await request.post(`${BASE_URL}/document/upload`, formData,{
        timeout: 60000 // 设置为 60 秒
      });
    }
    await fetchDocs();
    alert('上传成功');
  } catch (err) {
    console.error('上传失败:', err);
    alert('上传失败，请重试');
  } finally {
    // 上传完成后清空 input，否则下次选择同一个文件不会触发 change 事件
    e.target.value = '';
  }
};

const downloadDoc = (id) => {
  request({
    url: `${BASE_URL}/document/download`,
    method: 'get',
    params: { documentId: id },
    responseType: 'blob'
  }).then(response => {
    const blob = new Blob([response.data]);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = id;
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
    await fetchDocs();
  }
};

onMounted(() => {
  fetchDocs();
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
            @keyup.enter="fetchDocs"
        />
        <button class="btn btn-outline-secondary" @click="fetchDocs">搜索</button>
      </div>
      <input type="file" ref="fileInput" class="d-none" multiple @change="doUpload" />
      <button class="btn btn-primary" @click="$refs.fileInput.click()">
        <i class="bi bi-upload"></i> 上传文档
      </button>
    </div>
    <div class="table-responsive" style="max-height: 300px;">
      <table class="table table-hover align-middle">
        <thead class="table-light sticky-top">
        <tr>
          <th>名称</th>
          <th>大小</th>
          <th>时间</th>
          <th>操作</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="doc in docs" :key="doc.documentId">
          <td><i class="bi bi-file-earmark-text me-2"></i>{{ doc.documentName }}</td>
          <td>{{ (doc.fileSize / 1024).toFixed(1) }} KB</td>
          <td>{{ doc.createTime }}</td>
          <td>
            <button class="btn btn-sm btn-link" @click="downloadDoc(doc.documentId)">下载</button>
            <button class="btn btn-sm btn-link text-danger" @click="deleteDoc(doc.documentId)">
              删除
            </button>
          </td>
        </tr>
        </tbody>
      </table>
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
</style>