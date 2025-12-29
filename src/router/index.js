import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import DocumentManager from "@/components/DocumentManager.vue";

const routes = [
    {
        path: '/',
        name: 'Login',
        component: Login
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: Dashboard,
        // 路由守卫：如果没有 token，访问 dashboard 会自动跳回登录页
        beforeEnter: (to, from, next) => {
            const token = localStorage.getItem('token')
            if (!token) {
                next('/')
            } else {
                next()
            }
        }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router