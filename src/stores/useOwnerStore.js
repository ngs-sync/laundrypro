import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './useAuthStore'

export const useOwnerStore = defineStore('owner', () => {
  const authStore = useAuthStore()

  // Filter Tanggal: 'today' | 'this_month' | 'custom'
  const dateFilter = ref('this_month')
  const customStartDate = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
  const customEndDate = ref(new Date().toISOString().slice(0, 10))

  // State Data
  const transactions = ref([])
  const expenses = ref([])
  const services = ref([])
  const promotions = ref([])
  const tenantLoyalty = ref({
    spend_per_point: 10000,
    point_redemption_value: 1000
  })

  const isLoading = ref(false)
  const errorMessage = ref('')

  // Helper: get current tenant_id
  function getTenantId() {
    return authStore.activeTenant?.id || 'ed0ab708-7d43-45cc-a6db-8714a599e950'
  }

  // Calculate Start & End Date based on filter
  const dateRange = computed(() => {
    const now = new Date()
    let start = new Date()
    let end = new Date()

    if (dateFilter.value === 'today') {
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
    } else if (dateFilter.value === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    } else if (dateFilter.value === 'custom') {
      start = customStartDate.value ? new Date(`${customStartDate.value}T00:00:00`) : new Date(0)
      end = customEndDate.value ? new Date(`${customEndDate.value}T23:59:59`) : new Date()
    }

    return { start, end }
  })

  // Filtered Transactions & Expenses based on Date Range
  const filteredTransactions = computed(() => {
    const { start, end } = dateRange.value
    return transactions.value.filter(tx => {
      const txDate = new Date(tx.created_at || tx.date)
      return txDate >= start && txDate <= end
    })
  })

  const filteredExpenses = computed(() => {
    const { start, end } = dateRange.value
    return expenses.value.filter(exp => {
      const expDate = new Date(exp.date || exp.created_at)
      return expDate >= start && expDate <= end
    })
  })

  // Metrics Financial & Operational Calculations
  const totalOmzet = computed(() => {
    return filteredTransactions.value.reduce((sum, tx) => sum + (Number(tx.total_amount) || 0), 0)
  })

  const totalPengeluaran = computed(() => {
    return filteredExpenses.value.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)
  })

  const labaBersih = computed(() => {
    return totalOmzet.value - totalPengeluaran.value
  })

  const totalKgProcessed = computed(() => {
    return filteredTransactions.value.reduce((sum, tx) => {
      if (tx.service_type === 'kiloan' || tx.service_type === 'mixed') {
        const kgFromItems = tx.items ? tx.items.filter(i => i.unit === 'kg' || i.type === 'kiloan').reduce((s, i) => s + (Number(i.quantity || i.qty) || 0), 0) : 0
        return sum + (kgFromItems || tx.total_kg || 0)
      }
      return sum
    }, 0)
  })

  const totalCoinsUsed = computed(() => {
    return filteredTransactions.value.reduce((sum, tx) => {
      if (tx.service_type === 'koin' || tx.service_type === 'mixed') {
        const coinFromItems = tx.items ? tx.items.filter(i => i.unit === 'paket' || i.type === 'coin').reduce((s, i) => s + (Number(i.quantity || i.qty) || 0), 0) : 0
        return sum + (coinFromItems || tx.total_coins || 0)
      }
      return sum
    }, 0)
  })

  const paymentMethodBreakdown = computed(() => {
    let cash = 0
    let qris = 0
    let cashCount = 0
    let qrisCount = 0

    filteredTransactions.value.forEach(tx => {
      const amt = Number(tx.total_amount) || 0
      if (tx.payment_method === 'qris') {
        qris += amt
        qrisCount++
      } else {
        cash += amt
        cashCount++
      }
    })

    return {
      cash,
      qris,
      cashCount,
      qrisCount
    }
  })

  // Fetch Financial Transactions
  async function fetchTransactions() {
    const tenantId = getTenantId()
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data && data.length > 0) {
        transactions.value = data
      } else {
        // Fallback seed data if empty in local demo
        transactions.value = getSeedTransactions()
      }
    } catch (err) {
      console.warn('Using seed transactions due to fetch error:', err.message)
      transactions.value = getSeedTransactions()
    }
  }

  // Fetch Expenses
  async function fetchExpenses() {
    const tenantId = getTenantId()
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false })

      if (error) throw error
      if (data && data.length > 0) {
        expenses.value = data
      } else {
        expenses.value = getSeedExpenses()
      }
    } catch (err) {
      console.warn('Using seed expenses due to fetch error:', err.message)
      expenses.value = getSeedExpenses()
    }
  }

  // Add Expense
  async function addExpense(payload) {
    isLoading.value = true
    const tenantId = getTenantId()
    const newExpense = {
      tenant_id: tenantId,
      category: payload.category,
      amount: Number(payload.amount),
      date: payload.date || new Date().toISOString().slice(0, 10),
      notes: payload.notes || '',
      created_at: new Date().toISOString()
    }

    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([newExpense])
        .select()

      if (!error && data && data.length > 0) {
        expenses.value.unshift(data[0])
      } else {
        newExpense.id = `exp-${Date.now()}`
        expenses.value.unshift(newExpense)
      }
    } catch (err) {
      console.warn('Local save for addExpense:', err)
      newExpense.id = `exp-${Date.now()}`
      expenses.value.unshift(newExpense)
    } finally {
      isLoading.value = false
    }
  }

  // Delete Expense
  async function deleteExpense(id) {
    try {
      await supabase.from('expenses').delete().eq('id', id)
    } catch (err) {
      console.warn('Local delete for expense:', err)
    }
    expenses.value = expenses.value.filter(exp => exp.id !== id)
  }

  // Fetch Services
  async function fetchServices() {
    const tenantId = getTenantId()
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })

      if (error) throw error
      if (data && data.length > 0) {
        services.value = data
      } else {
        services.value = getSeedServices()
      }
    } catch (err) {
      console.warn('Using seed services due to fetch error:', err.message)
      services.value = getSeedServices()
    }
  }

  // Add Service
  async function addService(payload) {
    isLoading.value = true
    const tenantId = getTenantId()
    const newService = {
      tenant_id: tenantId,
      name: payload.name,
      category: payload.category || 'kiloan',
      price: Number(payload.price),
      unit: payload.unit || 'kg',
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      created_at: new Date().toISOString()
    }

    try {
      const { data, error } = await supabase
        .from('services')
        .insert([newService])
        .select()

      if (!error && data && data.length > 0) {
        services.value.push(data[0])
      } else {
        newService.id = `srv-${Date.now()}`
        services.value.push(newService)
      }
    } catch (err) {
      console.warn('Local save for addService:', err)
      newService.id = `srv-${Date.now()}`
      services.value.push(newService)
    } finally {
      isLoading.value = false
    }
  }

  // Update Service Price & Active Status
  async function updateService(id, updates) {
    const serviceIndex = services.value.findIndex(s => s.id === id)
    if (serviceIndex > -1) {
      services.value[serviceIndex] = { ...services.value[serviceIndex], ...updates }
    }

    try {
      await supabase
        .from('services')
        .update(updates)
        .eq('id', id)
    } catch (err) {
      console.warn('Local update for service:', err)
    }
  }

  // Fetch Tenant Loyalty Settings
  async function fetchTenantLoyalty() {
    const tenantId = getTenantId()
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('spend_per_point, point_redemption_value')
        .eq('id', tenantId)
        .single()

      if (!error && data) {
        tenantLoyalty.value = {
          spend_per_point: data.spend_per_point || 10000,
          point_redemption_value: data.point_redemption_value || 1000
        }
      }
    } catch (err) {
      console.warn('Error fetching tenant loyalty settings:', err)
    }
  }

  // Update Tenant Loyalty Settings
  async function updateTenantLoyalty(payload) {
    isLoading.value = true
    const tenantId = getTenantId()
    tenantLoyalty.value = {
      spend_per_point: Number(payload.spend_per_point),
      point_redemption_value: Number(payload.point_redemption_value)
    }

    try {
      await supabase
        .from('tenants')
        .update({
          spend_per_point: Number(payload.spend_per_point),
          point_redemption_value: Number(payload.point_redemption_value)
        })
        .eq('id', tenantId)
    } catch (err) {
      console.warn('Local update for tenant loyalty:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Fetch Promotions
  async function fetchPromotions() {
    const tenantId = getTenantId()
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data && data.length > 0) {
        promotions.value = data
      } else {
        promotions.value = getSeedPromotions()
      }
    } catch (err) {
      console.warn('Using seed promotions due to fetch error:', err.message)
      promotions.value = getSeedPromotions()
    }
  }

  // Add Promotion Voucher
  async function addPromotion(payload) {
    isLoading.value = true
    const tenantId = getTenantId()
    const newPromo = {
      tenant_id: tenantId,
      code: payload.code.toUpperCase().trim(),
      discount_type: payload.discount_type, // 'percentage' | 'fixed'
      discount_value: Number(payload.discount_value),
      start_date: payload.start_date,
      end_date: payload.end_date,
      is_active: true,
      created_at: new Date().toISOString()
    }

    try {
      const { data, error } = await supabase
        .from('promotions')
        .insert([newPromo])
        .select()

      if (!error && data && data.length > 0) {
        promotions.value.unshift(data[0])
      } else {
        newPromo.id = `promo-${Date.now()}`
        promotions.value.unshift(newPromo)
      }
    } catch (err) {
      console.warn('Local save for addPromotion:', err)
      newPromo.id = `promo-${Date.now()}`
      promotions.value.unshift(newPromo)
    } finally {
      isLoading.value = false
    }
  }

  // Toggle Promotion Status
  async function togglePromotionActive(id) {
    const promo = promotions.value.find(p => p.id === id)
    if (promo) {
      promo.is_active = !promo.is_active
      try {
        await supabase
          .from('promotions')
          .update({ is_active: promo.is_active })
          .eq('id', id)
      } catch (err) {
        console.warn('Local update for promotion:', err)
      }
    }
  }

  // Load All Data
  async function fetchAllOwnerData() {
    isLoading.value = true
    await Promise.all([
      fetchTransactions(),
      fetchExpenses(),
      fetchServices(),
      fetchTenantLoyalty(),
      fetchPromotions()
    ])
    isLoading.value = false
  }

  // Seed Data Helpers for Fallback
  function getSeedTransactions() {
    const today = new Date().toISOString().slice(0, 10)
    return [
      {
        id: 'tx-1',
        receipt_number: 'TRX-241019-1001',
        total_amount: 35000,
        payment_method: 'qris',
        service_type: 'kiloan',
        total_kg: 5,
        total_coins: 0,
        created_at: `${today}T09:30:00.000Z`,
        items: [{ id: 'i-1', name: 'Cuci Kiloan Reguler', qty: 5, unit: 'kg', price: 7000 }]
      },
      {
        id: 'tx-2',
        receipt_number: 'TRX-241019-1002',
        total_amount: 50000,
        payment_method: 'cash',
        service_type: 'koin',
        total_kg: 0,
        total_coins: 2,
        created_at: `${today}T11:15:00.000Z`,
        items: [{ id: 'i-2', name: 'Paket Koin Cuci + Pengering', qty: 2, unit: 'paket', price: 25000 }]
      },
      {
        id: 'tx-3',
        receipt_number: 'TRX-241019-1003',
        total_amount: 42000,
        payment_method: 'qris',
        service_type: 'kiloan',
        total_kg: 6,
        total_coins: 0,
        created_at: `${today}T14:20:00.000Z`,
        items: [{ id: 'i-3', name: 'Cuci Kiloan Express', qty: 6, unit: 'kg', price: 7000 }]
      },
      {
        id: 'tx-4',
        receipt_number: 'TRX-241019-1004',
        total_amount: 75000,
        payment_method: 'cash',
        service_type: 'mixed',
        total_kg: 4,
        total_coins: 1,
        created_at: `${today}T16:45:00.000Z`,
        items: [
          { id: 'i-4', name: 'Cuci Kiloan Reguler', qty: 4, unit: 'kg', price: 7000 },
          { id: 'i-5', name: 'Paket Koin Self-Service', qty: 1, unit: 'paket', price: 25000 }
        ]
      }
    ]
  }

  function getSeedExpenses() {
    const today = new Date().toISOString().slice(0, 10)
    return [
      { id: 'exp-1', category: 'Listrik', amount: 150000, date: today, notes: 'Token Listrik PLN Toko', created_at: `${today}T08:00:00Z` },
      { id: 'exp-2', category: 'Air', amount: 80000, date: today, notes: 'Tagihan Air PDAM', created_at: `${today}T08:05:00Z` },
      { id: 'exp-3', category: 'Operasional', amount: 45000, date: today, notes: 'Beli Deterjen Liquid 5L', created_at: `${today}T10:00:00Z` }
    ]
  }

  function getSeedServices() {
    return [
      { id: 'srv-1', name: 'Cuci Kiloan Reguler', category: 'kiloan', price: 7000, unit: 'kg', is_active: true },
      { id: 'srv-2', name: 'Cuci Kiloan Express (6 Jam)', category: 'kiloan', price: 10000, unit: 'kg', is_active: true },
      { id: 'srv-3', name: 'Paket Koin Washer + Dryer', category: 'koin', price: 25000, unit: 'paket', is_active: true },
      { id: 'srv-4', name: 'Cuci Bedcover Heavy', category: 'satuan', price: 35000, unit: 'pcs', is_active: true },
      { id: 'srv-5', name: 'Cuci Sepatu Premium', category: 'satuan', price: 30000, unit: 'pasang', is_active: false }
    ]
  }

  function getSeedPromotions() {
    const today = new Date().toISOString().slice(0, 10)
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    return [
      { id: 'promo-1', code: 'BERSIH50', discount_type: 'percentage', discount_value: 10, start_date: today, end_date: nextMonth, is_active: true },
      { id: 'promo-2', code: 'PROMOHEMAT10K', discount_type: 'fixed', discount_value: 10000, start_date: today, end_date: nextMonth, is_active: true }
    ]
  }

  return {
    dateFilter,
    customStartDate,
    customEndDate,
    transactions,
    expenses,
    services,
    promotions,
    tenantLoyalty,
    isLoading,
    errorMessage,
    dateRange,
    filteredTransactions,
    filteredExpenses,
    totalOmzet,
    totalPengeluaran,
    labaBersih,
    totalKgProcessed,
    totalCoinsUsed,
    paymentMethodBreakdown,
    fetchTransactions,
    fetchExpenses,
    addExpense,
    deleteExpense,
    fetchServices,
    addService,
    updateService,
    fetchTenantLoyalty,
    updateTenantLoyalty,
    fetchPromotions,
    addPromotion,
    togglePromotionActive,
    fetchAllOwnerData
  }
})
