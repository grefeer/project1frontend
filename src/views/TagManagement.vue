<template>
  <div class="tag-management">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h4>标签管理</h4>

        <div class="d-flex align-items-center">
          <div class="input-group me-3" style="width: 280px;">
            <input
                type="text"
                class="form-control"
                v-model="keyword"
                placeholder="搜索标签名称..."
                @keyup.enter="handleSearch"
            >
            <button class="btn btn-outline-secondary" @click="handleSearch">
              <i class="bi bi-search"></i>
            </button>
          </div>
          <div class="d-flex gap-2">
            <!--          <input type="file" ref="tagFileInput" style="display: none" accept=".csv" @change="onTagFileChange">-->
            <input type="file" ref="tagFileInput" style="display: none" @change="onTagFileChange">
            <button class="btn btn-primary" @click="$refs.tagFileInput.click()">
              <i class="bi bi-tags"></i> 批量添加
            </button>

            <button class="btn btn-primary" @click="showAddModal = true">
              <i class="bi bi-plus-lg"></i> 新增标签
            </button>
          </div>
        </div>
      </div>


      <div class="card-body">
        <table class="table table-hover">
          <thead>
          <tr>
            <th>标签名称</th>
            <th>描述</th>
            <th>父标签</th>
            <th>创建者</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
          </thead>
          <tbody>
          <!-- 修复1：添加dblclick事件 + data-tag-id属性 -->
          <tr
              v-for="tag in tags"
              :key="tag.tagId"
              @dblclick="showUsersInTag(tag)"
              :data-tag-id="tag.tagId"
              style="cursor: pointer;"
          >
            <td>{{ tag.tagName }}</td>
            <td>{{ tag.description }}</td>
            <td>{{ tag.parentTag }}</td>
            <td>{{ tag.createdBy }}</td>
            <td>{{ new Date(tag.createdAt).toLocaleString() }}</td>
            <td>
              <button class="btn btn-sm btn-danger" @click="deleteTag(tag.tagId)">
                <i class="bi bi-trash"></i> 删除
              </button>
            </td>
          </tr>
          </tbody>
        </table>

        <div class="card-footer bg-white border-top-0 py-3">
          <nav aria-label="Page navigation">
            <ul class="pagination justify-content-center mb-0">
              <li class="page-item" :class="{ disabled: pageNum === 1 }">
                <button class="page-link" @click="changePage(pageNum - 1)">上一页</button>
              </li>

              <li class="page-item" v-if="totalPages > 0" :class="{ active: pageNum === 1 }">
                <button class="page-link" @click="changePage(1)">1</button>
              </li>

              <li class="page-item disabled" v-if="pageNum > 3">
                <span class="page-link">...</span>
              </li>

              <li class="page-item"
                  v-for="p in totalPages"
                  :key="p"
                  v-show="p !== 1 && p !== totalPages && Math.abs(p - pageNum) <= 1"
                  :class="{ active: pageNum === p }">
                <button class="page-link" @click="changePage(p)">{{ p }}</button>
              </li>

              <li class="page-item disabled" v-if="pageNum < totalPages - 2">
                <span class="page-link">...</span>
              </li>

              <li class="page-item" v-if="totalPages > 1" :class="{ active: pageNum === totalPages }">
                <button class="page-link" @click="changePage(totalPages)">{{ totalPages }}</button>
              </li>

              <li class="page-item" :class="{ disabled: pageNum === totalPages || totalPages === 0 }">
                <button class="page-link" @click="changePage(pageNum + 1)">下一页</button>
              </li>
            </ul>
          </nav>
        </div>

      </div>
    </div>

    <!-- 用户列表弹出框 -->
    <div
        v-if="userPopup"
        class="user-popup-container"
        @click="closeUserPopupByBlank"
    >
      <div
          class="user-popup"
          :style="{ top: popupTop + 'px', left: popupLeft + 'px' }"
          @click.stop
      >
        <div class="card" style="width: 600px;">
        <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <span>{{ currentTagName }} 的用户</span>
          <!-- 新增：关闭按钮 -->
          <button
              class="btn btn-sm btn-light text-primary"
              @click="closeUserPopup"
              style="padding: 2px 8px; line-height: 1;"
          >
            <i class="bi bi-x-lg"></i> 关闭
          </button>
        </div>
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="input-group">
              <input type="text" class="form-control" v-model="newUserInTag" placeholder="输入用户名">
              <button class="btn btn-primary" @click="addUserToTag">
                <i class="bi bi-plus"></i> 添加用户
              </button>
            </div>
          </div>
          <table class="table table-hover">
            <thead>
            <tr>
              <th>用户名</th>
              <th>角色</th>
              <th>电话</th>
              <th>邮箱</th>
              <th>操作</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="user in usersInTag" :key="user.userId">
              <td>{{ user.username }}</td>
              <td>
                    <span class="badge" :class="{'bg-primary': user.role === 'ADMIN', 'bg-secondary': user.role === 'USERS'}">
                      {{ user.role === 'ADMIN' ? '管理员' : '普通用户' }}
                    </span>
              </td>
              <td>{{user.phone}}</td>
              <td>{{user.email}}</td>
              <td>
                <button class="btn btn-sm btn-danger" @click="removeUserFromTag(user.userId)">
                  <i class="bi bi-trash"></i> 移除
                </button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 添加标签模态框 -->
    <div class="modal fade" :class="{show: showAddModal}" v-if="showAddModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">新增标签</h5>
            <button type="button" class="btn-close" @click="showAddModal = false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">标签名称</label>
              <input type="text" class="form-control" v-model="newTag.tagName" placeholder="请输入标签名,只能是英文以及半角下划线" required>
            </div>
            <div class="mb-3">
              <label class="form-label">描述</label>
              <input type="text" class="form-control" v-model="newTag.description" placeholder="请输入标签描述">
            </div>
            <div class="mb-3">
              <label class="form-label">父标签ID</label>
              <input type="text" class="form-control" v-model="newTag.parentTag" placeholder="请输入父标签ID(可选)">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showAddModal = false">取消</button>
            <button type="button" class="btn btn-primary" @click="addTag">创建标签</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup>
