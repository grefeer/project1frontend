<template>
  <div class="user-management">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h4>用户管理</h4>
        <div class="d-flex align-items-center">
          <div class="input-group me-3">
            <input type="text" class="form-control" v-model="keyword" placeholder="搜索用户名" @keyup.enter="handleSearch">
            <button class="btn btn-outline-secondary" @click="handleSearch">
              <i class="bi bi-search"></i>
            </button>
          </div>

          <div class="d-flex gap-2">
            <input type="file" ref="userFileInput" style="display: none" @change="onUserFileChange">
            <button class="btn btn-primary" @click="$refs.userFileInput.click()">
              <i class="bi bi-file-earmark-arrow-up"></i> 批量注册
            </button>

            <button class="btn btn-primary" @click="showAddModal = true">
              <i class="bi bi-plus-lg"></i> 添加用户
            </button>
          </div>

        </div>
      </div>
      <div class="card-body">
        <table class="table table-hover">
          <thead>
          <tr>
            <th>用户名</th>
            <th>角色</th>
            <th>电话</th>
            <th>邮箱</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
          </thead>
          <tbody>
          <!-- 关键修改1：mouseover → mouseenter（避免冒泡闪烁），增加cursor:pointer提示 -->
          <tr v-for="user in users" :key="user.userId" :data-user-id="user.userId">
            <td
                @dblclick="showUserTags(user)"
                :data-user-id="user.userId"
                style="cursor: pointer; position: relative;"
            >
              {{ user.username }}
            </td>
            <td>
                <span class="badge" :class="{'bg-primary': user.role === 'ADMIN', 'bg-secondary': user.role === 'USERS'}">
                  {{ user.role === 'ADMIN' ? '管理员' : '普通用户' }}
                </span>
            </td>
            <td>{{user.phone}}</td>
            <td>{{user.email}}</td>
            <td>{{user.createdTime}}</td>
            <td>
              <button class="btn btn-sm btn-danger" @click="deleteUser(user.userId)">
                <i class="bi bi-trash"></i> 删除
              </button>
            </td>
          </tr>
          </tbody>
        </table>

        <div class="card-footer bg-white border-top-0 py-3">
          <!-- 分页部分代码不变 -->
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

        <!-- 标签弹窗（修复样式和层级） -->
        <!-- 标签弹窗：新增关闭按钮、移除鼠标离开事件 -->
        <div
            v-if="tagPopup"
            class="tag-popup"
            :style="{ top: popupTop + 'px', left: popupLeft + 'px' }"
        >
          <div class="tag-popup-header d-flex justify-content-between align-items-center">
            <span class="tag-popup-title">用户标签</span>
            <button class="tag-close-btn" @click="closeTagPopup">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="tag-popup-body">
            <div class="tag-item" v-for="(tag, index) in userTags" :key="tag.tagId || index">
              <div class="tag-name">{{ tag.tagName }}</div>
              <div class="tag-desc">{{ tag.description }}</div>
              <div class="tag-parent">
                <span class="tag-label">父标签：</span>
                <span class="tag-value">{{ tag.parentTag || '无父标签' }}</span>
              </div>
            </div>
            <div class="no-tag" v-if="userTags.length === 0">
              该用户暂无标签
            </div>
          </div>
        </div>
    </div>
  </div>

  <!-- 添加用户模态框（代码不变） -->
  <div class="modal fade" :class="{show: showAddModal}" v-if="showAddModal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">添加新用户</h5>
          <button type="button" class="btn-close" @click="showAddModal = false"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">用户名</label>
            <input type="text" class="form-control" v-model="newUser.username" placeholder="请输入用戶名" required minlength="4" maxlength="12">
          </div>
          <div class="mb-3">
            <label class="form-label">密码</label>
            <input type="password" class="form-control" v-model="newUser.password" placeholder="请输入密码" required minlength="6" maxlength="18">
          </div>
          <div class="mb-3">
            <label class="form-label">手机号</label>
            <input type="tel" class="form-control" v-model="newUser.phone" required minlength="11" maxlength="11">
          </div>
          <div class="mb-3">
            <label class="form-label">邮箱</label>
            <input type="email" class="form-control" v-model="newUser.email" required minlength="6" maxlength="20">
          </div>
          <div class="mb-3">
            <label class="form-label">角色</label>
            <select class="form-select" v-model="newUser.role">
              <option value="USERS">普通用户</option>
              <option value="ADMIN">管理员</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showAddModal = false">取消</button>
          <button type="button" class="btn btn-primary" @click="addUser">创建用户</button>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup>
