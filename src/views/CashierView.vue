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
  <div class="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col pb-36 max-w-md mx-auto relative border-x border-[#E2E8F0] shadow-lg">
    <!-- Header Page -->
    <header class="bg-[#10B981] text-white p-4 sticky top-0 z-20 shadow-md">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-lg shadow-inner">
            🧺
          </div>
          <div>
            <h1 class="text-lg font-extrabold leading-none tracking-tight">LaundryPro POS</h1>
            <span class="text-xs text-emerald-100 font-medium">Kasir Self-Service & Kiloan</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="showPrinterSettings = true"
            title="Pengaturan Printer Thermal"
            class="text-xs bg-emerald-700 hover:bg-emerald-800 active:translate-y-[1px] p-2.5 rounded-lg text-emerald-100 transition-all flex items-center gap-1 font-bold min-h-[44px]"
          >
            <span>🖨️</span>
          </button>
          <button
            v-if="cartStore.items.length > 0"
            @click="cartStore.clearCart()"
            class="text-xs bg-emerald-700 hover:bg-emerald-800 active:translate-y-[1px] px-3 py-2 rounded-lg text-emerald-100 transition-all flex items-center gap-1 font-bold min-h-[44px]"
          >
            <span>Reset</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Navigation Tabs -->
    <nav class="bg-white border-b border-[#E2E8F0] sticky top-[68px] z-10 grid grid-cols-3 text-center text-sm font-bold text-[#64748B] shadow-xs">
      <button
        @click="activeTab = 'coin'"
        :class="['py-3.5 border-b-2 transition-all min-h-[52px]', activeTab === 'coin' ? 'border-[#10B981] text-[#10B981] bg-emerald-50/50' : 'border-transparent hover:bg-slate-50']"
      >
        🪙 Paket Koin
      </button>
      <button
        @click="activeTab = 'kiloan'"
        :class="['py-3.5 border-b-2 transition-all min-h-[52px]', activeTab === 'kiloan' ? 'border-[#10B981] text-[#10B981] bg-emerald-50/50' : 'border-transparent hover:bg-slate-50']"
      >
        ⚖️ Cuci Kiloan
      </button>
      <button
        @click="activeTab = 'cart'"
        :class="['py-3.5 border-b-2 transition-all relative min-h-[52px]', activeTab === 'cart' ? 'border-[#10B981] text-[#10B981] bg-emerald-50/50' : 'border-transparent hover:bg-slate-50']"
      >
        🛒 Keranjang
        <span
          v-if="cartStore.totalItemCount > 0"
          class="absolute top-2 right-2 bg-[#10B981] text-white text-xs font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse"
        >
          {{ cartStore.totalItemCount }}
        </span>
      </button>
    </nav>

    <!-- Main Content Flow -->
    <main class="p-4 flex-1 flex flex-col gap-5">
      <!-- Section Paket Koin -->
      <section v-if="activeTab === 'coin'" class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-[#0F172A]">Paket Koin Self-Service</h2>
          <span class="text-xs text-[#64748B]">Pilih paket mesin</span>
        </div>

        <div class="flex flex-col gap-3">
          <div
            v-for="pkg in cartStore.coinPackages"
            :key="pkg.id"
            class="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-[#10B981] shadow-xs transition-all flex flex-col gap-3 relative overflow-hidden"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-[#00422B] bg-[#ECFDF5] px-2.5 py-1 rounded border border-[#10B981]/30">
                {{ pkg.badge }}
              </span>
              <span class="text-xl font-bold text-[#10B981] font-mono tabular-nums">
                {{ formatPrice(pkg.price) }}
              </span>
            </div>

            <div>
              <h3 class="text-lg font-bold text-[#0F172A]">{{ pkg.name }}</h3>
              <p class="text-xs text-[#64748B] mt-0.5">{{ pkg.description }}</p>
            </div>

            <button
              @click="handleAddCoinPackage(pkg)"
              class="w-full h-14 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-lg border-b-2 border-[#059669] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 text-base shadow-xs min-h-[52px]"
            >
              <span>+ Tambah Paket</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Section Cuci Kiloan Numpad -->
      <section v-if="activeTab === 'kiloan'" class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-[#0F172A]">Cuci Kiloan Manual</h2>
          <span class="text-xs text-[#64748B]">Numeric keypad input</span>
        </div>

        <NumpadInput
          v-model="cartStore.manualInputVal"
          :price-per-kg="7000"
          @add-kiloan="handleAddKiloan"
        />
      </section>

      <!-- Section Detail Cart -->
      <section v-if="activeTab === 'cart' || cartStore.items.length > 0" class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-[#0F172A]">Detail Pesanan</h2>
          <span class="text-xs text-[#64748B] font-mono">{{ cartStore.items.length }} Item</span>
        </div>

        <div
          v-if="cartStore.items.length === 0"
          class="bg-white p-8 rounded-lg border border-dashed border-[#CBD5E1] text-center flex flex-col items-center justify-center gap-2 text-[#64748B]"
        >
          <span class="text-4xl">🛒</span>
          <p class="text-sm font-bold">Keranjang masih kosong</p>
          <span class="text-xs text-[#64748B]">Pilih Paket Koin atau input berat Kiloan</span>
        </div>

        <div v-else class="flex flex-col gap-3">
          <div
            v-for="item in cartStore.items"
            :key="item.id"
            class="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs flex items-center justify-between gap-3"
          >
            <div class="flex-1">
              <h4 class="font-bold text-sm text-[#0F172A]">{{ item.name }}</h4>
              <p class="text-xs text-[#64748B] font-mono tabular-nums">
                {{ formatPrice(item.price) }} / {{ item.unit }}
              </p>
            </div>

            <div class="flex items-center gap-2 bg-[#F8FAFC] p-1.5 rounded-lg border border-[#E2E8F0]">
              <button
                @click="cartStore.updateItemQty(item.id, item.qty - (item.type === 'kiloan' ? 0.5 : 1))"
                class="w-9 h-9 rounded bg-white font-bold text-[#0F172A] border border-[#CBD5E1] hover:bg-slate-100 active:translate-y-[1px] flex items-center justify-center text-base"
              >
                -
              </button>
              <span class="text-sm font-bold font-mono tabular-nums px-1.5">
                {{ item.qty }} {{ item.unit }}
              </span>
              <button
                @click="cartStore.updateItemQty(item.id, item.qty + (item.type === 'kiloan' ? 0.5 : 1))"
                class="w-9 h-9 rounded bg-white font-bold text-[#0F172A] border border-[#CBD5E1] hover:bg-slate-100 active:translate-y-[1px] flex items-center justify-center text-base"
              >
                +
              </button>
            </div>

            <div class="text-right flex flex-col items-end gap-1">
              <span class="font-bold text-sm text-[#10B981] font-mono tabular-nums">
                {{ formatPrice(item.price * item.qty) }}
              </span>
              <button
                @click="cartStore.removeItem(item.id)"
                class="text-xs text-[#F43F5E] hover:text-rose-700 font-bold"
              >
                Hapus
              </button>
            </div>
          </div>

          <!-- Customer Details Box -->
          <div class="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs flex flex-col gap-3 mt-1">
            <h3 class="text-xs font-bold uppercase text-[#64748B] tracking-wider">Data Pelanggan (Opsional)</h3>
            <div class="grid grid-cols-1 gap-2.5">
              <input
                v-model="cartStore.customerName"
                type="text"
                placeholder="Nama Pelanggan"
                class="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-sm font-medium focus:outline-none focus:border-[#10B981]"
              />
              <input
                v-model="cartStore.customerPhone"
                type="tel"
                placeholder="Nomor WA / Telepon (Contoh: 081234567890)"
                class="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-sm font-mono focus:outline-none focus:border-[#10B981]"
              />
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Sticky Bottom Bar (Stitch Spec: Pinned Thumb Tray, min height 72px) -->
    <div
      v-if="cartStore.items.length > 0"
      class="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-[#10B981] text-white shadow-2xl z-30 rounded-t-xl border-t border-emerald-400 min-h-[72px]"
    >
      <div class="flex items-center justify-between gap-3">
        <div>
          <span class="text-xs text-emerald-100 block font-bold">Total {{ cartStore.totalItemCount }} Item</span>
          <span class="text-2xl font-black font-mono tracking-tight tabular-nums">{{ cartStore.formattedTotal }}</span>
        </div>

        <button
          @click="openPaymentSheet"
          class="h-14 bg-white text-[#00422B] font-extrabold px-6 rounded-lg shadow-md hover:bg-emerald-50 active:translate-y-[2px] transition-all text-base flex items-center gap-2 min-h-[56px]"
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
      <div class="bg-white rounded-t-2xl p-6 shadow-2xl flex flex-col gap-5 border-t border-[#E2E8F0] animate-slide-up">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div>
            <h2 class="text-lg font-extrabold text-[#0F172A]">Metode Pembayaran</h2>
            <p class="text-xs text-[#64748B]">Pilih metode bayar untuk menyelesaikan nota</p>
          </div>
          <button
            @click="closePaymentSheet"
            :disabled="cartStore.isLoading"
            class="w-9 h-9 rounded-full bg-[#F8FAFC] text-[#0F172A] font-bold flex items-center justify-center hover:bg-slate-200 disabled:opacity-50 border border-[#E2E8F0]"
          >
            ✕
          </button>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-xs font-bold uppercase text-[#64748B] tracking-wider">Pilih Metode</label>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              @click="cartStore.setPaymentMethod('cash')"
              :disabled="cartStore.isLoading"
              :class="[
                'p-4 rounded-lg border-2 font-bold text-sm flex flex-col items-center gap-2 transition-all min-h-[80px]',
                cartStore.paymentMethod === 'cash'
                  ? 'border-[#10B981] bg-[#ECFDF5] text-[#00422B] shadow-xs'
                  : 'border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50'
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
                'p-4 rounded-lg border-2 font-bold text-sm flex flex-col items-center gap-2 transition-all min-h-[80px]',
                cartStore.paymentMethod === 'qris'
                  ? 'border-[#10B981] bg-[#ECFDF5] text-[#00422B] shadow-xs'
                  : 'border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50'
              ]"
            >
              <span class="text-2xl">📱</span>
              <span>QRIS Non-Tunai</span>
            </button>
          </div>
        </div>

        <div class="bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0] flex flex-col gap-2">
          <div class="flex items-center justify-between text-xs text-[#64748B]">
            <span>Pelanggan</span>
            <span class="font-bold text-[#0F172A]">{{ cartStore.customerName || 'Pelanggan Umum' }}</span>
          </div>
          <div class="flex items-center justify-between text-xs text-[#64748B]">
            <span>Total Tagihan</span>
            <span class="font-black text-[#10B981] font-mono text-base tabular-nums">{{ cartStore.formattedTotal }}</span>
          </div>
        </div>

        <!-- Checkout Trigger Button (Height 60px) -->
        <button
          @click="processTransaction"
          :disabled="cartStore.isLoading"
          class="w-full h-15 bg-[#10B981] text-white font-extrabold rounded-lg text-lg border-b-2 border-[#059669] shadow-lg hover:bg-[#059669] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed min-h-[60px]"
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
