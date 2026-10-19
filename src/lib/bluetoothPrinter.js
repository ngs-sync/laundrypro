import {
  generateBasketLabelBytes,
  generateTestPrintBytes,
  getQueueNumber,
  getServiceSummary,
  formatLabelTime
} from "./escpos.js"

export const PRINTER_UUIDS = [
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "000018f0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2"
]

const STORAGE_KEYS = {
  PAPER_WIDTH: "laundrypro_paper_width",
  PRINTER_ID: "laundrypro_printer_id",
  PRINTER_NAME: "laundrypro_printer_name"
}

let activeDevice = null
let activeCharacteristic = null

export function isWebBluetoothSupported() {
  return typeof navigator !== "undefined" && "bluetooth" in navigator && !!navigator.bluetooth
}

export function getPaperWidth() {
  if (typeof localStorage === "undefined") return "58mm"
  return localStorage.getItem(STORAGE_KEYS.PAPER_WIDTH) || "58mm"
}

export function setPaperWidth(width) {
  const validWidth = width === "80mm" ? "80mm" : "58mm"
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.PAPER_WIDTH, validWidth)
  }
  return validWidth
}

export function getSavedPrinterInfo() {
  if (typeof localStorage === "undefined") return { id: null, name: null }
  return {
    id: localStorage.getItem(STORAGE_KEYS.PRINTER_ID),
    name: localStorage.getItem(STORAGE_KEYS.PRINTER_NAME)
  }
}

export function isPrinterConnected() {
  return !!(activeDevice && activeDevice.gatt && activeDevice.gatt.connected && activeCharacteristic)
}

export function getConnectedDeviceName() {
  if (activeDevice?.name) return activeDevice.name
  const saved = getSavedPrinterInfo()
  return saved.name || null
}

function onDisconnected() {
  console.log("Bluetooth printer disconnected")
  activeDevice = null
  activeCharacteristic = null
}

/**
 * Connect to Bluetooth Thermal Printer
 */
export async function connectPrinter() {
  if (!isWebBluetoothSupported()) {
    throw new Error("Web Bluetooth API tidak didukung oleh peramban ini. Silakan gunakan Chrome/Edge/Opera pada Android/Desktop.")
  }

  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_UUIDS
    })

    if (!device) {
      throw new Error("Perangkat printer tidak dipilih.")
    }

    const characteristic = await establishGattConnection(device)

    activeDevice = device
    activeCharacteristic = characteristic

    device.addEventListener("gattserverdisconnected", onDisconnected)

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.PRINTER_ID, device.id || "")
      localStorage.setItem(STORAGE_KEYS.PRINTER_NAME, device.name || "Printer Bluetooth")
    }

    return {
      success: true,
      deviceName: device.name || "Printer Bluetooth",
      deviceId: device.id
    }
  } catch (err) {
    console.error("Koneksi printer Bluetooth gagal:", err)
    throw err
  }
}

/**
 * Attempt to reconnect to previously paired device if supported by browser
 */
export async function tryAutoReconnect() {
  if (!isWebBluetoothSupported() || isPrinterConnected()) return false
  const saved = getSavedPrinterInfo()
  if (!saved.id) return false

  try {
    if (navigator.bluetooth.getDevices) {
      const devices = await navigator.bluetooth.getDevices()
      const matched = devices.find(d => d.id === saved.id)
      if (matched) {
        const characteristic = await establishGattConnection(matched)
        activeDevice = matched
        activeCharacteristic = characteristic
        matched.addEventListener("gattserverdisconnected", onDisconnected)
        return true
      }
    }
  } catch (err) {
    console.warn("Auto reconnect failed:", err)
  }
  return false
}

/**
 * Disconnect active printer
 */
export async function disconnectPrinter() {
  if (activeDevice && activeDevice.gatt && activeDevice.gatt.connected) {
    try {
      activeDevice.gatt.disconnect()
    } catch (e) {
      console.warn("Disconnect error:", e)
    }
  }
  activeDevice = null
  activeCharacteristic = null
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEYS.PRINTER_ID)
    localStorage.removeItem(STORAGE_KEYS.PRINTER_NAME)
  }
}

