<script setup>
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/useAuthStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

onMounted(async () => {
  await authStore.initSession()
})

function handleStopImpersonation() {
  authStore.stopImpersonation(router)
}

const roleLabel = computed(() => {
  const r = authStore.user?.role
  if (r === 'superadmin') return 'Superadmin'
  if (r === 'owner') return 'Pemilik'
  if (r === 'all_rounder' || r === 'staff') return 'Kasir'
  return r || 'User'
})

async function handleLogout() {
  const currentRole = authStore.user?.role
  await authStore.logout()
  if (currentRole === 'superadmin') {
    router.push('/superadmin/login')
  } else if (currentRole === 'owner') {
    router.push('/owner/login')
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-[#0F172A]">
    <!-- FLOATING IMPERSONATION BANNER (Stitch Design System Spec) -->
    <div
      v-if="authStore.isAuthenticated && authStore.isImpersonating"
      class="bg-[#F59E0B] text-[#78350F] px-4 py-2.5 text-xs sm:text-sm font-bold shadow-md sticky top-0 z-50 flex items-center justify-between gap-2 border-b border-[#D97706]"
    >
      <div class="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
        <span class="text-base">⚠️</span>
        <span>Mode Superadmin: Sedang mengakses data toko <strong class="underline font-black">{{ authStore.activeTenant?.name }}</strong></span>
      </div>

      <button
        @click="handleStopImpersonation"
        class="bg-[#78350F] hover:bg-[#5c280b] text-white px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all whitespace-nowrap flex items-center gap-1 active:translate-y-[2px]"
      >
        <span>↩️</span>
        <span>Keluar Impersonasi</span>
      </button>
    </div>

    <!-- MAIN APP NAVIGATION BAR -->
    <nav class="bg-[#0F172A] text-white px-4 py-2.5 border-b border-slate-800 flex items-center justify-between shadow-xs z-30">
      <div class="flex items-center gap-2">
        <span class="text-xl">🧺</span>
        <span class="font-black text-sm tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
          LaundryPro
        </span>
      </div>

      <!-- Navigation for Authenticated Users -->
      <div v-if="authStore.isAuthenticated" class="flex items-center gap-3">
        <!-- Route Navigation Pills -->
        <div class="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
          <!-- Role: all_rounder / staff (Kasir) -->
          <template v-if="authStore.user?.role === 'all_rounder' || authStore.user?.role === 'staff'">
            <router-link
              to="/"
              :class="[
                'px-2.5 py-1.5 rounded-lg transition-all',
                route.path === '/'
                  ? 'bg-[#10B981] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              ]"
            >
              <span>🛒 Kasir</span>
            </router-link>

            <router-link
              to="/shift"
              :class="[
                'px-2.5 py-1.5 rounded-lg transition-all',
                route.path === '/shift'
                  ? 'bg-[#10B981] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              ]"
            >
              <span>⚖️ Shift</span>
            </router-link>
          </template>

          <!-- Role: owner -->
          <template v-else-if="authStore.user?.role === 'owner'">
            <router-link
              to="/owner"
              :class="[
                'px-2.5 py-1.5 rounded-lg transition-all',
                route.path === '/owner'
                  ? 'bg-[#10B981] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              ]"
            >
              <span>👑 Pemilik</span>
            </router-link>

            <router-link
              to="/"
              :class="[
                'px-2.5 py-1.5 rounded-lg transition-all',
                route.path === '/'
                  ? 'bg-[#10B981] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              ]"
            >
              <span>🛒 Buka Kasir</span>
            </router-link>
          </template>

          <!-- Role: superadmin -->
          <template v-else-if="authStore.user?.role === 'superadmin'">
            <router-link
              to="/"
              :class="[
                'px-2.5 py-1.5 rounded-lg transition-all',
                route.path === '/'
                  ? 'bg-[#10B981] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              ]"
            >
              <span>🛒 Kasir</span>
            </router-link>

            <router-link
              to="/shift"
              :class="[
                'px-2.5 py-1.5 rounded-lg transition-all',
                route.path === '/shift'
                  ? 'bg-[#10B981] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              ]"
            >
              <span>⚖️ Shift</span>
            </router-link>

            <router-link
              to="/owner"
              :class="[
                'px-2.5 py-1.5 rounded-lg transition-all',
                route.path === '/owner'
                  ? 'bg-[#10B981] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              ]"
            >
              <span>👑 Pemilik</span>
            </router-link>

            <router-link
              to="/superadmin"
              :class="[
                'px-2.5 py-1.5 rounded-lg transition-all',
                route.path === '/superadmin'
                  ? 'bg-[#10B981] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              ]"
            >
              <span>⚡ Portal SaaS</span>
            </router-link>
          </template>
        </div>

        <!-- User Info & Logout Button -->
        <div class="flex items-center gap-2 pl-2 border-l border-slate-700 text-xs">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-200 hidden sm:inline">
              {{ authStore.user?.full_name || 'Pengguna' }}
            </span>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {{ roleLabel }}
            </span>
          </div>

          <button
            @click="handleLogout"
            class="bg-[#F43F5E] hover:bg-rose-600 active:translate-y-[2px] text-white px-2.5 py-1.5 rounded-lg font-bold transition-all shadow-xs flex items-center gap-1"
            title="Keluar"
          >
            <span>🚪</span>
            <span class="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- ROUTER VIEW AREA -->
    <div class="flex-1">
      <router-view />
    </div>
  </div>
</template>
