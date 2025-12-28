<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios'; // 建议后续封装到 request.js 中

const router = useRouter();
const isLoginMode = ref(true);

// 响应式表单数据
const formData = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  phone: '',
  email: '',
  role: 'USERS'
});

const BASE_URL = '/api/v1'; // 与原项目保持一致

// 提交处理逻辑
const handleSubmit = async () => {
  if (isLoginMode.value) {
    await handleLogin();
  } else {
    await handleRegister();
  }
};

// 登录逻辑
const handleLogin = async () => {
  try {
    const res = await axios.post(`${BASE_URL}/user/login`, {
      username: formData.username,
      password: formData.password
    });
    if (res.data.code === 200) {
      localStorage.setItem('token', res.data.data.token);
      router.push('/dashboard'); // 替换原来的 location.href
    } else {
      alert(res.data.message);
    }
  } catch (e) {
    alert('登录失败');
  }
};

// 注册逻辑
const handleRegister = async () => {
  // 1. 基础校验
  if (formData.password !== formData.confirmPassword) {
    alert('两次输入的密码不一致！');
    return;
  }

  // 2. 手机号校验
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(formData.phone)) {
    alert('电话号码格式不正确，请输入11位手机号！');
    return;
  }

  try {
    const res = await axios.post(`${BASE_URL}/user/register`, {
      username: formData.username,
      password: formData.password,
      role: formData.role,
      phone: formData.phone,
      email: formData.email
    });

    if (res.data.code === 200) {
      alert('注册成功，请登录');
      isLoginMode.value = true;
    } else {
      alert(res.data.message);
    }
  } catch (err) {
    alert('注册失败: ' + (err.response?.data?.message || err.message));
  }
};
</script>

<template>
  <div class="login-container">
    <div class="card auth-card">
      <h3 class="text-center mb-4">{{ isLoginMode ? '用户登录' : '用户注册' }}</h3>

      <form @submit.prevent="handleSubmit">
        <div class="mb-3">
          <label class="form-label">用户名</label>
          <input
              type="text"
              class="form-control"
              v-model="formData.username"
              required
              minlength="2"
          >
        </div>

        <div class="mb-3">
          <label class="form-label">密码</label>
          <input
              type="password"
              class="form-control"
              v-model="formData.password"
              required
              minlength="6"
          >
        </div>

        <div v-if="!isLoginMode">
          <div class="mb-3">
            <label class="form-label">确认密码</label>
            <input
                type="password"
                class="form-control"
                v-model="formData.confirmPassword"
                required
            >
          </div>

          <div class="mb-3">
            <label class="form-label">电话 (**必填**)</label>
            <input
                type="tel"
                class="form-control"
                v-model="formData.phone"
                placeholder="请输入11位电话号码"
                required
            >
          </div>

          <div class="mb-3">
            <label class="form-label">邮箱 (**必填**)</label>
            <input
                type="email"
                class="form-control"
                v-model="formData.email"
                placeholder="test@example.com"
                required
            >
          </div>

          <div class="mb-3">
            <label class="form-label">角色</label>
            <select class="form-select" v-model="formData.role">
              <option value="USERS">普通用户</option>
              <option value="ADMIN">管理员</option>
            </select>
          </div>
        </div>

        <button type="submit" class="btn btn-primary w-100">
          {{ isLoginMode ? '登录' : '注册' }}
        </button>
      </form>

      <div class="mt-3 text-center">
        <a href="#" @click.prevent="isLoginMode = !isLoginMode">
          {{ isLoginMode ? '没有账号？去注册' : '已有账号？去登录' }}
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 继承自原 index.html 的样式 */
.login-container {
  background-color: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
.auth-card {
  width: 100%;
  max-width: 400px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
</style>