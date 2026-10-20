import { createRouter, createWebHistory } from 'vue-router'
import CashierView from '../views/CashierView.vue'

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

export default router
