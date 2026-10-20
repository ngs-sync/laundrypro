import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export const useSuperadminStore = defineStore('superadmin', () => {
  // --- STATE ---
  const tenants = ref([])
  const plans = ref([])
  const isLoading = ref(false)
  const errorMessage = ref('')

  // Default seed plans fallback if Supabase is offline/empty
  const seedPlans = [
    {
      id: '1441143d-db68-40cc-94b7-879cfea47a49',
      plan_code: 'starter',
      name: 'Starter (Gratis)',
      billing_type: 'monthly',
      price: 0,
      price_per_order: 0,
      order_quota: 50,
      max_outlets: 1,
      max_staff: 1,
      is_active: true
    },
    {
      id: '87112388-fd51-447b-8874-98d8b95a4c4d',
      plan_code: 'pro',
      name: 'Pro (Rame)',
      billing_type: 'monthly',
      price: 50000,
      price_per_order: 0,
      order_quota: 0,
      max_outlets: 3,
      max_staff: 5,
      is_active: true
    },
    {
      id: '87d61d7b-4882-4fe2-ab23-748fc8914b99',
      plan_code: 'business',
      name: 'Business (Multi)',
      billing_type: 'monthly',
      price: 150000,
      price_per_order: 0,
      order_quota: 0,
      max_outlets: 99,
      max_staff: 99,
      is_active: true
    },
    {
      id: 'fcb2a71b-1204-446c-8c75-716a7500d894',
      plan_code: 'pay_as_you_go',
      name: 'Pay-as-You-Go',
      billing_type: 'pay_as_you_go',
      price: 0,
      price_per_order: 250,
      order_quota: 50,
      max_outlets: 1,
      max_staff: 1,
      is_active: true
    }
  ]

  // Default seed tenants fallback
  const seedTenants = [
    {
      id: 'ed0ab708-7d43-45cc-a6db-8714a599e950',
      business_name: 'LaundryPro Demo Store',
      tenant_code: 'LAUN011',
      phone_number: '081234567890',
      plan_id: '1441143d-db68-40cc-94b7-879cfea47a49',
      billing_type: 'monthly',
      wallet_balance: 0,
      subscription_status: 'active',
      is_deleted: false,
      subscription_plans: seedPlans[0]
    }
  ]

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
      if (data && data.length > 0) {
        plans.value = data
      } else {
        plans.value = seedPlans
      }
    } catch (err) {
      console.warn('Gagal mengambil subscription_plans dari Supabase, menggunakan seed data:', err)
      plans.value = seedPlans
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
      console.warn('Gagal mengupdate plan di Supabase, mengupdate secara lokal:', err)
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
      if (data && data.length > 0) {
        tenants.value = data
      } else {
        tenants.value = seedTenants
      }
    } catch (err) {
      console.warn('Gagal mengambil tenants dari Supabase, menggunakan seed data:', err)
      tenants.value = seedTenants
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
    errorMessage.value = ''
    try {
      const newTenantData = {
        business_name: payload.business_name || payload.name,
        tenant_code: payload.tenant_code ? payload.tenant_code.trim().toUpperCase() : `LAUN${Math.floor(100 + Math.random() * 900)}`,
        phone_number: payload.phone_number || payload.phone || '',
        plan_id: payload.plan_id || null,
        billing_type: payload.billing_type || 'monthly',
        wallet_balance: Number(payload.wallet_balance) || 0,
        subscription_status: payload.status || payload.subscription_status || 'active',
        is_deleted: false,
        created_at: new Date().toISOString()
      }

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert([newTenantData])
        .select(`
          *,
          subscription_plans (*)
        `)
        .single()

      let insertedTenant = tenantData

      if (tenantError) {
        console.warn('Error saving tenant to Supabase, fallback local:', tenantError)
        insertedTenant = {
          ...newTenantData,
          id: `tenant-${Date.now()}`,
          subscription_plans: plans.value.find(p => p.id === newTenantData.plan_id) || null
        }
      }

      // Buat akun owner di tabel `users`
      const ownerUsername = payload.owner_username || `owner_${insertedTenant.tenant_code.toLowerCase()}`
      const newOwnerUser = {
        tenant_id: insertedTenant.id,
        full_name: payload.owner_name || `Owner ${insertedTenant.business_name}`,
        username: ownerUsername,
        role: 'owner',
        is_active: true,
        created_at: new Date().toISOString()
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([newOwnerUser])
        .select('*')

      if (userError) {
        console.warn('Error saving owner user to Supabase:', userError)
      }

      // Tambahkan ke state lokal
      tenants.value.unshift(insertedTenant)

      return {
        tenant: insertedTenant,
        owner: userData ? userData[0] : newOwnerUser,
        initialPassword: payload.owner_password || '123456'
      }
    } catch (err) {
      console.error('Error in createTenant:', err)
      errorMessage.value = err.message || 'Gagal mendaftarkan toko baru.'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Action updateTenant(id, payload): Update status (active/trial/suspended), plan_id, atau saldo wallet_balance.
   */
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