/**
 * Establish GATT Server connection and discover write characteristic
 */
async function establishGattConnection(device) {
  const server = await device.gatt.connect()
  let targetCharacteristic = null

  // 1. Check known primary service UUIDs first
  for (const uuid of PRINTER_UUIDS) {
    try {
      const service = await server.getPrimaryService(uuid)
      if (service) {
        const characteristics = await service.getCharacteristics()
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            targetCharacteristic = char
            break
          }
        }
      }
    } catch (e) {
      // Service not offered on this UUID
    }
    if (targetCharacteristic) break
  }

  // 2. Search all services if specific UUID service not matched
  if (!targetCharacteristic) {
    try {
      const services = await server.getPrimaryServices()
      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics()
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              targetCharacteristic = char
              break
            }
          }
        } catch (e) {}
        if (targetCharacteristic) break
      }
    } catch (e) {}
  }

  if (!targetCharacteristic) {
    throw new Error("Karakteristik cetak (Write) tidak ditemukan pada printer ini.")
  }

  return targetCharacteristic
}

/**
 * Send raw byte stream in chunks to avoid MTU buffer overflow
 */
export async function sendRawBytes(bytes) {
  if (!isPrinterConnected()) {
    throw new Error("Printer Bluetooth belum terhubung. Silakan hubungkan printer terlebih dahulu.")
  }

  const CHUNK_SIZE = 64
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, i + CHUNK_SIZE)
    if (activeCharacteristic.properties.writeWithoutResponse) {
      await activeCharacteristic.writeValueWithoutResponse(chunk)
    } else {
      await activeCharacteristic.writeValue(chunk)
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}

/**
 * Print basket label via Bluetooth ESC/POS
 */
export async function printBasketLabel(tx) {
  const paperWidth = getPaperWidth()
  const bytes = generateBasketLabelBytes(tx, { paperWidth })
  await sendRawBytes(bytes)
}

/**
 * Print test label via Bluetooth ESC/POS
 */
export async function printTestLabel() {
  const paperWidth = getPaperWidth()
  const bytes = generateTestPrintBytes({ paperWidth })
  await sendRawBytes(bytes)
}

/**
 * Fallback: Print label via browser System Print Dialog (window.print)
 */
export function printViaSystemDialog(tx) {
  const paperWidth = getPaperWidth()
  const queueNum = getQueueNumber(tx)
  const queueText = `#${queueNum}`
  const trxNum = tx?.receipt_number || "TRX-XXXX"
  const customerName = tx?.customer_name || "Pelanggan Umum"
  const serviceName = getServiceSummary(tx)
  const timeStr = formatLabelTime(tx?.created_at)

  const printWindow = window.open("", "_blank", "width=400,height=600")
  if (!printWindow) {
    alert("Gagal membuka jendela cetak. Pastikan pop-up blocker diizinkan.")
    return
  }

  const is58 = paperWidth === "58mm"
  const maxWidthCss = is58 ? "58mm" : "80mm"

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Label Keranjang - ${trxNum}</title>
        <style>
          @page {
            size: ${maxWidthCss} auto;
            margin: 0;
          }
          body {
            font-family: "Courier New", Courier, monospace;
            width: ${maxWidthCss};
            margin: 0 auto;
            padding: 8px;
            box-sizing: border-box;
            font-size: 12px;
            color: #000;
          }
          .center { text-align: center; }
          .left { text-align: left; }
          .queue-num {
            font-size: 28px;
            font-weight: bold;
            margin: 6px 0;
          }
          .divider {
            border-bottom: 1px dashed #000;
            margin: 6px 0;
          }
          .row {
            margin: 4px 0;
            word-break: break-word;
          }
        </style>
      </head>
      <body>
        <div class="divider"></div>
        <div class="center queue-num">${queueText}</div>
        <div class="divider"></div>
        <div class="left">
          <div class="row">TRX: ${trxNum}</div>
          <div class="row">Pelanggan : ${customerName}</div>
          <div class="row">Layanan   : ${serviceName}</div>
          <div class="row">Waktu     : ${timeStr}</div>
        </div>
        <div class="divider"></div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}
