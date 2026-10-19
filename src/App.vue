<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/useAuthStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

function handleStopImpersonation() {
  authStore.stopImpersonation(router)
}
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-[#0F172A]">
    <!-- FLOATING IMPERSONATION BANNER (Stitch Design System Spec) -->
    <div
      v-if="authStore.isImpersonating"
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

      <!-- Route Navigation Pills -->
      <div class="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
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
          v-if="authStore.isSuperadmin"
          to="/superadmin"
          :class="[
            'px-2.5 py-1.5 rounded-lg transition-all',
            route.path === '/superadmin'
              ? 'bg-[#10B981] text-white shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
          ]"
        >
          <span>⚡ SaaS</span>
        </router-link>
      </div>
    </nav>

    <!-- ROUTER VIEW AREA -->
    <div class="flex-1">
      <router-view />
    </div>
  </div>
</template>
