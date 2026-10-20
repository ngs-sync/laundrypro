import { createRouter, createWebHistory } from 'vue-router'
import CashierView from '../views/CashierView.vue'
import { useAuthStore } from '../stores/useAuthStore'

const routes = [
  {
    path: '/',
    name: 'cashier',
    component: CashierView
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue')
  },
  {
    path: '/owner/login',
    name: 'owner-login',
    component: () => import('../views/OwnerLoginView.vue')
  },
  {
    path: '/superadmin/login',
    name: 'superadmin-login',
    component: () => import('../views/SuperadminLoginView.vue')
  },
  {
    path: '/shift',
    name: 'shift',
    component: () => import('../views/ShiftView.vue')
  },
  {
    path: '/owner',
    name: 'owner',
    component: () => import('../views/OwnerDashboardView.vue')
  },
  {
    path: '/superadmin',
    name: 'superadmin',
    component: () => import('../views/SuperadminView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

let isSessionInitialized = false

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (!isSessionInitialized) {
    await authStore.initSession()
    isSessionInitialized = true
  }

  const loginPaths = ['/login', '/owner/login', '/superadmin/login']
  const isLoginRoute = loginPaths.includes(to.path)

  // 1. Pencegahan Double-Login jika pengguna sudah terotentikasi
  if (authStore.isAuthenticated) {
    if (isLoginRoute) {
      const role = authStore.user?.role
      if (role === 'superadmin') {
        return next('/superadmin')
      } else if (role === 'owner') {
        return next('/owner')
      } else {
        return next('/')
      }
    }

    // Aturan Hak Akses Rute Berdasarkan Role
    if (to.path === '/owner') {
      const role = authStore.user?.role
      if (role === 'owner' || role === 'superadmin') {
        return next()
      } else {
        return next('/')
      }
    }

    if (to.path === '/superadmin') {
      const role = authStore.user?.role
      if (role === 'superadmin') {
        return next()
      } else if (role === 'owner') {
        return next('/owner')
      } else {
        return next('/')
      }
    }

    return next()
  }

  // 2. Jika pengguna belum terotentikasi
  if (isLoginRoute) {
    return next()
  } else {
    return next('/login')
  }
})

export default router
