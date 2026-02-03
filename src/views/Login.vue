<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios'; // 建议后续封装到 request.js 中

const router = useRouter();
const formData = reactive({
username: '',
password: '',
});

const handleSubmit = async () => {
  try {
    const res = await axios.post('/api/v1/user/login', {
      username: formData.username,
      password: formData.password,
    });

    if (res.data.code === 200) {
  localStorage.setItem('token', res.data.data.token);
  // 存储用户信息
  localStorage.setItem('user', JSON.stringify(res.data.data.user));
  await router.push('/dashboard');
    } else {
      alert(res.data.message);
    }
  } catch (e) {
    alert('登录失败');
  }
};
</script>

<template>
<div class="login-container">
  <div class="card auth-card">
    <h3 class="text-center mb-4">用户登录</h3>
    <form @submit.prevent="handleSubmit">
      <div class="mb-3">
        <label class="form-label">用户名</label>
        <input type="text" class="form-control" v-model="formData.username" required minlength="2">
      </div>
      <div class="mb-3">
        <label class="form-label">密码</label>
        <input type="password" class="form-control" v-model="formData.password" required minlength="6">
      </div>
      <button type="submit" class="btn btn-primary w-100">登录</button>
    </form>
  </div>
</div>
</template>

<style scoped>
.login-container {
background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
display: flex;
align-items: center;
justify-content: center;
height: 100vh;
}

.auth-card {
width: 100%;
max-width: 440px;
padding: 40px;
border: none;
border-radius: var(--radius-lg);
background: rgba(255, 255, 255, 0.9);
backdrop-filter: blur(10px);
box-shadow: var(--card-shadow);
}

h3 {
font-weight: 700;
letter-spacing: -0.025em;
color: #111827;
}

.form-label {
font-size: 0.875rem;
font-weight: 500;
color: #4b5563;
}

.form-control, .form-select {
padding: 12px 16px;
border-radius: var(--radius-md);
border: 1px solid #e5e7eb;
transition: all 0.2s;
}

.form-control:focus {
border-color: var(--primary-color);
box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
}

.btn-primary {
padding: 12px;
font-weight: 600;
border-radius: var(--radius-md);
background: var(--primary-color);
border: none;
transition: transform 0.1s;
}

.btn-primary:active {
transform: scale(0.98);
}
</style>