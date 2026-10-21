import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const user = ref(null)
  const tenantCode = ref(localStorage.getItem('tenantCode') || '')
  const isAuthenticated = ref(false)
  const isLoading = ref(false)
  const activeTenant = ref(null)

  /**
   * Action fetchTenantProfile: Fetch profil tenant murni dari Supabase berdasarkan tenantId.
   */
  async function fetchTenantProfile(tenantId) {
    if (!tenantId) return null
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .maybeSingle()

      if (!error && data) {
        activeTenant.value = data
        return data
      }
    } catch (err) {
      console.warn('Gagal mengambil profil tenant dari Supabase:', err)
    }
    return null
  }

  // --- ACTIONS ---

  /**
   * Action loginStaff: Login untuk staf kasir menggunakan kode toko & username.
   */
  async function loginStaff(tenantCodeInput, username, password, rememberTenantCode = false) {
    isLoading.value = true
    try {
      const cleanTenantCode = tenantCodeInput.trim().toLowerCase()
      const cleanUsername = username.trim().toLowerCase()

      // Rumus virtual email
      const email = `${cleanUsername}.${cleanTenantCode}@laundrypro.app`

      // Authenticate dengan Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) throw authError

      if (!authData?.user) {
        throw new Error('Gagal melakukan autentikasi user.')
      }

      // Ambil data detail pengguna dari tabel 'users' filter by auth_user_id
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single()

      if (profileError || !userProfile) {
        throw new Error('Data profil pengguna tidak ditemukan.')
      }

      // Validasi status is_active
      if (userProfile.is_active === false) {
        throw new Error('Akun Anda tidak aktif. Silakan hubungi administrator.')
      }

      // Set State
      user.value = {
        id: userProfile.id,
        full_name: userProfile.full_name,
        role: userProfile.role || 'staff',
        tenant_id: userProfile.tenant_id
      }
      tenantCode.value = tenantCodeInput.trim()
      isAuthenticated.value = true

      if (userProfile.tenant_id) {
        await fetchTenantProfile(userProfile.tenant_id)
      }

      // Simpan / hapus tenantCode ke localStorage sesuai opsi rememberTenantCode
      if (rememberTenantCode) {
        localStorage.setItem('tenantCode', tenantCode.value)
      } else {
        localStorage.removeItem('tenantCode')
      }

      return authData
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Action loginOwner: Login untuk Owner menggunakan username & password.
   */
  async function loginOwner({ username, password }) {
    isLoading.value = true
    try {
      const cleanUsername = username ? username.trim() : ''
      if (!cleanUsername) {
        throw new Error('Username pemilik tidak ditemukan')
      }

      // Langkah 1: Kueri ke tabel public.users mencari user yang cocok dengan username dan role owner/superadmin
      const { data: userData, error: userQueryError } = await supabase
        .from('users')
        .select('*')
        .ilike('username', cleanUsername)
        .in('role', ['owner', 'superadmin'])
        .maybeSingle()

      if (userQueryError) {
        console.warn('Gagal mencari user berdasarkan username:', userQueryError)
      }

      if (!userData) {
        throw new Error('Username pemilik tidak ditemukan')
      }

      // Langkah 2: Ambil email yang terhubung dengan akun tersebut
      let userEmail = userData.email

      if (!userEmail) {
        if (userData.auth_user_id && userData.auth_user_id.includes('@')) {
          userEmail = userData.auth_user_id
        } else if (userData.tenant_id) {
          const tenantProfile = await fetchTenantProfile(userData.tenant_id)
          if (tenantProfile && tenantProfile.tenant_code) {
            userEmail = `${cleanUsername.toLowerCase()}.${tenantProfile.tenant_code.toLowerCase()}@laundrypro.app`
          }
        }
      }

      if (!userEmail) {
        userEmail = `${cleanUsername.toLowerCase()}@laundrypro.app`
      }

      // Langkah 3: Eksekusi signInWithPassword
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password
      })

      if (authError) {
        throw new Error('Username atau password tidak sesuai')
      }

      if (!authData || !authData.user) {
        throw new Error('Gagal melakukan autentikasi user.')
      }

      // Langkah 4: Simpan sesi dan set state
      const resolvedRole = userData.role || 'owner'
      const resolvedTenantId = userData.tenant_id || null

      user.value = {
        id: userData.id || authData.user.id,
        full_name: userData.full_name || authData.user.user_metadata?.full_name || authData.user.email,
        role: resolvedRole,
        tenant_id: resolvedTenantId
      }
      isAuthenticated.value = true

      if (resolvedTenantId) {
        await fetchTenantProfile(resolvedTenantId)
      }

      return authData
    } catch (err) {
      if (err.message === 'Username pemilik tidak ditemukan') {
        throw err
      }
      throw new Error('Username atau password tidak sesuai')
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Action loginOwnerOrSuperadmin: Login untuk Owner atau Superadmin menggunakan email & password.
   */
  async function loginOwnerOrSuperadmin(email, password, defaultRole = 'owner') {
    isLoading.value = true
    try {
      const cleanEmail = email.trim()
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      })

      if (authError) throw authError

      if (!authData?.user) {
        throw new Error('Gagal melakukan autentikasi user.')
      }

      // Ambil data profil dari tabel 'users'
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle()

      if (profileError) {
        console.warn('Gagal mengambil data profil dari tabel users:', profileError)
      }

      let resolvedRole = userProfile?.role || authData.user.user_metadata?.role || authData.user.app_metadata?.role

      if (!resolvedRole) {
        if (defaultRole === 'superadmin' || cleanEmail.toLowerCase().includes('superadmin')) {
          resolvedRole = 'superadmin'
        } else {
          resolvedRole = defaultRole || 'owner'
        }
      } else if (defaultRole === 'superadmin' && resolvedRole !== 'superadmin') {
        if (cleanEmail.toLowerCase().includes('superadmin') || authData.user.user_metadata?.role === 'superadmin') {
          resolvedRole = 'superadmin'
        }
      }

      const resolvedTenantId = userProfile?.tenant_id || authData.user.user_metadata?.tenant_id || null

      // Set State
      user.value = {
        id: userProfile?.id || authData.user.id,
        full_name: userProfile?.full_name || authData.user.user_metadata?.full_name || authData.user.email,
        role: resolvedRole,
        tenant_id: resolvedTenantId
      }
      isAuthenticated.value = true

      if (resolvedTenantId) {
        await fetchTenantProfile(resolvedTenantId)
      }

      return authData
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Action logout: Keluar dari aplikasi & reset state user ke nilai awal.
   */
  async function logout() {
    isLoading.value = true
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Error saat logout:', err)
    } finally {
      user.value = null
      activeTenant.value = null
      isAuthenticated.value = false
      isLoading.value = false
    }
  }

  /**
   * Action initSession: Memeriksa sesi aktif dari Supabase Auth saat aplikasi pertama dimuat.
   */
  async function initSession() {
    isLoading.value = true
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) throw error

      if (session?.user) {
        const authUser = session.user

        const { data: userProfile } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', authUser.id)
          .maybeSingle()

        let resolvedRole = userProfile?.role || authUser.user_metadata?.role || authUser.app_metadata?.role

        if (!resolvedRole) {
          if (authUser.email?.toLowerCase().includes('superadmin')) {
            resolvedRole = 'superadmin'
          } else if (userProfile) {
            resolvedRole = 'owner'
          } else {
            resolvedRole = 'staff'
          }
        }

        const resolvedTenantId = userProfile?.tenant_id || authUser.user_metadata?.tenant_id || null

        user.value = {
          id: userProfile?.id || authUser.id,
          full_name: userProfile?.full_name || authUser.user_metadata?.full_name || authUser.email,
          role: resolvedRole,
          tenant_id: resolvedTenantId
        }
        isAuthenticated.value = true

        if (resolvedTenantId) {
          await fetchTenantProfile(resolvedTenantId)
        }
      } else {
        user.value = null
        activeTenant.value = null
        isAuthenticated.value = false
      }
    } catch (err) {
      console.warn('Gagal inisialisasi sesi:', err)
      user.value = null
      activeTenant.value = null
      isAuthenticated.value = false
    } finally {
      isLoading.value = false
    }
  }

  // --- HELPER STATE / ACTIONS ---
  const currentUser = computed(() => {
    if (user.value) {
      return {
        id: user.value.id,
        name: user.value.full_name || 'Pengguna',
        full_name: user.value.full_name,
        role: user.value.role,
        tenant_id: user.value.tenant_id
      }
    }
    return null
  })

  const isSuperadmin = ref(false)

  const savedImpersonation = localStorage.getItem('laundrypro_impersonation')
  let initialImpersonating = false

  if (savedImpersonation) {
    try {
      const parsed = JSON.parse(savedImpersonation)
      if (parsed?.activeTenant) {
        activeTenant.value = parsed.activeTenant
        initialImpersonating = true
      }
    } catch (e) {
      console.warn('Failed to parse impersonation state:', e)
    }
  }

  const isImpersonating = ref(initialImpersonating)

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
    activeTenant.value = null
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
      tenantId: activeTenant.value?.id || user.value?.tenant_id,
      userId: currentUser.value?.id || user.value?.id
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
    // Primary auth state & actions
    user,
    tenantCode,
    isAuthenticated,
    isLoading,
    loginStaff,
    loginOwner,
    loginOwnerOrSuperadmin,
    logout,
    initSession,
    fetchTenantProfile,

    // Helpers / Compatibility state & actions
    currentUser,
    isSuperadmin,
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
