<script setup>
import { ref } from "vue"
import { useCartStore } from "../stores/useCartStore"
import NumpadInput from "../components/NumpadInput.vue"
import TransactionSuccessModal from "../components/TransactionSuccessModal.vue"
import PrinterSettingsModal from "../components/PrinterSettingsModal.vue"

const cartStore = useCartStore()

const activeTab = ref("coin")
const showBottomSheet = ref(false)
const showSuccessModal = ref(false)
const showPrinterSettings = ref(false)
const completedTransaction = ref(null)

function handleAddCoinPackage(pkg) {
  cartStore.addCoinPackage(pkg)
}

function handleAddKiloan(weight) {
  cartStore.addKiloanService(weight)
}

function formatPrice(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(amount)
}

function openPaymentSheet() {
  if (cartStore.items.length === 0) return
  showBottomSheet.value = true
}

function closePaymentSheet() {
  if (cartStore.isLoading) return
  showBottomSheet.value = false
}

async function processTransaction() {
  if (cartStore.items.length === 0 || cartStore.isLoading) return

  try {
    const txData = await cartStore.checkoutTransaction()
    completedTransaction.value = txData
    showBottomSheet.value = false
    showSuccessModal.value = true
  } catch (err) {
    console.error("Gagal memproses transaksi:", err)
    alert(err.message || "Terjadi kesalahan saat memproses transaksi.")
  }
}

