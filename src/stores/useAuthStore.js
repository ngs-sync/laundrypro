import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const defaultTenant = {
    id: 'ed0ab708-7d43-45cc-a6db-8714a599e950',
    name: 'Laundry Sparkle Express',
    phone: '081234567890',
    status: 'Active',
    trialDays: 30,
    quotaUsed: 124,
    quotaLimit: 500
  }

  const currentUser = ref({
    id: 'ed0ab708-7d43-45cc-a6db-8714a599e950',
    name: 'Staf Kasir',
    email: 'admin@laundrypro.id'
  })

  const isSuperadmin = ref(true)

  // Load initial impersonation state from localStorage if available
  const savedImpersonation = localStorage.getItem('laundrypro_impersonation')
  let initialTenant = defaultTenant
  let initialImpersonating = false

  if (savedImpersonation) {
    try {
      const parsed = JSON.parse(savedImpersonation)
      if (parsed?.activeTenant) {
        initialTenant = parsed.activeTenant
        initialImpersonating = true
      }
    } catch (e) {
      console.warn('Failed to parse impersonation state:', e)
    }
  }

  const activeTenant = ref(initialTenant)
  const isImpersonating = ref(initialImpersonating)

  // Active shift state
  const savedShift = localStorage.getItem('laundrypro_active_shift')
  let parsedShift = null
  if (savedShift) {
    try {
      parsedShift = JSON.parse(savedShift)
    } catch (e) {
      console.warn('Failed to parse active shift:', e)
    }
  }
  const activeShift = ref(parsedShift)

  function impersonateTenant(tenant, router = null) {
    activeTenant.value = { ...tenant }
    isImpersonating.value = true
    localStorage.setItem(
      'laundrypro_impersonation',
      JSON.stringify({ activeTenant: activeTenant.value })
    )
    if (router) {
      router.push('/')
    }
  }

  function stopImpersonation(router = null) {
    activeTenant.value = { ...defaultTenant }
    isImpersonating.value = false
    localStorage.removeItem('laundrypro_impersonation')
    if (router) {
      router.push('/superadmin')
    }
  }

  function toggleSuperadmin() {
    isSuperadmin.value = !isSuperadmin.value
  }

  function openShift(initialCash, initialCoins) {
    const shiftData = {
      id: `shift-${Date.now()}`,
      openedAt: new Date().toISOString(),
      initialCash: Number(initialCash) || 0,
      initialCoins: Number(initialCoins) || 0,
      tenantId: activeTenant.value.id,
      userId: currentUser.value.id
    }
    activeShift.value = shiftData
    localStorage.setItem('laundrypro_active_shift', JSON.stringify(shiftData))
    return shiftData
  }

  function clearActiveShift() {
    activeShift.value = null
    localStorage.removeItem('laundrypro_active_shift')
  }

  return {
    currentUser,
    isSuperadmin,
    defaultTenant,
    activeTenant,
    isImpersonating,
    activeShift,
    impersonateTenant,
    stopImpersonation,
    toggleSuperadmin,
    openShift,
    clearActiveShift
  }
})
