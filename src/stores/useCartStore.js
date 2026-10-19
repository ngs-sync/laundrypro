import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './useAuthStore'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])
  const paymentMethod = ref('cash')
  const customerName = ref('')
  const customerPhone = ref('')
  const manualInputVal = ref('')
  const isLoading = ref(false)
  const lastTransaction = ref(null)

  const coinPackages = ref([
    {
      id: 'pkg-cuci-saja',
      name: 'Cuci Saja',
      price: 10000,
      unit: 'paket',
      description: 'Layanan Cuci Mesin Koin (Self Service)',
      badge: 'Popular',
      color: 'emerald'
    },
    {
      id: 'pkg-cuci-kering-mandiri',
      name: 'Cuci Kering Mandiri',
      price: 20000,
      unit: 'paket',
      description: 'Cuci + Pengering Koin (Self Service)',
      badge: 'Best Value',
      color: 'teal'
    },
    {
      id: 'pkg-cuci-kering-dropoff',
      name: 'Cuci Kering Drop-Off',
      price: 25000,
      unit: 'paket',
      description: 'Cuci + Kering + Dilipat oleh Staf',
      badge: 'Full Service',
      color: 'cyan'
    }
  ])

  const subtotal = computed(() => {
    return items.value.reduce((total, item) => total + (item.price * item.qty), 0)
  })

  const totalItemCount = computed(() => {
    return items.value.reduce((count, item) => count + Number(item.qty), 0)
  })

  const formattedTotal = computed(() => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(subtotal.value)
  })

  function generateReceiptNumber() {
    const now = new Date()
    const yy = String(now.getFullYear()).slice(-2)
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const randomHex = Math.floor(1000 + Math.random() * 9000).toString()
    return `TRX-${yy}${mm}${dd}-${randomHex}`
  }

  function addCoinPackage(pkg) {
    const existingIndex = items.value.findIndex(item => item.id === pkg.id)
    if (existingIndex > -1) {
      items.value[existingIndex].qty += 1
    } else {
      items.value.push({
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        unit: pkg.unit || 'paket',
        qty: 1,
        type: 'coin'
      })
    }
  }

  function addKiloanService(weightInKg, pricePerKg = 7000, serviceName = 'Cuci Kiloan Reguler') {
    const qty = parseFloat(weightInKg)
    if (isNaN(qty) || qty <= 0) return

    const kiloanId = 'kiloan-reguler'
    const existingIndex = items.value.findIndex(item => item.id === kiloanId)

    if (existingIndex > -1) {
      items.value[existingIndex].qty = parseFloat((items.value[existingIndex].qty + qty).toFixed(2))
    } else {
      items.value.push({
        id: kiloanId,
        name: serviceName,
        price: pricePerKg,
        unit: 'kg',
        qty: parseFloat(qty.toFixed(2)),
        type: 'kiloan'
      })
    }
    manualInputVal.value = ''
  }

  function updateItemQty(itemId, newQty) {
    const qty = parseFloat(newQty)
    const index = items.value.findIndex(item => item.id === itemId)
    if (index > -1) {
      if (qty <= 0) {
        items.value.splice(index, 1)
      } else {
        items.value[index].qty = parseFloat(qty.toFixed(2))
      }
    }
  }

  function removeItem(itemId) {
    items.value = items.value.filter(item => item.id !== itemId)
  }

  function setPaymentMethod(method) {
    paymentMethod.value = method
  }

  function clearCart() {
    items.value = []
    customerName.value = ''
    customerPhone.value = ''
    manualInputVal.value = ''
    paymentMethod.value = 'cash'
  }

  async function checkoutTransaction() {
    if (items.value.length === 0) {
      throw new Error('Keranjang belanja masih kosong.')
    }

    isLoading.value = true

    try {
      const authStore = useAuthStore()
      const receiptNumber = generateReceiptNumber()
      const fallbackTenantId = authStore.activeTenant?.id || 'ed0ab708-7d43-45cc-a6db-8714a599e950'
      const fallbackUserId = authStore.currentUser?.id || 'ed0ab708-7d43-45cc-a6db-8714a599e950'

      let tenantId = fallbackTenantId
      let userId = fallbackUserId

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          userId = session.user.id
          tenantId = session.user.user_metadata?.tenant_id || session.user.app_metadata?.tenant_id || fallbackTenantId
        }
      } catch (authErr) {
        console.warn('Session auth fetch warning, using fallback IDs:', authErr)
      }

      // Determine service_type based on items
      const hasCoin = items.value.some(i => i.type === 'coin')
      const hasKiloan = items.value.some(i => i.type === 'kiloan')
      let serviceType = 'koin'
      if (hasCoin && hasKiloan) {
        serviceType = 'mixed'
      } else if (hasKiloan) {
        serviceType = 'kiloan'
      }

      const currentItems = [...items.value]
      const totalAmt = subtotal.value
      const custName = customerName.value.trim() || 'Pelanggan Umum'
      const custPhone = customerPhone.value.trim() || ''
      const payMethod = paymentMethod.value

      const transactionPayload = {
        receipt_number: receiptNumber,
        total_amount: totalAmt,
        payment_method: payMethod,
        service_type: serviceType,
        customer_name: custName,
        customer_phone: custPhone,
        tenant_id: tenantId,
        user_id: userId,
        status: 'lunas'
      }

      let insertedTxData = null

      // Attempt to save into Supabase
      try {
        const { data, error } = await supabase
          .from('transactions')
          .insert([transactionPayload])
          .select()

        if (error) {
          console.error('Supabase insert transaction error:', error)
        } else if (data && data.length > 0) {
          insertedTxData = data[0]
        }
      } catch (dbErr) {
        console.error('Database error when saving transaction:', dbErr)
      }

      const txId = insertedTxData?.id || `local-tx-${Date.now()}`

      // Save transaction items
      const itemsPayload = currentItems.map(item => ({
        transaction_id: txId,
        item_name: item.name,
        quantity: item.qty,
        price: item.price,
        subtotal: item.price * item.qty,
        tenant_id: tenantId
      }))

      try {
        if (insertedTxData?.id) {
          const { error: itemsErr } = await supabase
            .from('transaction_items')
            .insert(itemsPayload)

          if (itemsErr) {
            console.error('Supabase insert transaction_items error:', itemsErr)
          }
        }
      } catch (itemsErr) {
        console.error('Database error when saving transaction_items:', itemsErr)
      }

      const resultTransaction = {
        id: txId,
        receipt_number: receiptNumber,
        total_amount: totalAmt,
        payment_method: payMethod,
        service_type: serviceType,
        customer_name: custName,
        customer_phone: custPhone,
        status: 'lunas',
        created_at: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        items: currentItems
      }

      lastTransaction.value = resultTransaction
      clearCart()
      return resultTransaction
    } finally {
      isLoading.value = false
    }
  }

  return {
    items,
    paymentMethod,
    customerName,
    customerPhone,
    manualInputVal,
    coinPackages,
    isLoading,
    lastTransaction,
    subtotal,
    totalItemCount,
    formattedTotal,
    addCoinPackage,
    addKiloanService,
    updateItemQty,
    removeItem,
    setPaymentMethod,
    clearCart,
    checkoutTransaction
  }
})