import {ref, onMounted, computed, nextTick} from 'vue';
import request from '@/utilis/requests';

const users = ref([]);
const showAddModal = ref(false);
const newUser = ref({ username: '', password: '', role: 'USERS' , phone:'18977775555', email:'test11111@XXX.com'});

const pageNum = ref(1);
const pageSize = ref(10);
const total = ref(0);
const keyword = ref('');

const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

const userTags = ref([]);
const currentUserUsername = ref('');
const tagPopup = ref(false);
const popupTop = ref(0);
const popupLeft = ref(0);

const userFileInput = ref(null);

const fetchUsers = async () => {
  try {
    const res = await request.get('/tag/list', {
      params: {
        keyword: keyword.value,
        pageNum: pageNum.value,
        pageSize: pageSize.value
      }
    });
    if (res.data.code === 200) {
      users.value = res.data.data.list || [];
      total.value = res.data.data.total || 0;
    }
  } catch (err) {
    console.error('获取用户列表失败', err);
    alert('获取用户列表失败');
  }
};

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    pageNum.value = page;
    fetchUsers();
  }
};

// 新增：关闭标签弹窗方法
const closeTagPopup = () => {
  tagPopup.value = false;
  userTags.value = [];
};

// 修改showUserTags：移除isPopupHovered相关逻辑
const showUserTags = async (user) => {
  try {
    const userId = Number(user.userId);
    // 1. 重置状态，立即显示弹窗
    userTags.value = [];
    tagPopup.value = true;
    currentUserUsername.value = user.username;

    // 2. 获取触发元素位置
    const targetElement = document.querySelector(`[data-user-id="${user.userId}"]`);
    if (!targetElement) {
      console.warn(`未找到userId为${user.userId}的元素`);
      tagPopup.value = false;
      return;
    }
    const rect = targetElement.getBoundingClientRect();

    // 3. 请求标签数据
    const res = await request.get(`/tag/list/tag/admin`, { params: { userId } });
    if (res.data.code === 200) {
      userTags.value = res.data.data;
    }

    // 4. 计算弹窗位置（原有逻辑保留）
    await nextTick();
    const popupElement = document.querySelector('.tag-popup');
    if (!popupElement) {
      tagPopup.value = false;
      return;
    }
    const popupWidth = popupElement.offsetWidth + 10;
    const popupHeight = popupElement.offsetHeight + 10;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    let tempTop, tempLeft;
    if (rect.bottom + popupHeight <= screenHeight) {
      tempTop = rect.bottom + 10;
    } else {
      tempTop = rect.top - popupHeight - 10;
    }
    if (rect.left + popupWidth <= screenWidth) {
      tempLeft = rect.left;
    } else {
      tempLeft = rect.right - popupWidth;
    }
    tempTop = Math.max(10, Math.min(tempTop, screenHeight - popupHeight - 10));
    tempLeft = Math.max(10, Math.min(tempLeft, screenWidth - popupWidth - 10));

    popupTop.value = tempTop;
    popupLeft.value = tempLeft;
  } catch (err) {
    console.error('获取用户标签失败', err);
    tagPopup.value = false;
  }
};

const batchRegisterUser = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/user/register/batch',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
};

