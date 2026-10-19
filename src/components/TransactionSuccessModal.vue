<script setup>
import { computed, ref, watch } from "vue"
import { generateReceiptPDF } from "../lib/pdfGenerator"
import { getQueueNumber } from "../lib/escpos"
import {
  isPrinterConnected,
  printBasketLabel,
  printViaSystemDialog
} from "../lib/bluetoothPrinter"
import PrinterSettingsModal from "./PrinterSettingsModal.vue"

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  transaction: {
    type: Object,
    default: null
  },
  tenant: {
    type: Object,
    default: () => ({ business_name: "LaundryPro", phone_number: "" })
  }
})

const emit = defineEmits(["close"])

const isGeneratingPDF = ref(false)
const receiptPdfUrl = ref("")
const pdfBlob = ref(null)
const pdfDoc = ref(null)

const isPrintingLabel = ref(false)
const printSuccessMsg = ref("")
const printErrMsg = ref("")
const showPrinterSettings = ref(false)

const formattedTotal = computed(() => {
  if (!props.transaction || props.transaction.total_amount === undefined) return "Rp 0"
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(props.transaction.total_amount)
})

const queueNumberStr = computed(() => {
  return getQueueNumber(props.transaction)
})

const serviceTypeSummary = computed(() => {
  if (!props.transaction) return "Cuci Reguler"
  if (props.transaction.service_type === "koin") return "Paket Koin Self-Service"
  if (props.transaction.service_type === "kiloan") return "Layanan Cuci Kiloan"
  if (props.transaction.service_type === "mixed") return "Paket Koin & Kiloan"

  if (props.transaction.items && props.transaction.items.length > 0) {
    return props.transaction.items.map(i => i.name || i.service_name).join(", ")
  }
  return "Layanan Laundry"
})

/**
 * Format phone number to international format without plus sign (e.g. 0812... -> 62812...)
 */
function formatInternationalPhone(phone) {
  if (!phone) return ""
  let cleaned = String(phone).replace(/\D/g, "")
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.substring(1)
  } else if (cleaned.startsWith("8")) {
    cleaned = "628" + cleaned.substring(1)
  }
  return cleaned
}

// Watch for modal visibility & transaction to automatically generate PDF and acquire public URL
watch(
  () => [props.show, props.transaction],
  async ([isShown, tx]) => {
    if (isShown && tx) {
      isGeneratingPDF.value = true
      receiptPdfUrl.value = tx.receipt_pdf_url || ""
      pdfBlob.value = null
      pdfDoc.value = null
      printSuccessMsg.value = ""
      printErrMsg.value = ""

      try {
        const result = await generateReceiptPDF(tx, tx.items || [], props.tenant)
        if (result.publicUrl) {
          receiptPdfUrl.value = result.publicUrl
        }
        if (result.pdfBlob) {
          pdfBlob.value = result.pdfBlob
        }
        if (result.doc) {
          pdfDoc.value = result.doc
        }
      } catch (err) {
        console.error("Error generating PDF receipt:", err)
      } finally {
        isGeneratingPDF.value = false
      }
    }
  },
  { immediate: true }
)

async function handlePrintBasketLabel() {
  if (!props.transaction) return

  isPrintingLabel.value = true
  printSuccessMsg.value = ""
  printErrMsg.value = ""

  try {
    if (isPrinterConnected()) {
      await printBasketLabel(props.transaction)
      printSuccessMsg.value = "Label keranjang berhasil dicetak via Bluetooth!"
    } else {
      // Fallback: system print dialog
      printViaSystemDialog(props.transaction)
      printSuccessMsg.value = "Membuka dialog cetak sistem browser..."
    }
  } catch (err) {
    console.error("Gagal mencetak label keranjang:", err)
    printErrMsg.value = err.message || "Gagal mencetak label. Gunakan fallback dialog sistem."
  } finally {
    isPrintingLabel.value = false
  }
}

