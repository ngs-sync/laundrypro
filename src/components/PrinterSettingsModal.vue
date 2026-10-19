<script setup>
import { ref, onMounted, watch } from "vue"
import {
  isWebBluetoothSupported,
  getPaperWidth,
  setPaperWidth,
  isPrinterConnected,
  getConnectedDeviceName,
  connectPrinter,
  disconnectPrinter,
  printTestLabel,
  printViaSystemDialog,
  tryAutoReconnect
} from "../lib/bluetoothPrinter"

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(["close"])

const isSupported = ref(true)
const paperWidth = ref("58mm")
const isConnected = ref(false)
const deviceName = ref("")
const isLoading = ref(false)
const isPrintingTest = ref(false)
const message = ref({ text: "", type: "info" })

function refreshState() {
  isSupported.value = isWebBluetoothSupported()
  paperWidth.value = getPaperWidth()
  isConnected.value = isPrinterConnected()
  deviceName.value = getConnectedDeviceName() || ""
}

watch(() => props.show, async (newVal) => {
  if (newVal) {
    refreshState()
    message.value = { text: "", type: "info" }
    if (!isConnected.value && isSupported.value) {
      const reconnected = await tryAutoReconnect()
      if (reconnected) {
        refreshState()
        message.value = { text: "Terhubung kembali secara otomatis.", type: "success" }
      }
    }
  }
})

onMounted(() => {
  refreshState()
})

function handleSelectPaperWidth(width) {
  paperWidth.value = setPaperWidth(width)
  message.value = { text: `Ukuran kertas diubah ke ${width}`, type: "success" }
}

async function handleConnect() {
  isLoading.value = true
  message.value = { text: "", type: "info" }
  try {
    const result = await connectPrinter()
    refreshState()
    message.value = { text: `Berhasil terhubung ke ${result.deviceName}`, type: "success" }
  } catch (err) {
    console.error("Koneksi gagal:", err)
    message.value = { text: err.message || "Gagal menghubungkan printer.", type: "error" }
  } finally {
    isLoading.value = false
  }
}

async function handleDisconnect() {
  isLoading.value = true
  try {
    await disconnectPrinter()
    refreshState()
    message.value = { text: "Koneksi printer telah diputuskan.", type: "info" }
  } catch (err) {
    message.value = { text: err.message || "Gagal memutuskan printer.", type: "error" }
  } finally {
    isLoading.value = false
  }
}

async function handleTestPrint() {
  isPrintingTest.value = true
  message.value = { text: "", type: "info" }

  try {
    if (isConnected.value) {
      await printTestLabel()
      message.value = { text: "Cetak tes berhasil dikirim ke printer!", type: "success" }
    } else {
      const sampleTx = {
        queue_number: "089",
        receipt_number: "TRX-TES-001",
        customer_name: "Budi (Tes Print)",
        service_name: "Cuci Kering Drop-Off",
        created_at: new Date().toISOString()
      }
      printViaSystemDialog(sampleTx)
      message.value = { text: "Membuka dialog cetak tes sistem browser...", type: "info" }
    }
  } catch (err) {
    console.error("Test print error:", err)
    message.value = { text: err.message || "Gagal melakukan cetak tes.", type: "error" }
  } finally {
    isPrintingTest.value = false
  }
}

