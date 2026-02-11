<template>
  <div class="profile-container p-4">
    <div class="row g-4">
      <div class="col-md-4">
        <div class="card border-0 shadow-sm text-center p-4 h-100">
          <div class="avatar-lg bg-primary text-white rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 100px; height: 100px; font-size: 40px;">
            {{ userInfo.username?.charAt(0).toUpperCase() }}
          </div>
          <h4 class="mb-1">{{ userInfo.username }}</h4>
          <span :class="['badge mb-3 px-3 py-2', userInfo.role === 'ADMIN' ? 'bg-warning text-dark' : 'bg-info text-white']">
            <i class="bi" :class="userInfo.role === 'ADMIN' ? 'bi-shield-check' : 'bi-person'"></i>
            {{ userInfo.role === 'ADMIN' ? '系统管理员' : '普通用户' }}
          </span>
          <hr>
          <div class="text-start mt-3">
            <p class="small text-muted mb-1">注册时间</p>
            <p>{{ formatTime(userInfo.createdTime) }}</p>
            <p class="small text-muted mb-1">账号 ID</p>
            <p class="font-monospace">{{ userInfo.userId }}</p>
          </div>
          <button class="btn btn-outline-danger w-100 mt-auto" @click="$emit('logout')">
            <i class="bi bi-box-arrow-right me-2"></i>退出登录
          </button>
        </div>
      </div>

      <div class="col-md-8">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-white border-0 pt-4 px-4">
            <ul class="nav nav-tabs card-header-tabs" id="profileTab" role="tablist">
              <li class="nav-item">
                <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#security" type="button">安全设置</button>
              </li>
              <li class="nav-item">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tags" type="button">我的标签</button>
              </li>
            </ul>
          </div>

          <div class="card-body p-4 tab-content">
            <div class="tab-pane fade show active" id="security">
              <h5 class="mb-4">修改登录密码</h5>
              <div class="mb-3">
                <label class="form-label text-muted small">旧密码</label>
                <input type="password" class="form-control" v-model="pwdForm.oldPassword" placeholder="输入当前密码">
              </div>
              <div class="mb-3">
                <label class="form-label text-muted small">新密码</label>
                <input type="password" class="form-control" v-model="pwdForm.newPassword" placeholder="6-18位字母或数字">
              </div>
              <div class="mb-4">
                <label class="form-label text-muted small">确认新密码</label>
                <input type="password" class="form-control" v-model="pwdForm.confirmPassword" placeholder="再次输入新密码">
              </div>
              <button class="btn btn-primary px-4" @click="changePassword" :disabled="isSubmitting">
                {{ isSubmitting ? '提交中...' : '更新密码' }}
              </button>
            </div>

            <div class="tab-pane fade" id="tags">
              <h5 class="mb-4">拥有的权限标签</h5>
              <div v-if="userTags.length > 0" class="d-flex flex-wrap gap-2">
                <span v-for="tag in userTags" :key="tag.tagId" class="tag-badge">
                  <i class="bi bi-tag-fill me-1"></i>{{ tag.tagName }}
                </span>
              </div>
              <div v-else class="text-center py-5 text-muted">
                <i class="bi bi-info-circle mb-2 d-block" style="font-size: 2rem;"></i>
                暂无分配的特殊标签权限
              </div>
              <div class="mt-4 p-3 bg-light rounded small text-muted">
                注：标签由管理员分配，决定了您可以访问的加密文档范围。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import request from '@/utilis/requests';

const userInfo = ref({});
const userTags = ref([]);
const isSubmitting = ref(false);
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' });

// 初始化获取信息
const init = async () => {
  try {
    const infoRes = await request.get('/user/info');
    userInfo.value = infoRes.data.data;

    // 获取用户标签 (对应 SpecialTagController.getUser 接口)
    const tagRes = await request.get('/tag/list/tag/user');
    if (tagRes.data.code === 200) {
      userTags.value = tagRes.data.data;
    }
  } catch (err) {
    console.error("加载个人中心失败", err);
  }
};

const changePassword = async () => {
  if (pwdForm.value.newPassword !== pwdForm.value.confirmPassword) {
    alert("两次输入的密码不一致");
    return;
  }

  isSubmitting.value = true;
  try {
    const res = await request.put('/user/change/password', {
      username: userInfo.value.username,
      oldPassword: pwdForm.value.oldPassword,
      newPassword: pwdForm.value.newPassword
    });

    if (res.data.code === 200) {
      alert("密码修改成功，请重新登录");
      localStorage.clear();
      window.location.href = '/';
    } else {
      alert(res.data.message);
    }
  } catch (err) {
    alert("请求失败，请稍后重试");
  } finally {
    isSubmitting.value = false;
  }
};

const formatTime = (time) => {
  if (!time) return '未知';
  return new Date(time).toLocaleString();
};

onMounted(init);
</script>

<style scoped>
.profile-container {
  max-width: 1100px;
  margin: 0 auto;
}
.card {
  border-radius: 12px;
  transition: transform 0.2s;
}
.nav-tabs .nav-link {
  color: #64748b;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 1rem 1.5rem;
}
.nav-tabs .nav-link.active {
  color: var(--primary-color);
  border-bottom: 2px solid var(--primary-color);
  font-weight: 600;
}
.tag-badge {
  background: #f1f5f9;
  color: #475569;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  border: 1px solid #e2e8f0;
}
</style>