function sendWhatsAppReceipt() {
  if (!props.transaction) return

  const customerName = props.transaction.customer_name || "Pelanggan"
  const tenantName = props.tenant?.business_name || "LaundryPro"
  const receiptNum = props.transaction.receipt_number || "-"
  const serviceType = serviceTypeSummary.value
  const totalAmount = formattedTotal.value
  const paymentStatus = (props.transaction.status || props.transaction.payment_status || "LUNAS").toUpperCase()
  const pdfUrl = receiptPdfUrl.value || props.transaction.receipt_pdf_url || "-"

  const rawPhone = props.transaction.customer_phone || ""
  const formattedPhone = formatInternationalPhone(rawPhone)

  const messageText = `Halo Kak *${customerName}*, terima kasih telah mencuci di *${tenantName}*.
Berikut ringkasan pesanan Anda:
- No. Nota: ${receiptNum}
- Layanan: ${serviceType}
- Total: ${totalAmount} (${paymentStatus})

Lihat/unduh struk digital Anda di sini:
${pdfUrl}`

  const encodedMessage = encodeURIComponent(messageText)
  const waUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`

  window.open(waUrl, "_blank")
}

function downloadDirectPDF() {
  if (pdfDoc.value) {
    const filename = `Struk_${props.transaction?.receipt_number || "Laundry"}.pdf`
    pdfDoc.value.save(filename)
  } else if (receiptPdfUrl.value) {
    window.open(receiptPdfUrl.value, "_blank")
  } else {
    alert("PDF sedang diproses, silakan coba beberapa saat lagi.")
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
    <div class="bg-white rounded-3xl p-6 w-full text-center flex flex-col items-center gap-4 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
      <!-- Success Icon -->
      <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl font-black shadow-inner shrink-0">
        ✓
      </div>

      <!-- Title & Status Badge -->
      <div>
        <h2 class="text-xl font-bold text-slate-800">Transaksi Berhasil!</h2>
        <div class="mt-1 flex items-center justify-center gap-2">
          <span class="text-xs text-slate-500">Status Pembayaran:</span>
          <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase">
            {{ transaction?.status || transaction?.payment_status || "LUNAS" }}
          </span>
        </div>
      </div>

      <!-- Queue Number Display Badge -->
      <div v-if="transaction" class="bg-teal-50 border border-teal-200 px-4 py-2 rounded-2xl flex items-center justify-between w-full">
        <span class="text-xs font-bold text-teal-800 uppercase tracking-wider">Nomor Antrean Label</span>
        <span class="text-xl font-black font-mono text-teal-700">#{{ queueNumberStr }}</span>
      </div>

      <!-- Transaction Details Card -->
      <div v-if="transaction" class="w-full bg-slate-50 p-4 rounded-2xl text-left text-xs flex flex-col gap-2.5 border border-slate-200">
        <div class="flex justify-between border-b border-slate-200 pb-2">
          <span class="text-slate-500 font-medium">No. Nota:</span>
          <span class="font-bold text-slate-800 font-mono">{{ transaction.receipt_number || "-" }}</span>
        </div>

        <div class="flex justify-between border-b border-slate-200 pb-2">
          <span class="text-slate-500 font-medium">Nama Pelanggan:</span>
          <span class="font-semibold text-slate-800">{{ transaction.customer_name || "Pelanggan Umum" }}</span>
        </div>

        <div v-if="transaction.customer_phone" class="flex justify-between border-b border-slate-200 pb-2">
          <span class="text-slate-500 font-medium">No. WA / Telepon:</span>
          <span class="font-mono text-slate-700">{{ transaction.customer_phone }}</span>
        </div>

        <div class="flex justify-between border-b border-slate-200 pb-2">
          <span class="text-slate-500 font-medium">Metode Bayar:</span>
          <span class="font-bold text-slate-700 uppercase">{{ transaction.payment_method || "CASH" }}</span>
        </div>

        <div v-if="transaction.created_at" class="flex justify-between border-b border-slate-200 pb-2">
          <span class="text-slate-500 font-medium">Waktu Transaksi:</span>
          <span class="text-slate-600 font-mono">{{ transaction.created_at }}</span>
        </div>

        <div class="flex justify-between items-center pt-1">
          <span class="text-slate-700 font-extrabold text-sm">Total Bayar:</span>
          <span class="font-black text-emerald-600 font-mono text-lg">{{ formattedTotal }}</span>
        </div>
      </div>

      <!-- Itemized summary list -->
      <div v-if="transaction?.items?.length" class="w-full bg-slate-50/60 p-3 rounded-xl text-left text-xs border border-slate-200 max-h-28 overflow-y-auto flex flex-col gap-1.5">
        <span class="text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1 block">Rincian Item:</span>
        <div
          v-for="(item, idx) in transaction.items"
          :key="idx"
          class="flex justify-between items-center text-slate-700 text-[11px]"
        >
          <span class="truncate font-medium pr-2">{{ item.name || item.service_name }}</span>
          <span class="font-mono whitespace-nowrap text-slate-600">
            {{ item.qty }} {{ item.unit || "x" }} @ {{ new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(item.price) }}
          </span>
        </div>
      </div>

      <!-- Status PDF generation -->
      <div v-if="isGeneratingPDF" class="text-xs text-slate-500 flex items-center justify-center gap-2 py-1">
        <svg class="animate-spin h-4 w-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Membuat Struk PDF Digital...</span>
      </div>

      <!-- Action Buttons -->
      <div class="w-full flex flex-col gap-2.5 mt-1">
        <!-- Tombol Sekunder Cetak Label Keranjang -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-1.5">
            <button
              @click="handlePrintBasketLabel"
              :disabled="isGeneratingPDF || isPrintingLabel"
              class="flex-1 py-3.5 bg-teal-600 text-white font-extrabold rounded-xl shadow-md hover:bg-teal-700 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span v-if="isPrintingLabel" class="animate-spin text-base">🌀</span>
              <span v-else>🏷️</span>
              <span>Cetak Label Keranjang</span>
            </button>

            <button
              @click="showPrinterSettings = true"
              title="Pengaturan Printer"
              class="py-3.5 px-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl border border-slate-200 transition-all font-bold text-sm"
            >
              🖨️
            </button>
          </div>

          <div v-if="printSuccessMsg" class="text-xs text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
            ✓ {{ printSuccessMsg }}
          </div>
          <div v-if="printErrMsg" class="text-xs text-rose-700 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200 flex items-center justify-between gap-1">
            <span>⚠️ {{ printErrMsg }}</span>
            <button @click="showPrinterSettings = true" class="underline text-[11px] font-bold">Atur Printer</button>
          </div>
        </div>

        <!-- WhatsApp Button -->
        <button
          @click="sendWhatsAppReceipt"
          :disabled="isGeneratingPDF"
          class="w-full py-3.5 bg-[#25D366] text-white font-extrabold rounded-xl shadow-md hover:bg-[#20bd5a] active:scale-95 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
          <span>Kirim Struk ke WhatsApp</span>
        </button>

        <!-- Direct PDF Download Backup Button -->
        <button
          @click="downloadDirectPDF"
          :disabled="isGeneratingPDF"
          class="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 active:scale-95 transition-all text-xs flex items-center justify-center gap-2 border border-slate-200 disabled:opacity-60"
        >
          <span>📥 Unduh PDF Langsung</span>
        </button>

        <!-- Close / New Transaction Button -->
        <button
          @click="handleClose"
          class="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-md hover:bg-emerald-600 active:scale-95 transition-all text-sm mt-1"
        >
          Selesai / Transaksi Baru
        </button>
      </div>
    </div>

    <!-- Modal Pengaturan Printer -->
    <PrinterSettingsModal
      :show="showPrinterSettings"
      @close="showPrinterSettings = false"
    />
  </div>
</template>
