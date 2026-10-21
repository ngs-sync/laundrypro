import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './useAuthStore'

export const useOwnerStore = defineStore('owner', () => {
  const authStore = useAuthStore()

  // Branch Switcher & Multi-Branch State
  const branches = ref([])
  const activeBranchId = ref(localStorage.getItem('owner_active_branch_id') || '')
  const staffList = ref([])

  // Filter Tanggal: 'today' | '7_days' | 'this_month' | 'custom'
  const dateFilter = ref('this_month')
  const customStartDate = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
  const customEndDate = ref(new Date().toISOString().slice(0, 10))

  // Filter Status Transaksi: 'all' | 'diproses' | 'siap_diambil' | 'selesai' | 'void'
  const statusFilter = ref('all')

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

  // Helper: get current active tenant_id
  function getTenantId() {
    return activeBranchId.value || authStore.activeTenant?.id || 'ed0ab708-7d43-45cc-a6db-8714a599e950'
  }

  // Active Branch Plan & Outlets Limit
  const activeBranch = computed(() => {
    return branches.value.find(b => b.id === activeBranchId.value) || branches.value[0] || null
  })

  const maxOutlets = computed(() => {
    const plan = activeBranch.value?.subscription_plans
    if (plan && typeof plan.max_outlets === 'number') {
      return plan.max_outlets
    }
    return 1
  })

  const canAddBranch = computed(() => {
    return branches.value.length < maxOutlets.value
  })

  // Fetch branches for logged in owner user
  async function fetchBranches() {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const authUserId = sessionData?.session?.user?.id || authStore.user?.id

      if (authUserId) {
        // Query tenants where owner_user_id matches
        const { data: directTenants, error: directErr } = await supabase
          .from('tenants')
          .select('*, subscription_plans(*)')
          .eq('owner_user_id', authUserId)
          .eq('is_deleted', false)

        if (!directErr && directTenants && directTenants.length > 0) {
          branches.value = directTenants
        } else {
          // Fallback via users table
          const { data: userRecords, error: userError } = await supabase
            .from('users')
            .select('tenant_id, tenants(*, subscription_plans(*))')
            .eq('auth_user_id', authUserId)

          if (!userError && userRecords && userRecords.length > 0) {
            const tenantList = userRecords
              .map(ur => ur.tenants)
              .filter(t => t && !t.is_deleted)
            if (tenantList.length > 0) {
              branches.value = tenantList
            }
          }
        }
      }

      if (branches.value.length === 0) {
        if (authStore.activeTenant) {
          branches.value = [authStore.activeTenant]
        } else {
          branches.value = [
            {
              id: 'ed0ab708-7d43-45cc-a6db-8714a599e950',
              business_name: 'LaundryPro Demo Store',
              tenant_code: 'LAUN011',
              subscription_plans: { max_outlets: 3, name: 'Pro' }
            }
          ]
        }
      }

      if (!activeBranchId.value || !branches.value.some(b => b.id === activeBranchId.value)) {
        activeBranchId.value = branches.value[0].id
        localStorage.setItem('owner_active_branch_id', activeBranchId.value)
      }
    } catch (err) {
      console.warn('Error fetching owner branches:', err)
      if (branches.value.length === 0) {
        branches.value = [
          authStore.activeTenant || {
            id: 'ed0ab708-7d43-45cc-a6db-8714a599e950',
            business_name: 'LaundryPro Demo Store',
            tenant_code: 'LAUN011',
            subscription_plans: { max_outlets: 3, name: 'Pro' }
          }
        ]
      }
      if (!activeBranchId.value) {
        activeBranchId.value = branches.value[0].id
      }
    }
  }

  function setActiveBranch(branchId) {
    activeBranchId.value = branchId
    localStorage.setItem('owner_active_branch_id', branchId)
    fetchAllOwnerData()
  }

  // Validate Live Tenant Code Uniqueness globally in Supabase
  async function checkTenantCodeUnique(code) {
    if (!code) return false
    const formattedCode = code.replace(/\s+/g, '').toUpperCase()
    if (!formattedCode) return false

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id')
        .eq('tenant_code', formattedCode)

      if (error) {
        console.warn('Error checking tenant code uniqueness:', error)
        // If error, perform check against local branches
        return !branches.value.some(b => b.tenant_code === formattedCode)
      }

      return !data || data.length === 0
    } catch (err) {
      console.warn('Exception checking tenant code:', err)
      return !branches.value.some(b => b.tenant_code === formattedCode)
    }
  }

  // Create New Branch (Self-Service)
  async function createBranch(payload) {
    isLoading.value = true
    errorMessage.value = ''

    const cleanCode = payload.tenant_code.replace(/\s+/g, '').toUpperCase()
    const { data: sessionData } = await supabase.auth.getSession()
    const currentAuthUserId = sessionData?.session?.user?.id || authStore.user?.id || null
    const primaryBranch = branches.value[0] || {}

    const newBranchData = {
      business_name: payload.business_name,
      address: payload.address || '',
      tenant_code: cleanCode,
      phone_number: payload.phone_number || primaryBranch.phone_number || '',
      owner_user_id: primaryBranch.owner_user_id || currentAuthUserId,
      plan_id: primaryBranch.plan_id || null,
      billing_type: primaryBranch.billing_type || 'monthly',
      subscription_status: primaryBranch.subscription_status || 'active',
      is_deleted: false,
      created_at: new Date().toISOString()
    }

    try {
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert([newBranchData])
        .select('*, subscription_plans(*)')
        .single()

      let insertedBranch = tenantData

      if (tenantError) {
        console.warn('Error inserting new branch in Supabase, using local fallback:', tenantError)
        insertedBranch = {
          ...newBranchData,
          id: `branch-${Date.now()}`,
          subscription_plans: primaryBranch.subscription_plans || { max_outlets: 3 }
        }
      }

      // Inject standard default services (Koin & Kiloan) for the new branch
      const defaultServices = [
        {
          tenant_id: insertedBranch.id,
          name: 'Cuci Kiloan Reguler',
          category: 'kiloan',
          price: 7000,
          unit: 'kg',
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          tenant_id: insertedBranch.id,
          name: 'Cuci Kiloan Express (6 Jam)',
          category: 'kiloan',
          price: 10000,
          unit: 'kg',
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          tenant_id: insertedBranch.id,
          name: 'Paket Koin Washer + Dryer',
          category: 'koin',
          price: 25000,
          unit: 'paket',
          is_active: true,
          created_at: new Date().toISOString()
        }
      ]

      const { error: serviceErr } = await supabase
        .from('services')
        .insert(defaultServices)

      if (serviceErr) {
        console.warn('Error injecting standard services:', serviceErr)
      }

      // Update local state
      branches.value.push(insertedBranch)
      setActiveBranch(insertedBranch.id)

      return insertedBranch
    } catch (err) {
      console.error('Failed to create branch:', err)
      errorMessage.value = err.message || 'Gagal menambahkan cabang baru.'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Fetch Staff list for owner's branches
  async function fetchStaff() {
    try {
      const branchIds = branches.value.map(b => b.id)
      if (branchIds.length === 0) {
        staffList.value = getSeedStaff()
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('*, tenants(business_name, tenant_code)')
        .in('tenant_id', branchIds)
        .eq('role', 'staff')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        staffList.value = data
      } else {
        staffList.value = getSeedStaff()
      }
    } catch (err) {
      console.warn('Using seed staff due to fetch error:', err)
      staffList.value = getSeedStaff()
    }
  }

  // Create Staff assigned to specific branch
  async function createStaff(payload) {
    isLoading.value = true
    const assignedTenant = branches.value.find(b => b.id === payload.tenant_id) || branches.value[0]
    const tenantCodeClean = (assignedTenant?.tenant_code || 'LAUN011').toLowerCase()
    const usernameClean = payload.username.trim().toLowerCase()
    const virtualEmail = `${usernameClean}.${tenantCodeClean}@laundrypro.app`

    let createdAuthUserId = null

    // Attempt Supabase Auth Sign Up if possible
    try {
      const { data: authData } = await supabase.auth.signUp({
        email: virtualEmail,
        password: payload.password,
        options: {
          data: {
            full_name: payload.full_name,
            role: 'staff',
            tenant_id: payload.tenant_id
          }
        }
      })
      if (authData?.user) {
        createdAuthUserId = authData.user.id
      }
    } catch (authErr) {
      console.warn('Supabase auth sign up notice:', authErr)
    }

    const newStaffUser = {
      tenant_id: payload.tenant_id,
      full_name: payload.full_name,
      username: usernameClean,
      role: 'staff',
      is_active: true,
      auth_user_id: createdAuthUserId,
      created_at: new Date().toISOString()
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .insert([newStaffUser])
        .select('*, tenants(business_name, tenant_code)')

      if (!error && data && data.length > 0) {
        staffList.value.unshift(data[0])
      } else {
        newStaffUser.id = `staff-${Date.now()}`
        newStaffUser.tenants = { business_name: assignedTenant?.business_name, tenant_code: assignedTenant?.tenant_code }
        staffList.value.unshift(newStaffUser)
      }
    } catch (err) {
      console.warn('Local save for createStaff:', err)
      newStaffUser.id = `staff-${Date.now()}`
      newStaffUser.tenants = { business_name: assignedTenant?.business_name, tenant_code: assignedTenant?.tenant_code }
      staffList.value.unshift(newStaffUser)
    } finally {
      isLoading.value = false
    }
  }

  // Update Staff Details (e.g. branch assignment, full name, username, active status)
  async function updateStaff(id, payload) {
    isLoading.value = true
    const staffIndex = staffList.value.findIndex(s => s.id === id)
    const assignedTenant = branches.value.find(b => b.id === payload.tenant_id)

    const updates = {
      ...(payload.full_name && { full_name: payload.full_name }),
      ...(payload.username && { username: payload.username.trim().toLowerCase() }),
      ...(payload.tenant_id && { tenant_id: payload.tenant_id }),
      ...(payload.is_active !== undefined && { is_active: payload.is_active }),
      updated_at: new Date().toISOString()
    }

    if (staffIndex > -1) {
      staffList.value[staffIndex] = {
        ...staffList.value[staffIndex],
        ...updates,
        ...(assignedTenant && { tenants: { business_name: assignedTenant.business_name, tenant_code: assignedTenant.tenant_code } })
      }
    }

    try {
      await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
    } catch (err) {
      console.warn('Local update for staff:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Calculate Start & End Date based on filter
  const dateRange = computed(() => {
    const now = new Date()
    let start = new Date()
    let end = new Date()

    if (dateFilter.value === 'today') {
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
    } else if (dateFilter.value === '7_days') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    } else if (dateFilter.value === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    } else if (dateFilter.value === 'custom') {
      start = customStartDate.value ? new Date(`${customStartDate.value}T00:00:00`) : new Date(0)
      end = customEndDate.value ? new Date(`${customEndDate.value}T23:59:59`) : new Date()
    }

    return { start, end }
  })

  // Filtered Transactions based on Date Range and Status Filter
  const filteredTransactions = computed(() => {
    const { start, end } = dateRange.value
    return transactions.value.filter(tx => {
      const txDate = new Date(tx.created_at || tx.date)
      const matchesDate = txDate >= start && txDate <= end
      if (!matchesDate) return false

      if (statusFilter.value === 'all') return true
      if (statusFilter.value === 'void') return tx.is_void === true
      if (tx.is_void) return false

      const prodStatus = (tx.production_status || 'diproses').toLowerCase()
      if (statusFilter.value === 'diproses') {
        return prodStatus === 'diproses' || prodStatus === 'proses'
      }
      if (statusFilter.value === 'siap_diambil') {
        return prodStatus === 'siap_diambil' || prodStatus === 'siap'
      }
      if (statusFilter.value === 'selesai') {
        return prodStatus === 'selesai'
      }

      return true
    })
  })

  const filteredExpenses = computed(() => {
    const { start, end } = dateRange.value
    return expenses.value.filter(exp => {
      const expDate = new Date(exp.date || exp.created_at)
      return expDate >= start && expDate <= end
    })
  })

  // Metrics Financial & Operational Calculations (EXCLUDING VOID TRANSACTIONS)
  const validTransactions = computed(() => {
    return filteredTransactions.value.filter(tx => !tx.is_void)
  })

  const totalOmzet = computed(() => {
    return validTransactions.value.reduce((sum, tx) => sum + (Number(tx.total_amount) || 0), 0)
  })

  const totalPengeluaran = computed(() => {
    return filteredExpenses.value.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)
  })

  const labaBersih = computed(() => {
    return totalOmzet.value - totalPengeluaran.value
  })

  const totalKgProcessed = computed(() => {
    return validTransactions.value.reduce((sum, tx) => {
      if (tx.service_type === 'kiloan' || tx.service_type === 'mixed') {
        const kgFromItems = tx.items ? tx.items.filter(i => i.unit === 'kg' || i.type === 'kiloan').reduce((s, i) => s + (Number(i.quantity || i.qty) || 0), 0) : 0
        return sum + (kgFromItems || tx.total_kg || 0)
      }
      return sum
    }, 0)
  })

  const totalCoinsUsed = computed(() => {
    return validTransactions.value.reduce((sum, tx) => {
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

    validTransactions.value.forEach(tx => {
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
        transactions.value = data.map(tx => ({
          ...tx,
          items: tx.transaction_items || tx.items || []
        }))
      } else {
        transactions.value = getSeedTransactions()
      }
    } catch (err) {
      console.warn('Using seed transactions due to fetch error:', err.message)
      transactions.value = getSeedTransactions()
    }
  }

  // Update Production Status
  async function updateProductionStatus(transactionId, status) {
    const txIndex = transactions.value.findIndex(t => t.id === transactionId)
    if (txIndex > -1) {
      transactions.value[txIndex].production_status = status
    }

    try {
      await supabase
        .from('transactions')
        .update({ production_status: status })
        .eq('id', transactionId)
    } catch (err) {
      console.warn('Local update for production status:', err)
    }
  }

  // Mark Transaction as Paid
  async function markAsPaid(transactionId) {
    const txIndex = transactions.value.findIndex(t => t.id === transactionId)
    if (txIndex > -1) {
      transactions.value[txIndex].payment_status = 'paid'
    }

    try {
      await supabase
        .from('transactions')
        .update({ payment_status: 'paid' })
        .eq('id', transactionId)
    } catch (err) {
      console.warn('Local update for payment status:', err)
    }
  }

  // Void Transaction (Soft Void)
  async function voidTransaction(transactionId, reason) {
    const nowIso = new Date().toISOString()
    const txIndex = transactions.value.findIndex(t => t.id === transactionId)
    if (txIndex > -1) {
      transactions.value[txIndex] = {
        ...transactions.value[txIndex],
        is_void: true,
        void_reason: reason,
        voided_at: nowIso
      }
    }

    try {
      await supabase
        .from('transactions')
        .update({
          is_void: true,
          void_reason: reason,
          voided_at: nowIso
        })
        .eq('id', transactionId)
    } catch (err) {
      console.warn('Local update for void transaction:', err)
    }
  }

  // Send WhatsApp Receipt
  function sendWhatsAppReceipt(tx) {
    if (!tx) return
    const phone = tx.customer_phone || ''
    let cleanPhone = phone.replace(/[^0-9]/g, '')
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1)
    }

    const currentBranchName = branches.value.find(b => b.id === getTenantId())?.business_name || authStore.activeTenant?.name || 'LaundryPro'
    const totalFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(tx.total_amount || 0)

    let msg = `*STRUK TRANSAKSI - ${currentBranchName.toUpperCase()}*\n`
    msg += `-------------------------------------------\n`
    msg += `No. Nota: ${tx.receipt_number || tx.id}\n`
    msg += `Pelanggan: ${tx.customer_name || 'Pelanggan'}\n`
    msg += `Total Tagihan: ${totalFormatted}\n`
    msg += `Metode Bayar: ${(tx.payment_method || 'CASH').toUpperCase()}\n`
    msg += `Status Bayar: ${tx.payment_status === 'paid' || tx.payment_status === 'lunas' ? 'LUNAS' : 'BELUM LUNAS'}\n`
    msg += `Status Produksi: ${(tx.production_status || 'diproses').toUpperCase()}\n`

    if (tx.receipt_pdf_url) {
      msg += `\nUnduh Struk PDF: ${tx.receipt_pdf_url}\n`
    }
    msg += `\nTerima kasih telah mempercayakan pakaian Anda kepada kami!`

    const encodedMsg = encodeURIComponent(msg)
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`
    window.open(waUrl, '_blank')
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
    await fetchBranches()
    await Promise.all([
      fetchTransactions(),
      fetchExpenses(),
      fetchServices(),
      fetchTenantLoyalty(),
      fetchPromotions(),
      fetchStaff()
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
        payment_status: 'paid',
        production_status: 'diproses',
        service_type: 'kiloan',
        total_kg: 5,
        total_coins: 0,
        customer_name: 'Budi Santoso',
        customer_phone: '081234567890',
        is_void: false,
        created_at: `${today}T09:30:00.000Z`,
        items: [{ id: 'i-1', name: 'Cuci Kiloan Reguler', qty: 5, unit: 'kg', price: 7000 }]
      },
      {
        id: 'tx-2',
        receipt_number: 'TRX-241019-1002',
        total_amount: 50000,
        payment_method: 'cash',
        payment_status: 'unpaid',
        production_status: 'siap_diambil',
        service_type: 'koin',
        total_kg: 0,
        total_coins: 2,
        customer_name: 'Siti Aminah',
        customer_phone: '089876543210',
        is_void: false,
        created_at: `${today}T11:15:00.000Z`,
        items: [{ id: 'i-2', name: 'Paket Koin Cuci + Pengering', qty: 2, unit: 'paket', price: 25000 }]
      },
      {
        id: 'tx-3',
        receipt_number: 'TRX-241019-1003',
        total_amount: 42000,
        payment_method: 'qris',
        payment_status: 'paid',
        production_status: 'selesai',
        service_type: 'kiloan',
        total_kg: 6,
        total_coins: 0,
        customer_name: 'Ahmad Dahlan',
        customer_phone: '081122334455',
        is_void: false,
        created_at: `${today}T14:20:00.000Z`,
        items: [{ id: 'i-3', name: 'Cuci Kiloan Express', qty: 6, unit: 'kg', price: 7000 }]
      },
      {
        id: 'tx-4',
        receipt_number: 'TRX-241019-1004',
        total_amount: 75000,
        payment_method: 'cash',
        payment_status: 'paid',
        production_status: 'diproses',
        service_type: 'mixed',
        total_kg: 4,
        total_coins: 1,
        customer_name: 'Dewi Lestari',
        customer_phone: '085678901234',
        is_void: false,
        created_at: `${today}T16:45:00.000Z`,
        items: [
          { id: 'i-4', name: 'Cuci Kiloan Reguler', qty: 4, unit: 'kg', price: 7000 },
          { id: 'i-5', name: 'Paket Koin Self-Service', qty: 1, unit: 'paket', price: 25000 }
        ]
      },
      {
        id: 'tx-5',
        receipt_number: 'TRX-241019-1005',
        total_amount: 30000,
        payment_method: 'cash',
        payment_status: 'paid',
        production_status: 'diproses',
        service_type: 'kiloan',
        total_kg: 3,
        total_coins: 0,
        customer_name: 'Rudi Hermawan',
        customer_phone: '081399887766',
        is_void: true,
        void_reason: 'Salah input berat pakaian',
        voided_at: `${today}T17:00:00.000Z`,
        created_at: `${today}T16:50:00.000Z`,
        items: [
          { id: 'i-6', name: 'Cuci Kiloan Express', qty: 3, unit: 'kg', price: 10000 }
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

  function getSeedStaff() {
    const branch = branches.value[0] || { id: 'ed0ab708-7d43-45cc-a6db-8714a599e950', business_name: 'LaundryPro Demo Store', tenant_code: 'LAUN011' }
    return [
      {
        id: 's-1',
        full_name: 'Siti Rahma',
        username: 'siti_kasir',
        is_active: true,
        tenant_id: branch.id,
        tenants: { business_name: branch.business_name, tenant_code: branch.tenant_code }
      },
      {
        id: 's-2',
        full_name: 'Budi Santoso',
        username: 'budi_kasir',
        is_active: true,
        tenant_id: branch.id,
        tenants: { business_name: branch.business_name, tenant_code: branch.tenant_code }
      },
      {
        id: 's-3',
        full_name: 'Dewi Lestari',
        username: 'dewi_kasir',
        is_active: false,
        tenant_id: branch.id,
        tenants: { business_name: branch.business_name, tenant_code: branch.tenant_code }
      }
    ]
  }

  return {
    branches,
    activeBranchId,
    activeBranch,
    maxOutlets,
    canAddBranch,
    staffList,
    dateFilter,
    statusFilter,
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
    fetchBranches,
    setActiveBranch,
    checkTenantCodeUnique,
    createBranch,
    fetchStaff,
    createStaff,
    updateStaff,
    fetchTransactions,
    updateProductionStatus,
    markAsPaid,
    voidTransaction,
    sendWhatsAppReceipt,
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
