<template>
  <div class="user-management">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h4>用户管理</h4>
        <button class="btn btn-primary" @click="showAddModal = true">
          <i class="bi bi-plus"></i> 添加用户
        </button>
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
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.username }}</td>
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
      newUser.value = { username: '', password: '', role: 'USERS' , phone:'18977775555', email:'test11111@XXX.com'};
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
</style>