import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])
  const paymentMethod = ref('cash')
  const customerName = ref('')
  const customerPhone = ref('')
  const manualInputVal = ref('')

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

  return {
    items,
    paymentMethod,
    customerName,
    customerPhone,
    manualInputVal,
    coinPackages,
    subtotal,
    totalItemCount,
    formattedTotal,
    addCoinPackage,
    addKiloanService,
    updateItemQty,
    removeItem,
    setPaymentMethod,
    clearCart
  }
})
