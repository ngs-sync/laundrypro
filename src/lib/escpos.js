/**
 * Utility ESC/POS Driver for Thermal Bluetooth Printers
 * Standard raw ESC/POS byte generator for LaundryPro Basket Labels
 */

// ESC/POS Commands
export const ESC_POS = {
  INIT: [0x1B, 0x40],            // ESC @
  ALIGN_LEFT: [0x1B, 0x61, 0],   // ESC a 0
  ALIGN_CENTER: [0x1B, 0x61, 1], // ESC a 1
  ALIGN_RIGHT: [0x1B, 0x61, 2],  // ESC a 2
  DOUBLE_SIZE: [0x1D, 0x21, 0x11], // GS ! 0x11 (Double Width & Height for queue number)
  NORMAL_SIZE: [0x1D, 0x21, 0x00], // GS ! 0x00 (Normal text size)
  BOLD_ON: [0x1B, 0x45, 1],      // ESC E 1
  BOLD_OFF: [0x1B, 0x45, 0],     // ESC E 0
  FEED_CUT: [0x1D, 0x56, 66, 0]  // GS V 66 0 (Feed & Cut)
}

/**
 * Encodes text string to UTF-8 / ASCII Uint8Array
 */
export function encodeText(str) {
  return new TextEncoder().encode(str)
}

/**
 * Formats a label/value line to fixed width
 */
function formatKeyValueLine(label, value, maxWidth) {
  const line = `${label}${value}`
  if (line.length > maxWidth) {
    return line.slice(0, maxWidth)
  }
  return line
}

/**
 * Extract 3-digit queue number string (e.g. #089)
 */
export function getQueueNumber(tx) {
  if (tx?.queue_number !== undefined && tx?.queue_number !== null) {
    const num = parseInt(tx.queue_number, 10)
    if (!isNaN(num)) {
      return String(num).padStart(3, "0")
    }
    return String(tx.queue_number).slice(-3).padStart(3, "0")
  }

  if (tx?.receipt_number) {
    const digits = String(tx.receipt_number).replace(/\D/g, "")
    if (digits.length >= 3) {
      return digits.slice(-3)
    } else if (digits.length > 0) {
      return digits.padStart(3, "0")
    }
  }

  return "089"
}

/**
 * Extract service name or summary
 */
export function getServiceSummary(tx) {
  if (tx?.service_name) return tx.service_name
  if (tx?.items && tx.items.length > 0) {
    return tx.items.map(i => i.name || i.service_name).join(", ")
  }
  if (tx?.service_type === "koin") return "Paket Koin Self-Service"
  if (tx?.service_type === "kiloan") return "Cuci Kiloan Reguler"
  if (tx?.service_type === "mixed") return "Paket Koin & Kiloan"
  return "Cuci Kering Drop-Off"
}

/**
 * Format timestamp to DD/MM/YYYY HH:mm
 */
export function formatLabelTime(dateVal) {
  let date = new Date()
  if (dateVal) {
    const parsed = new Date(dateVal)
    if (!isNaN(parsed.getTime())) {
      date = parsed
    }
  }

  const dd = String(date.getDate()).padStart(2, "0")
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const yyyy = date.getFullYear()
  const hh = String(date.getHours()).padStart(2, "0")
  const min = String(date.getMinutes()).padStart(2, "0")

  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

/**
 * Generates raw ESC/POS byte array for basket label
 *
 * Target Format:
 * ================================
 *              #089
 * TRX: TRX-XXXX
 * Pelanggan : Budi
 * Layanan   : Cuci Kering Drop-Off
 * Waktu     : DD/MM/YYYY HH:mm
 * ================================
 *
 * @param {Object} tx - Transaction object
 * @param {Object} options - { paperWidth: "58mm" | "80mm" }
 * @returns {Uint8Array}
 */
export function generateBasketLabelBytes(tx, options = {}) {
  const paperWidth = options.paperWidth === "80mm" ? "80mm" : "58mm"
  const maxLineWidth = paperWidth === "80mm" ? 48 : 32

  const queueNum = getQueueNumber(tx)
  const queueText = `#${queueNum}`
  const trxNum = tx?.receipt_number || "TRX-XXXX"
  const customerName = tx?.customer_name || "Pelanggan Umum"
  const serviceName = getServiceSummary(tx)
  const timeStr = formatLabelTime(tx?.created_at)

  const separator = "=".repeat(maxLineWidth)

  const commands = []

  function addBytes(arr) {
    if (arr instanceof Uint8Array) {
      commands.push(arr)
    } else if (Array.isArray(arr)) {
      commands.push(new Uint8Array(arr))
    }
  }

  function addString(str) {
    commands.push(encodeText(str))
  }

  // 1. Inisialisasi: [0x1B, 0x40]
  addBytes(ESC_POS.INIT)

  // 2. Alignment Center: [0x1B, 0x61, 1]
  addBytes(ESC_POS.ALIGN_CENTER)
  addString(`${separator}\n`)

  // 3. Double size / Bold: [0x1D, 0x21, 0x11] untuk nomor antrean
  addBytes(ESC_POS.DOUBLE_SIZE)
  addString(`${queueText}\n`)

  // 4. Reset Normal Size & Alignment Left: [0x1D, 0x21, 0x00], [0x1B, 0x61, 0]
  addBytes(ESC_POS.NORMAL_SIZE)
  addBytes(ESC_POS.ALIGN_LEFT)

  // 5. Lines: TRX, Pelanggan, Layanan, Waktu
  const lineTrx = formatKeyValueLine("TRX: ", trxNum, maxLineWidth)
  const lineCust = formatKeyValueLine("Pelanggan : ", customerName, maxLineWidth)
  const lineServ = formatKeyValueLine("Layanan   : ", serviceName, maxLineWidth)
  const lineTime = formatKeyValueLine("Waktu     : ", timeStr, maxLineWidth)

  addString(`${lineTrx}\n`)
  addString(`${lineCust}\n`)
  addString(`${lineServ}\n`)
  addString(`${lineTime}\n`)

  // 6. Bottom Separator
  addBytes(ESC_POS.ALIGN_CENTER)
  addString(`${separator}\n`)

  // 7. Feed & Cut: [0x1D, 0x56, 66, 0] atau 3x newline
  addString("\n\n\n")
  addBytes(ESC_POS.FEED_CUT)

  // Combine into single Uint8Array
  const totalBytes = commands.reduce((sum, item) => sum + item.length, 0)
  const result = new Uint8Array(totalBytes)
  let offset = 0
  for (const cmd of commands) {
    result.set(cmd, offset)
    offset += cmd.length
  }

  return result
}

/**
 * Generate test label ESC/POS bytes
 */
export function generateTestPrintBytes(options = {}) {
  const sampleTx = {
    queue_number: "089",
    receipt_number: "TRX-TEST-001",
    customer_name: "Budi (Tes Print)",
    service_name: "Cuci Kering Drop-Off",
    created_at: new Date().toISOString()
  }
  return generateBasketLabelBytes(sampleTx, options)
}
