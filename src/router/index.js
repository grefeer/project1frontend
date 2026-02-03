import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import UserManagement from '../views/UserManagement.vue'

const routes = [
    { path: '/', name: 'Login', component: Login },
    { path: '/dashboard', name: 'Dashboard', component: Dashboard, beforeEnter: (to, from, next) => {
            const token = localStorage.getItem('token')
            if (!token) {
                next('/')
            } else {
                next()
            }
        } },
    { path: '/users', name: 'UserManagement', component: UserManagement, beforeEnter: (to, from, next) => {
            const token = localStorage.getItem('token')
            if (!token) {
                next('/')
            } else {
                const user = JSON.parse(localStorage.getItem('user'))
                if (user && user.role === 'ADMIN') {
                    next()
                } else {
                    next('/dashboard')
                }
            }
        } }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router