function closeSuccessModal() {
  showSuccessModal.value = false
  completedTransaction.value = null
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-800 flex flex-col pb-32 max-w-md mx-auto relative border-x border-slate-200 shadow-lg">
    <header class="bg-emerald-600 text-white p-4 sticky top-0 z-20 shadow-md">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-lg shadow-inner">
            🧺
          </div>
          <div>
            <h1 class="text-lg font-bold leading-none">LaundryPro</h1>
            <span class="text-xs text-emerald-100">Kasir Mobile POS</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="showPrinterSettings = true"
            title="Pengaturan Printer Thermal"
            class="text-xs bg-emerald-700 hover:bg-emerald-800 p-2 rounded-lg text-emerald-100 transition-colors flex items-center gap-1 font-bold"
          >
            <span>🖨️</span>
          </button>
          <button
            v-if="cartStore.items.length > 0"
            @click="cartStore.clearCart()"
            class="text-xs bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 rounded-lg text-emerald-100 transition-colors flex items-center gap-1"
          >
            <span>Reset</span>
          </button>
        </div>
      </div>
    </header>

    <nav class="bg-white border-b border-slate-200 sticky top-16 z-10 grid grid-cols-3 text-center text-sm font-semibold text-slate-600 shadow-xs">
      <button
        @click="activeTab = 'coin'"
        :class="['py-3 border-b-2 transition-all', activeTab === 'coin' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50' : 'border-transparent hover:bg-slate-50']"
      >
        🪙 Paket Koin
      </button>
      <button
        @click="activeTab = 'kiloan'"
        :class="['py-3 border-b-2 transition-all', activeTab === 'kiloan' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50' : 'border-transparent hover:bg-slate-50']"
      >
        ⚖️ Layanan Kiloan
      </button>
      <button
        @click="activeTab = 'cart'"
        :class="['py-3 border-b-2 transition-all relative', activeTab === 'cart' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50' : 'border-transparent hover:bg-slate-50']"
      >
        🛒 Keranjang
        <span
          v-if="cartStore.totalItemCount > 0"
          class="absolute top-2 right-3 bg-emerald-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse"
        >
          {{ cartStore.totalItemCount }}
        </span>
      </button>
    </nav>

    <main class="p-4 flex-1 flex flex-col gap-5">
      <section v-if="activeTab === 'coin'" class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-800">Paket Koin Self-Service</h2>
          <span class="text-xs text-slate-500">Pilih paket untuk pelanggan</span>
        </div>

        <div class="flex flex-col gap-3">
          <div
            v-for="pkg in cartStore.coinPackages"
            :key="pkg.id"
            class="bg-white p-5 rounded-2xl border-2 border-slate-100 hover:border-emerald-300 shadow-sm transition-all flex flex-col gap-3 relative overflow-hidden"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                {{ pkg.badge }}
              </span>
              <span class="text-xl font-black text-emerald-600 font-mono">
                {{ formatPrice(pkg.price) }}
              </span>
            </div>

            <div>
              <h3 class="text-lg font-bold text-slate-800">{{ pkg.name }}</h3>
              <p class="text-xs text-slate-500 mt-0.5">{{ pkg.description }}</p>
            </div>

            <button
              @click="handleAddCoinPackage(pkg)"
              class="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-base"
            >
              <span>+ Tambah Paket</span>
            </button>
          </div>
        </div>
      </section>

      <section v-if="activeTab === 'kiloan'" class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-800">Cuci Kiloan Manual</h2>
          <span class="text-xs text-slate-500">Input berat cepat</span>
        </div>

        <NumpadInput
          v-model="cartStore.manualInputVal"
          :price-per-kg="7000"
          @add-kiloan="handleAddKiloan"
        />
      </section>

      <section v-if="activeTab === 'cart' || cartStore.items.length > 0" class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-800">Detail Pesanan</h2>
          <span class="text-xs text-slate-500">{{ cartStore.items.length }} Item</span>
        </div>

        <div
          v-if="cartStore.items.length === 0"
          class="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center flex flex-col items-center justify-center gap-2 text-slate-400"
        >
          <span class="text-4xl">🛒</span>
          <p class="text-sm font-medium">Keranjang masih kosong</p>
          <span class="text-xs text-slate-400">Pilih Paket Koin atau Kiloan di atas</span>
        </div>

        <div v-else class="flex flex-col gap-2">
          <div
            v-for="item in cartStore.items"
            :key="item.id"
            class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3"
          >
            <div class="flex-1">
              <h4 class="font-bold text-sm text-slate-800">{{ item.name }}</h4>
              <p class="text-xs text-slate-500 font-mono">
                {{ formatPrice(item.price) }} / {{ item.unit }}
              </p>
            </div>

            <div class="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
              <button
                @click="cartStore.updateItemQty(item.id, item.qty - (item.type === 'kiloan' ? 0.5 : 1))"
                class="w-7 h-7 rounded-md bg-white font-bold text-slate-700 shadow-xs hover:bg-slate-200 active:scale-95 flex items-center justify-center text-sm"
              >
                -
              </button>
              <span class="text-sm font-bold font-mono px-1">
                {{ item.qty }} {{ item.unit }}
              </span>
              <button
                @click="cartStore.updateItemQty(item.id, item.qty + (item.type === 'kiloan' ? 0.5 : 1))"
                class="w-7 h-7 rounded-md bg-white font-bold text-slate-700 shadow-xs hover:bg-slate-200 active:scale-95 flex items-center justify-center text-sm"
              >
                +
              </button>
            </div>

            <div class="text-right flex flex-col items-end gap-1">
              <span class="font-bold text-sm text-emerald-600 font-mono">
                {{ formatPrice(item.price * item.qty) }}
              </span>
              <button
                @click="cartStore.removeItem(item.id)"
                class="text-xs text-rose-500 hover:text-rose-700 font-medium"
              >
                Hapus
              </button>
            </div>
          </div>

          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-3 mt-2">
            <h3 class="text-xs font-bold uppercase text-slate-400 tracking-wider">Data Pelanggan (Opsional)</h3>
            <div class="grid grid-cols-1 gap-2">
              <input
                v-model="cartStore.customerName"
                type="text"
                placeholder="Nama Pelanggan"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
              <input
                v-model="cartStore.customerPhone"
                type="tel"
                placeholder="Nomor WA / Telepon"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </section>
    </main>

    <div
      v-if="cartStore.items.length > 0"
      class="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-emerald-600 text-white shadow-2xl z-30 rounded-t-2xl border-t border-emerald-500"
    >
      <div class="flex items-center justify-between gap-3">
        <div>
          <span class="text-xs text-emerald-100 block font-medium">Total {{ cartStore.totalItemCount }} Item</span>
          <span class="text-xl font-black font-mono tracking-tight">{{ cartStore.formattedTotal }}</span>
        </div>

        <button
          @click="openPaymentSheet"
          class="bg-white text-emerald-700 font-extrabold px-6 py-3.5 rounded-xl shadow-md hover:bg-emerald-50 active:scale-95 transition-all text-base flex items-center gap-2"
        >
          <span>Proses Bayar</span>
          <span>➔</span>
        </button>
      </div>
    </div>

    <!-- Bottom Sheet Modal Metode Bayar -->
    <div
      v-if="showBottomSheet"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 flex flex-col justify-end max-w-md mx-auto"
      @click.self="closePaymentSheet"
    >
      <div class="bg-white rounded-t-3xl p-6 shadow-2xl flex flex-col gap-5 border-t border-slate-100 animate-slide-up">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 class="text-lg font-extrabold text-slate-800">Metode Pembayaran</h2>
            <p class="text-xs text-slate-500">Pilih metode bayar untuk menyelesaikan nota</p>
          </div>
          <button
            @click="closePaymentSheet"
            :disabled="cartStore.isLoading"
            class="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center hover:bg-slate-200 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-xs font-bold uppercase text-slate-400 tracking-wider">Metode Bayar</label>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              @click="cartStore.setPaymentMethod('cash')"
              :disabled="cartStore.isLoading"
              :class="[
                'p-4 rounded-xl border-2 font-bold text-sm flex flex-col items-center gap-2 transition-all',
                cartStore.paymentMethod === 'cash'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              ]"
            >
              <span class="text-2xl">💵</span>
              <span>Tunai / Cash</span>
            </button>

            <button
              type="button"
              @click="cartStore.setPaymentMethod('qris')"
              :disabled="cartStore.isLoading"
              :class="[
                'p-4 rounded-xl border-2 font-bold text-sm flex flex-col items-center gap-2 transition-all',
                cartStore.paymentMethod === 'qris'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              ]"
            >
              <span class="text-2xl">📱</span>
              <span>QRIS Non-Tunai</span>
            </button>
          </div>
        </div>

        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2">
          <div class="flex items-center justify-between text-xs text-slate-600">
            <span>Pelanggan</span>
            <span class="font-bold text-slate-800">{{ cartStore.customerName || 'Pelanggan Umum' }}</span>
          </div>
          <div class="flex items-center justify-between text-xs text-slate-600">
            <span>Total Tagihan</span>
            <span class="font-bold text-emerald-600 font-mono text-base">{{ cartStore.formattedTotal }}</span>
          </div>
        </div>

        <!-- Tombol Utama Checkout -->
        <button
          @click="processTransaction"
          :disabled="cartStore.isLoading"
          class="w-full py-4 bg-emerald-500 text-white font-extrabold rounded-2xl text-lg shadow-lg hover:bg-emerald-600 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
        >
          <span v-if="cartStore.isLoading" class="flex items-center gap-2">
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Memproses Nota...</span>
          </span>
          <span v-else>Konfirmasi & Selesaikan Nota</span>
        </button>
      </div>
    </div>

    <!-- Modal Sukses Transaksi -->
    <TransactionSuccessModal
      :show="showSuccessModal"
      :transaction="completedTransaction"
      @close="closeSuccessModal"
    />

    <!-- Modal Pengaturan Printer -->
    <PrinterSettingsModal
      :show="showPrinterSettings"
      @close="showPrinterSettings = false"
    />
  </div>
</template>
