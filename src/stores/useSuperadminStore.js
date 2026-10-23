import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export const useSuperadminStore = defineStore('superadmin', () => {
  // --- STATE ---
  const tenants = ref([])
  const plans = ref([])
  const isLoading = ref(false)
  const errorMessage = ref('')

  // --- ACTIONS ---

  /**
   * Action fetchPlans(): Ambil daftar paket langganan dari `subscription_plans`.
   */
  async function fetchPlans() {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true })

      if (error) throw error
      plans.value = data || []
    } catch (err) {
      console.warn('Gagal mengambil subscription_plans dari Supabase:', err)
      plans.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Action updatePlan(id, payload): Kelola harga dan kuota pada tabel `subscription_plans`.
   */
  async function updatePlan(id, payload) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update({
          price: payload.price !== undefined ? Number(payload.price) : undefined,
          price_per_order: payload.price_per_order !== undefined ? Number(payload.price_per_order) : undefined,
          order_quota: payload.order_quota !== undefined ? Number(payload.order_quota) : undefined,
          name: payload.name !== undefined ? payload.name : undefined,
          is_active: payload.is_active !== undefined ? payload.is_active : undefined
        })
        .eq('id', id)
        .select('*')

      if (error) throw error

      const index = plans.value.findIndex(p => p.id === id)
      if (index !== -1) {
        if (data && data.length > 0) {
          plans.value[index] = data[0]
        } else {
          plans.value[index] = { ...plans.value[index], ...payload }
        }
      }
    } catch (err) {
      console.warn('Gagal mengupdate plan di Supabase:', err)
      const index = plans.value.findIndex(p => p.id === id)
      if (index !== -1) {
        plans.value[index] = { ...plans.value[index], ...payload }
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Action fetchTenants(): Ambil daftar tenant (filter: `is_deleted = false`), join dengan `subscription_plans`.
   */
  async function fetchTenants() {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      tenants.value = data || []
    } catch (err) {
      console.warn('Gagal mengambil tenants dari Supabase:', err)
      tenants.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Action createTenant(payload):
   * - Simpan baris baru ke tabel `tenants` (nama -> business_name, tenant_code manual, phone_number, plan_id, billing_type, wallet_balance, status -> subscription_status).
   * - Buat akun owner terkait di tabel `users`.
   */
  async function createTenant(payload) {
    isLoading.value = true
    errorMessage.value = ""
    try {
      const { data, error } = await supabase.functions.invoke("create-owner", {
        body: {
          username: payload.username,
          password: payload.password,
          full_name: payload.owner_name,
          tenant_name: payload.name,
          tenant_code: payload.tenant_code,
          plan_id: payload.plan_id,
          address: payload.address,
          phone: payload.phone
        }
      })

      if (error || data?.error) {
        throw new Error(data?.error || error.message)
      }

      // Perbarui daftar tenants di state store
      await fetchTenants()

      const createdTenant = data?.tenant || data?.data?.tenant || tenants.value.find(t => t.tenant_code === payload.tenant_code) || {
        business_name: payload.name,
        tenant_code: payload.tenant_code,
        phone_number: payload.phone
      }

      const createdOwner = data?.user || data?.owner || data?.data?.owner || {
        username: payload.username,
        full_name: payload.owner_name
      }

      return {
        tenant: createdTenant,
        owner: createdOwner,
        initialPassword: payload.password
      }
    } catch (err) {
      console.error("Error in createTenant:", err)
      errorMessage.value = err.message || "Gagal mendaftarkan toko baru."
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateTenant(id, payload) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const updateData = {}
      if (payload.subscription_status !== undefined) updateData.subscription_status = payload.subscription_status
      if (payload.status !== undefined) updateData.subscription_status = payload.status
      if (payload.plan_id !== undefined) updateData.plan_id = payload.plan_id
      if (payload.wallet_balance !== undefined) updateData.wallet_balance = Number(payload.wallet_balance)
      if (payload.business_name !== undefined) updateData.business_name = payload.business_name
      if (payload.phone_number !== undefined) updateData.phone_number = payload.phone_number
      if (payload.billing_type !== undefined) updateData.billing_type = payload.billing_type

      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          subscription_plans (*)
        `)

      const index = tenants.value.findIndex(t => t.id === id)
      if (index !== -1) {
        if (!error && data && data.length > 0) {
          tenants.value[index] = data[0]
        } else {
          const selectedPlan = plans.value.find(p => p.id === payload.plan_id) || tenants.value[index].subscription_plans
          tenants.value[index] = {
            ...tenants.value[index],
            ...updateData,
            subscription_plans: selectedPlan
          }
        }
      }
    } catch (err) {
      console.warn('Gagal update tenant di Supabase, mengupdate lokal:', err)
      const index = tenants.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tenants.value[index] = {
          ...tenants.value[index],
          ...payload
        }
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Action softDeleteTenant(id): Set `is_deleted = true` dan status/subscription_status = 'suspended'.
   */
  async function softDeleteTenant(id) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          is_deleted: true,
          subscription_status: 'suspended',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      tenants.value = tenants.value.filter(t => t.id !== id)
    } catch (err) {
      console.warn('Gagal soft delete tenant di Supabase, menghapus dari list lokal:', err)
      tenants.value = tenants.value.filter(t => t.id !== id)
    } finally {
      isLoading.value = false
    }
  }

  return {
    tenants,
    plans,
    isLoading,
    errorMessage,
    fetchPlans,
    updatePlan,
    fetchTenants,
    createTenant,
    updateTenant,
    softDeleteTenant
  }
})