import {ref, onMounted, computed, nextTick} from 'vue';
import request from '@/utilis/requests';

const tags = ref([]);
const showAddModal = ref(false);
const newTag = ref({ tagName: '', description: '', parentTag: '' });

// --- 新增分页相关状态 ---
const pageNum = ref(1);
const pageSize = ref(10); // 每页显示10条
const total = ref(0);     // 总记录数
const keyword = ref('');
const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

const userPopup = ref(false);
const usersInTag = ref([]);
const currentTagName = ref('');
const popupTop = ref(0);
const popupLeft = ref(0);
const newUserInTag = ref('');

const fetchTags = async () => {
  try {
    const res = await request.get('/tag/tagList', {
      params: {
        keyword: keyword.value,
        pageNum: pageNum.value,
        pageSize: pageSize.value
      }
    });
    if (res.data.code === 200) {
      tags.value = res.data.data.list || [];
      total.value = res.data.data.total || 0;

    }
  } catch (err) {
    console.error('获取标签列表失败', err);
    alert('获取标签列表失败');
  }
};

const handleSearch = () => {
  pageNum.value = 1; // 搜索时重置回第一页
  fetchTags();
};

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    pageNum.value = page;
    fetchTags(); // 重新加载数据
  }
};

// 关闭用户弹窗（主动点击按钮）
const closeUserPopup = () => {
  userPopup.value = false;
  // 清空用户列表和输入框，避免下次打开残留数据
  usersInTag.value = [];
  newUserInTag.value = '';
};

// 点击空白处关闭弹窗
const closeUserPopupByBlank = (e) => {
  // 仅当点击的是最外层容器时触发
  if (e.target.classList.contains('user-popup-container')) {
    closeUserPopup();
  }
};

const showUsersInTag = async (tag) => {
  try {
    const res = await request.get(`/tag/list/users?tagId=${tag.tagId}`);
    if (res.data.code === 200) {
      usersInTag.value = res.data.data;
      currentTagName.value = tag.tagName;
      const targetElement = document.querySelector(`[data-tag-id="${tag.tagId}"]`);
      if (!targetElement) {
        console.warn(`未找到tagId为${tag.tagId}的元素`);
        userPopup.value = false;
        return;
      }
      // 1. 基础坐标计算（原逻辑）
      const rect = targetElement.getBoundingClientRect();
      let tempTop = rect.bottom + 10;
      let tempLeft = rect.left;
      // 2. 开启弹窗（让DOM渲染）
      userPopup.value = true;
      // 3. 弹窗DOM渲染后，获取实际宽高并做边界校验
      await nextTick();
      const popupElement = document.querySelector('.user-popup');
      if (popupElement) {
        const popupWidth = popupElement.offsetWidth; // 弹窗实际宽度
        const popupHeight = popupElement.offsetHeight; // 弹窗实际高度
        const screenWidth = window.innerWidth; // 屏幕可视宽度
        const screenHeight = window.innerHeight; // 屏幕可视高度

        // 计算最大可显示的left/top（防止超出屏幕，减10留边距）
        const maxLeft = screenWidth - popupWidth - 10;
        const maxTop = screenHeight - popupHeight - 10;

        // 边界钳位：保证坐标在屏幕内
        tempLeft = Math.max(0, Math.min(tempLeft, maxLeft));
        tempTop = Math.max(0, Math.min(tempTop, maxTop));
      }
      // 4. 赋值最终坐标
      popupTop.value = tempTop;
      popupLeft.value = tempLeft;
    }
  } catch (err) {
    console.error('获取标签用户失败', err);
    alert('获取标签用户失败');
  }
};