const onUserFileChange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const res = await batchRegisterUser(file);
    if (res.data.code === 200) {
      alert(`批量注册成功: ${res.data.message || '操作完成'}`);
      await fetchUsers();
    } else {
      alert(`批量注册失败: ${res.data.message}`);
    }
  } catch (err) {
    console.error('批量注册异常', err);
    alert('批量注册过程中发生错误');
  } finally {
    event.target.value = '';
  }
};

const handleSearch = () => {
  pageNum.value = 1;
  fetchUsers();
};

const addUser = async () => {
  if (!newUser.value.username ||
      !newUser.value.password ||
      !newUser.value.phone ||
      !newUser.value.email) {
    alert('请填写完整信息');
    return;
  }

  try {
    const res = await request.post('/user/register', newUser.value);
    if (res.data.code === 200) {
      alert('用户创建成功');
      showAddModal.value = false;
      newUser.value = { username: '', password: '', role: 'USERS', phone: '18977775555', email: 'test11111@XXX.com' };
      await fetchUsers();
    } else {
      alert(res.data.message || '创建失败');
    }
  } catch (err) {
    console.error('创建用户失败', err);
    alert('创建用户失败');
  }
};

const deleteUser = async (userId) => {
  if (!confirm('确定要删除此用户吗？')) return;

  try {
    const res = await request.delete(`/user/${userId}`);
    if (res.data.code === 200) {
      alert('用户删除成功');
      await fetchUsers();
    } else {
      alert(res.data.message || '删除失败');
    }
  } catch (err) {
    console.error('删除用户失败', err);
    alert('删除用户失败');
  }
};

onMounted(fetchUsers);
</script>


<style scoped>
.user-management {
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

.badge {
  padding: 0.4em 0.8em;
  font-weight: 500;
}

.modal {
  display: block;
  background-color: rgba(0,0,0,0.5);
}

/* 关键修改4：优化弹窗样式，增加pointer-events确保交互，优化层级 */
.tag-popup {
  position: fixed;
  z-index: 9999;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  width: 280px;
  animation: fadeIn 0.2s ease-out;
  pointer-events: auto; /* 确保弹窗能接收鼠标事件 */
  /* 防止弹窗被选中导致闪烁 */
  user-select: none;
  -webkit-user-select: none;
}

.tag-popup-header {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: white;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 500;
}

.tag-popup-body {
  padding: 16px;
}

.tag-item {
  padding: 12px;
  border-radius: 6px;
  background-color: #f8fafc;
  margin-bottom: 8px;
  border-left: 3px solid #4f46e5;
}

.tag-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.tag-desc {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 6px;
  line-height: 1.4;
}

.tag-parent {
  font-size: 12px;
  color: #94a3b8;
}

.tag-label {
  font-weight: 500;
}

.tag-value {
  color: #475569;
}

.no-tag {
  text-align: center;
  padding: 16px;
  color: #94a3b8;
  font-size: 13px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tag-popup {
  max-width: calc(100vw - 40px); /* 限制最大宽度，防止溢出 */
}

.tag-popup {
  position: fixed;
  z-index: 9999;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  width: 280px;
  /* 新增：限制最大高度为屏幕的80%，超出滚动 */
  max-height: 80vh;
  overflow-y: auto;
  animation: fadeIn 0.2s ease-out;
  pointer-events: auto;
  user-select: none;
  -webkit-user-select: none;
  /* 新增：禁止弹窗触发鼠标事件冒泡（关键：避免干扰用户名的mouseleave） */
  pointer-events: auto;
  isolation: isolate;
}

/* 弹窗头部布局 + 关闭按钮样式 */
.tag-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: white;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 500;
}

.tag-close-btn {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  transition: color 0.2s;
}

.tag-close-btn:hover {
  color: #e2e8f0;
}

/* 移除弹窗的pointer-events和isolation（不再需要） */
.tag-popup {
  position: fixed;
  z-index: 9999;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  width: 280px;
  max-height: 80vh;
  overflow-y: auto;
  animation: fadeIn 0.2s ease-out;
  user-select: none;
  -webkit-user-select: none;
  max-width: calc(100vw - 40px);
}

</style>
