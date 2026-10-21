import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './useAuthStore'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])
  const paymentMethod = ref('cash')
  const customerName = ref('')
  const customerPhone = ref('')
  const selectedCustomer = ref(null)
  const isGuest = ref(true)
  const manualInputVal = ref('')
  const isLoading = ref(false)
  const lastTransaction = ref(null)

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

  function addServiceToCart(service, qty = 1) {
    if (!service || !service.id) return
    const quantity = parseFloat(qty)
    if (isNaN(quantity) || quantity <= 0) return

    const existingIndex = items.value.findIndex(item => item.id === service.id)
    if (existingIndex > -1) {
      items.value[existingIndex].qty = parseFloat((items.value[existingIndex].qty + quantity).toFixed(2))
    } else {
      items.value.push({
        id: service.id,
        name: service.name,
        price: Number(service.price || 0),
        unit: service.unit || 'paket',
        qty: parseFloat(quantity.toFixed(2)),
        type: service.category || 'koin'
      })
    }
  }

  function addCoinPackage(pkg) {
    if (!pkg) return
    addServiceToCart(pkg, 1)
  }

  function addKiloanService(weightInKg, service) {
    const qty = parseFloat(weightInKg)
    if (isNaN(qty) || qty <= 0) return

    if (service && service.id) {
      addServiceToCart(service, qty)
    } else if (typeof service === 'object' && service?.price) {
      addServiceToCart(service, qty)
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
    selectedCustomer.value = null
    isGuest.value = true
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

      let tenantId = authStore.user?.tenant_id || authStore.activeTenant?.id
      let userId = authStore.user?.id

      if (!tenantId || !userId) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            userId = userId || session.user.id
            tenantId = tenantId || session.user.user_metadata?.tenant_id || session.user.app_metadata?.tenant_id
          }
        } catch (authErr) {
          console.warn('Session auth fetch warning:', authErr)
        }
      }

      if (!tenantId) {
        throw new Error('Gagal menyimpan transaksi: ID Toko (tenant_id) tidak ditemukan. Silakan login kembali.')
      }

      // Determine service_type based on items
      const hasCoin = items.value.some(i => i.type === 'koin' || i.type === 'coin')
      const hasKiloan = items.value.some(i => i.type === 'kiloan')
      let serviceType = 'koin'
      if (hasCoin && hasKiloan) {
        serviceType = 'mixed'
      } else if (hasKiloan) {
        serviceType = 'kiloan'
      } else {
        serviceType = items.value[0]?.type || 'satuan'
      }

      const currentItems = [...items.value]
      const totalAmt = subtotal.value
      const payMethod = paymentMethod.value

      let customerId = null
      let custName = 'Pelanggan Umum'
      let custPhone = ''
      let pointsEarned = 0
      let newBalance = 0

      // Handle Customer & Loyalty Logic
      if (!isGuest.value) {
        custName = customerName.value.trim() || 'Pelanggan Umum'
        custPhone = customerPhone.value.trim()

        if (selectedCustomer.value?.id) {
          // Existing customer chosen from autocomplete
          customerId = selectedCustomer.value.id
          custName = selectedCustomer.value.name || custName
          custPhone = selectedCustomer.value.phone || custPhone
        } else if (custPhone || custName) {
          // Check if customer exists by phone number or name
          let existingCust = null
          if (custPhone) {
            const { data: custByPhone } = await supabase
              .from('customers')
              .select('*')
              .eq('tenant_id', tenantId)
              .eq('phone', custPhone)
              .maybeSingle()
            existingCust = custByPhone
          }

          if (existingCust) {
            customerId = existingCust.id
            custName = existingCust.name || custName
          } else {
            // Auto-create new customer in customers table
            const { data: newCust, error: createCustErr } = await supabase
              .from('customers')
              .insert([
                {
                  tenant_id: tenantId,
                  name: custName,
                  phone: custPhone,
                  points_balance: 0
                }
              ])
              .select()
              .single()

            if (createCustErr) {
              console.warn('Gagal membuat pelanggan baru:', createCustErr)
            } else if (newCust) {
              customerId = newCust.id
            }
          }
        }

        // Calculate earned points: 1 point per Rp 10.000
        pointsEarned = Math.floor(totalAmt / 10000)

        // Update customer points_balance if customerId is available
        if (customerId && pointsEarned > 0) {
          const { data: currentCustData } = await supabase
            .from('customers')
            .select('points_balance')
            .eq('id', customerId)
            .single()

          const currentBalance = currentCustData?.points_balance || selectedCustomer.value?.points_balance || 0
          newBalance = currentBalance + pointsEarned

          await supabase
            .from('customers')
            .update({ points_balance: newBalance })
            .eq('id', customerId)
        }
      }

      // Payload for transactions
      const transactionPayload = {
        receipt_number: receiptNumber,
        total_amount: totalAmt,
        payment_method: payMethod,
        service_type: serviceType,
        customer_name: custName,
        customer_phone: custPhone,
        customer_id: customerId,
        points_earned: pointsEarned,
        points_redeemed: 0,
        tenant_id: tenantId,
        user_id: userId,
        payment_status: 'paid',
        production_status: 'processing'
      }

      // Save transaction to Supabase
      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionPayload])
        .select()

      if (error) {
        console.error('Supabase insert transaction error:', error)
        throw new Error(error.message || 'Gagal menyimpan transaksi ke database.')
      }

      if (!data || data.length === 0) {
        throw new Error('Gagal menyimpan transaksi: Tidak ada data dikembalikan dari database.')
      }

      const insertedTxData = data[0]
      const txId = insertedTxData.id

      // Record mutation log in loyalty_logs
      if (customerId && pointsEarned > 0) {
        const { error: loyaltyErr } = await supabase
          .from('loyalty_logs')
          .insert([
            {
              tenant_id: tenantId,
              customer_id: customerId,
              transaction_id: txId,
              points_change: pointsEarned,
              activity_type: 'EARN',
              description: `Perolehan poin transaksi nota ${receiptNumber}`
            }
          ])

        if (loyaltyErr) {
          console.warn('Gagal mencatat mutasi loyalty_logs:', loyaltyErr)
        }
      }

      // Save transaction items
      const itemsPayload = currentItems.map(item => ({
        transaction_id: txId,
        item_name: item.name,
        quantity: item.qty,
        price: item.price,
        subtotal: item.price * item.qty,
        tenant_id: tenantId
      }))

      const { error: itemsErr } = await supabase
        .from('transaction_items')
        .insert(itemsPayload)

      if (itemsErr) {
        console.error('Supabase insert transaction_items error:', itemsErr)
        throw new Error(itemsErr.message || 'Gagal menyimpan detail item transaksi ke database.')
      }

      const resultTransaction = {
        id: txId,
        receipt_number: receiptNumber,
        total_amount: totalAmt,
        payment_method: payMethod,
        service_type: serviceType,
        customer_name: custName,
        customer_phone: custPhone,
        customer_id: customerId,
        points_earned: pointsEarned,
        points_balance_after: newBalance,
        payment_status: 'paid',
        production_status: 'processing',
        status: 'lunas',
        created_at: insertedTxData.created_at || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
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
    selectedCustomer,
    isGuest,
    manualInputVal,
    isLoading,
    lastTransaction,
    subtotal,
    totalItemCount,
    formattedTotal,
    addServiceToCart,
    addCoinPackage,
    addKiloanService,
    updateItemQty,
    removeItem,
    setPaymentMethod,
    clearCart,
    checkoutTransaction
  }
})
