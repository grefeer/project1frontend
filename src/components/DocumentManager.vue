<script setup>
import { ref, onMounted } from 'vue';
import request from '@/utilis/requests'; // 引入我们刚刚创建的实例

const docs = ref([]);
const keyword = ref('');
const BASE_URL = '/api/v1';

const fetchDocs = async () => {
  const res = await request.get(`/document/list`, { params: { keyword: keyword.value } });
  docs.value = res.data.data.list;
};

const doUpload = async (e) => {
  const files = e.target.files;
  if (!files.length) return;
  const formData = new FormData();
  for (let f of files) formData.append('files', f);

  await request.post(`/document/upload`, formData);
  fetchDocs();
};

const downloadDoc = (id) => {
  window.open(`/document/download/${id}`, '_blank');
};

const deleteDoc = async (id) => {
  if (confirm('确认删除？')) {
    await request.delete(`/document/delete/${id}`);
    fetchDocs();
  }
};

onMounted(fetchDocs);
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
        >
        <button class="btn btn-outline-secondary" @click="fetchDocs">搜索</button>
      </div>
      <input type="file" ref="fileInput" class="d-none" multiple @change="doUpload">
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
            <button class="btn btn-sm btn-link text-danger" @click="deleteDoc(doc.documentId)">删除</button>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>

</style>