function handleClose() {
  emit("close")
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 max-w-md mx-auto animate-fade-in"
  >
    <div class="bg-white rounded-3xl p-6 w-full flex flex-col gap-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🖨️</span>
          <div>
            <h3 class="text-lg font-bold text-slate-800">Pengaturan Printer Thermal</h3>
            <p class="text-xs text-slate-500">Cetak Label Keranjang via Web Bluetooth</p>
          </div>
        </div>
        <button
          @click="handleClose"
          class="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center hover:bg-slate-200"
        >
          ✕
        </button>
      </div>

      <!-- Browser Compatibility Warning -->
      <div
        v-if="!isSupported"
        class="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5"
      >
        <span class="text-base">⚠️</span>
        <div>
          <p class="font-bold">Web Bluetooth Tidak Didukung</p>
          <p class="mt-0.5 text-rose-700 leading-relaxed">
            Peramban Anda tidak mendukung Web Bluetooth API. Gunakan peramban Google Chrome / Edge / Opera pada perangkat Android atau Desktop.
            Pencetakan label akan secara otomatis menggunakan fallback <strong>Dialog Sistem Browser (window.print)</strong>.
          </p>
        </div>
      </div>

      <!-- Feedback Alert Banner -->
      <div
        v-if="message.text"
        :class="[
          'p-3 rounded-xl text-xs font-medium border flex items-center gap-2',
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          message.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
          'bg-slate-100 border-slate-200 text-slate-700'
        ]"
      >
        <span>{{ message.type === 'success' ? '✓' : message.type === 'error' ? '⚠️' : 'ℹ️' }}</span>
        <span class="flex-1">{{ message.text }}</span>
      </div>

      <!-- Status Perangkat Bluetooth -->
      <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Status Bluetooth</span>
          <span
            :class="[
              'text-xs font-bold px-3 py-1 rounded-full border',
              isConnected
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-slate-200 text-slate-600 border-slate-300'
            ]"
          >
            {{ isConnected ? '● Terhubung' : '○ Terputus' }}
          </span>
        </div>

        <div v-if="isConnected" class="text-xs text-slate-700">
          <span class="text-slate-500 font-medium">Perangkat: </span>
          <span class="font-bold text-slate-800">{{ deviceName || 'Printer ESC/POS' }}</span>
        </div>

        <!-- Tombol Connect / Disconnect -->
        <div v-if="isSupported">
          <button
            v-if="!isConnected"
            @click="handleConnect"
            :disabled="isLoading"
            class="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-extrabold rounded-xl shadow-xs transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span v-if="isLoading" class="animate-spin text-lg">🌀</span>
            <span>{{ isLoading ? 'Mencari Perangkat...' : '📡 Hubungkan Printer Bluetooth' }}</span>
          </button>

          <button
            v-else
            @click="handleDisconnect"
            :disabled="isLoading"
            class="w-full py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-98 text-white font-bold rounded-xl shadow-xs transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span>Putuskan Koneksi Printer</span>
          </button>
        </div>
      </div>

      <!-- Toggle Ukuran Kertas -->
      <div class="flex flex-col gap-2">
        <label class="text-xs font-bold uppercase text-slate-500 tracking-wider">Ukuran Kertas Thermal</label>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            @click="handleSelectPaperWidth('58mm')"
            :class="[
              'py-3.5 px-4 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1 transition-all',
              paperWidth === '58mm'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            ]"
          >
            <span class="text-base font-extrabold">58 mm</span>
            <span class="text-[10px] text-slate-500 font-normal">Standard / 32 Karakter</span>
          </button>

          <button
            type="button"
            @click="handleSelectPaperWidth('80mm')"
            :class="[
              'py-3.5 px-4 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1 transition-all',
              paperWidth === '80mm'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            ]"
          >
            <span class="text-base font-extrabold">80 mm</span>
            <span class="text-[10px] text-slate-500 font-normal">Lebar / 48 Karakter</span>
          </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col gap-2 mt-2">
        <!-- Test Print Button -->
        <button
          @click="handleTestPrint"
          :disabled="isPrintingTest"
          class="w-full py-3 bg-slate-800 hover:bg-slate-900 active:scale-98 text-white font-bold rounded-xl shadow-xs transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <span v-if="isPrintingTest" class="animate-spin">🌀</span>
          <span>🧪 Cetak Tes (Test Print)</span>
        </button>

        <!-- Close Button -->
        <button
          @click="handleClose"
          class="w-full py-3 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold rounded-xl transition-all text-xs border border-slate-200"
        >
          Selesai / Simpan
        </button>
      </div>
    </div>
  </div>
</template>