const addUserToTag = async () => {
  if (!newUserInTag.value) {
    alert('请输入用户名');
    return;
  }

  try {
    const res = await request.post('/tag/join', {
      tag: currentTagName.value,
      username: newUserInTag.value
    });

    if (res.data.code === 200) {
      alert('用户添加成功');
      newUserInTag.value = '';
      // 重新获取用户列表
      await showUsersInTag(tags.value.find(t => t.tagName === currentTagName.value));
    } else {
      alert(res.data.message || '添加失败');
    }
  } catch (err) {
    console.error('添加用户到标签失败', err);
    alert('添加用户到标签失败');
  }
};

/**
 * 批量添加标签（CSV文件上传）
 * @param {File} file - 包含标签信息的CSV文件
 * @returns {Promise}
 */
const batchCreateTags = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/tag/create/batch',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 响应标签 CSV 文件选择
 */
const onTagFileChange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const res = await batchCreateTags(file);
    if (res.data.code === 200) {
      alert('批量添加标签成功');
      await fetchTags(); // 刷新列表
    } else {
      alert(`批量添加失败: ${res.data.message}`);
    }
  } catch (err) {
    console.error('批量添加标签异常', err);
    alert('批量添加过程中发生错误');
  } finally {
    event.target.value = '';
  }
};


const addTag = async () => {
  if (!newTag.value.tagName) {
    alert('请填写标签名称');
    return;
  }

  try {
    // 准备数据，匹配后端接口期望的参数
    const tagData = {
      tag: newTag.value.tagName,
      parentTag: newTag.value.parentTag,
      description: newTag.value.description
    };

    const res = await request.post('/tag/create', tagData);
    if (res.data.code === 200) {
      alert('标签创建成功');
      showAddModal.value = false;
      newTag.value = { tagName: '', description: '', parentTag: '' };
      await fetchTags();
    } else {
      alert(res.data.message || '创建失败');
    }
  } catch (err) {
    console.error('创建标签失败', err);
    alert('创建标签失败');
  }
};

const removeUserFromTag = async (userId) => {
  if (!confirm('确定要移除该用户吗？')) return;

  try {
    // 注意：这里需要根据后端接口调整，可能需要使用 /api/v1/tag/remove/user/{userId}
    const res = await request.delete(`/tag/remove/user/${userId}`);
    if (res.data.code === 200) {
      alert('用户移除成功');
      // 重新获取用户列表
      await showUsersInTag(tags.value.find(t => t.tagName === currentTagName.value));
    } else {
      alert(res.data.message || '移除失败');
    }
  } catch (err) {
    console.error('移除用户失败', err);
    alert('移除用户失败');
  }
};

const deleteTag = async (tagId) => {
  if (!confirm('确定要删除此标签吗？')) return;

  try {
    const res = await request.delete(`/tag/delete/${tagId}`);
    if (res.data.code === 200) {
      alert('标签删除成功');
      await fetchTags();
    } else {
      alert(res.data.message || '删除失败');
    }
  } catch (err) {
    console.error('删除标签失败', err);
    alert('删除标签失败');
  }
};

onMounted(fetchTags);
</script>

<style scoped>
.tag-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.card {
  border-radius: var(--radius-lg);
  box-shadow: var(--card-shadow);
  border: none;
}

.card-header {
  background: linear-gradient(135deg, var(--primary-color) 0%, #4f46e5 100%);
  color: white;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0 !important;
  padding: 1.25rem 1.5rem;
}

.table {
  margin-bottom: 0;
}

.table-hover tbody tr:hover {
  background-color: rgba(79, 70, 229, 0.05);
}

.modal {
  display: block;
  background-color: rgba(0,0,0,0.5);
}

.user-popup {
  position: fixed;
  z-index: 1000;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  overflow: hidden;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>