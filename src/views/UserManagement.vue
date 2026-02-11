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

<!--          <div class="me-2">-->
<!--            <input-->
<!--                type="file"-->
<!--                ref="userFileInput"-->
<!--                style="display: none"-->
<!--                accept=".csv"-->
<!--                @change="onUserFileChange"-->
<!--            >-->
<!--            <button class="btn btn-outline-light" @click="$refs.userFileInput.click()">-->
<!--              <i class="bi bi-file-earmark-arrow-up"></i> 批量注册-->
<!--            </button>-->
<!--          </div>-->

<!--          <button class="btn btn-primary" @click="showAddModal = true">-->
<!--            <i class="bi bi-plus"></i> 添加用户-->
<!--          </button>-->
          <div class="d-flex gap-2">
<!--            <input type="file" ref="userFileInput" style="display: none" accept=".csv" @change="onUserFileChange">-->
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
          <tr v-for="user in users" :key="user.userId" :data-user-id="user.userId">
            <td @mouseover="showUserTags(user)" @mouseleave="hideUserTags" :data-user-id="user.userId">
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

        <!-- 标签弹窗（如果有） -->
        <!-- 美化后的标签弹窗 -->
        <div
            v-if="tagPopup"
            class="tag-popup"
            :style="{ top: popupTop + 'px', left: popupLeft + 'px' }"
        >
          <div class="tag-popup-header">
            <span class="tag-popup-title">用户标签</span>
          </div>
          <div class="tag-popup-body">
            <!-- 循环渲染每个标签，只展示需要的字段 -->
            <div class="tag-item" v-for="(tag, index) in userTags" :key="tag.tagId || index">
              <div class="tag-name">{{ tag.tagName }}</div>
              <div class="tag-desc">{{ tag.description }}</div>
              <div class="tag-parent">
                <span class="tag-label">父标签：</span>
                <span class="tag-value">{{ tag.parentTag || '无父标签' }}</span>
              </div>
            </div>
            <!-- 无标签时的友好提示 -->
            <div class="no-tag" v-if="userTags.length === 0">
              该用户暂无标签
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- 添加用户模态框 -->
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
import { ref, onMounted } from 'vue';
import request from '@/utilis/requests';

const users = ref([]);
const showAddModal = ref(false);
const newUser = ref({ username: '', password: '', role: 'USERS' , phone:'18977775555', email:'test11111@XXX.com'});

// --- 新增分页相关状态 ---
const pageNum = ref(1);
const pageSize = ref(10); // 每页显示10条
const total = ref(0);     // 总记录数
const keyword = ref('');

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

const showUserTags = async (user) => {
  try {
    const userId = Number(user.userId);

    // 获取当前用户的标签
    const res = await request.get(`/tag/list/tag/admin`, {
      params: {
        userId: userId,
      }
    });

    if (res.data.code === 200) {
      userTags.value = res.data.data;
      currentUserUsername.value = user.username;

      // 【关键修复】先获取元素，再判断是否存在
      const targetElement = document.querySelector(`[data-user-id="${user.userId}"]`);
      // 空值判断：元素不存在则不显示弹窗
      if (!targetElement) {
        console.warn(`未找到userId为${user.userId}的元素`);
        tagPopup.value = false;
        return;
      }

      // 计算弹出框位置
      const rect = targetElement.getBoundingClientRect();
      popupTop.value = rect.bottom + 10;
      popupLeft.value = rect.left;

      tagPopup.value = true;
    }
  } catch (err) {
    console.error('获取用户标签失败', err);
    alert('获取用户标签失败');
    // 异常时关闭弹窗，避免状态异常
    tagPopup.value = false;
  }
};

/**
 * 批量注册用户（CSV文件上传）
 * @param {File} file - 包含用户信息的CSV文件
 * @returns {Promise}
 */
const batchRegisterUser = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/user/register/batch',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data' // 必须指定表单格式
    }
  })
}

/**
 * 响应 CSV 文件选择并触发上传
 */
const onUserFileChange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // // 校验文件格式
  // if (!file.name.endsWith('.csv')) {
  //   alert('请上传 CSV 格式的文件');
  //   return;
  // }

  try {
    const res = await batchRegisterUser(file);
    if (res.data.code === 200) {
      alert(`批量注册成功: ${res.data.message || '操作完成'}`);
      await fetchUsers(); // 刷新列表
    } else {
      alert(`批量注册失败: ${res.data.message}`);
    }
  } catch (err) {
    console.error('批量注册异常', err);
    alert('批量注册过程中发生错误');
  } finally {
    // 清空 input，允许连续上传同名文件
    event.target.value = '';
  }
};


const hideUserTags = () => {
  tagPopup.value = false;
};

const handleSearch = () => {
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
/* 标签弹窗主样式 */
.tag-popup {
  position: fixed;
  z-index: 9999; /* 确保在最上层 */
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  width: 280px; /* 固定宽度，避免变形 */
  animation: fadeIn 0.2s ease-out;
}

/* 弹窗头部 */
.tag-popup-header {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: white;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 500;
}

/* 弹窗内容区 */
.tag-popup-body {
  padding: 16px;
}

/* 单个标签项 */
.tag-item {
  padding: 12px;
  border-radius: 6px;
  background-color: #f8fafc;
  margin-bottom: 8px;
  border-left: 3px solid #4f46e5;
}

/* 标签名称 */
.tag-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

/* 标签描述 */
.tag-desc {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 6px;
  line-height: 1.4;
}

/* 父标签区域 */
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

/* 无标签提示 */
.no-tag {
  text-align: center;
  padding: 16px;
  color: #94a3b8;
  font-size: 13px;
}

/* 弹窗动画 */
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

/* 避免弹窗超出页面右侧 */
.tag-popup {
  max-width: calc(100vw - 40px); /* 限制最大宽度，防止溢出 */
}
</style>