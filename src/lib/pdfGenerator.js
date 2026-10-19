import jsPDF from 'jspdf'
import { supabase } from './supabase'

/**
 * Format currency to IDR
 */
function formatCurrency(amount) {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(num)
}

/**
 * Generates a receipt PDF using jsPDF, uploads it to Supabase Storage ('receipts' bucket),
 * and updates the transaction row with `receipt_pdf_url`.
 *
 * @param {Object} transaction - Transaction object
 * @param {Array} items - Array of item objects [{ name/service_name, qty, price, unit, subtotal }]
 * @param {Object} [tenant] - Tenant/Business info { business_name, phone_number }
 * @returns {Promise<{ publicUrl: string, pdfBlob: Blob, doc: jsPDF }>}
 */
export async function generateReceiptPDF(transaction, items = [], tenant = {}) {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: [80, 150] // Receipt thermal receipt size format: 80mm width, 150mm height
  })

  const tenantName = tenant?.business_name || 'LaundryPro'
  const tenantPhone = tenant?.phone_number || ''
  const receiptNum = transaction?.receipt_number || 'TRX-0000'
  const customerName = transaction?.customer_name || 'Pelanggan Umum'
  const customerPhone = transaction?.customer_phone || '-'
  const paymentMethod = (transaction?.payment_method || 'CASH').toUpperCase()
  const paymentStatus = (transaction?.status || transaction?.payment_status || 'LUNAS').toUpperCase()
  const createdAt = transaction?.created_at || new Date().toLocaleString('id-ID')
  const totalAmount = Number(transaction?.total_amount) || 0

  const itemList = (items && items.length > 0)
    ? items
    : (transaction?.items && transaction.items.length > 0 ? transaction.items : [])

  let y = 10

  // Header / Brand Name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(tenantName, 40, y, { align: 'center' })
  y += 5

  if (tenantPhone) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Telp: ${tenantPhone}`, 40, y, { align: 'center' })
    y += 4
  }

  // Divider
  doc.setLineWidth(0.2)
  doc.line(5, y, 75, y)
  y += 5

  // Transaction Meta
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)

  doc.text(`No. Nota : ${receiptNum}`, 5, y)
  y += 4
  doc.text(`Tgl/Waktu : ${createdAt}`, 5, y)
  y += 4
  doc.text(`Pelanggan : ${customerName}`, 5, y)
  if (customerPhone && customerPhone !== '-') {
    y += 4
    doc.text(`No. WA    : ${customerPhone}`, 5, y)
  }

  y += 3
  doc.line(5, y, 75, y)
  y += 5

  // Items Table Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Layanan / Item', 5, y)
  doc.text('Total', 75, y, { align: 'right' })
  y += 4

  doc.setFont('helvetica', 'normal')

  // Items
  itemList.forEach((item) => {
    const name = item.name || item.service_name || 'Layanan'
    const qty = item.qty || item.quantity || 1
    const unit = item.unit || 'x'
    const price = Number(item.price) || 0
    const subtotal = Number(item.subtotal) || (price * qty)

    // Truncate long item names
    const displayName = name.length > 25 ? name.substring(0, 22) + '...' : name
    doc.text(displayName, 5, y)
    y += 3.5

    const detailText = `  ${qty} ${unit} @ ${formatCurrency(price)}`
    doc.text(detailText, 5, y)
    doc.text(formatCurrency(subtotal), 75, y, { align: 'right' })
    y += 5
  })

  doc.line(5, y, 75, y)
  y += 5

  // Total
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Total Tagihan:', 5, y)
  doc.text(formatCurrency(totalAmount), 75, y, { align: 'right' })
  y += 5

  // Status & Method
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Metode Bayar: ${paymentMethod}`, 5, y)
  y += 4
  doc.text(`Status       : ${paymentStatus}`, 5, y)
  y += 6

  // Footer Note
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.text('Terima kasih telah mempercayakan', 40, y, { align: 'center' })
  y += 3.5
  doc.text('pakaian Anda kepada kami!', 40, y, { align: 'center' })

  // Convert PDF to Blob
  const pdfBlob = doc.output('blob')

  // Upload to Supabase Storage if transaction ID exists or fallback
  let publicUrl = ''
  try {
    const fileName = `receipt_${receiptNum.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.pdf`
    const filePath = `public/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      console.warn('Gagal mengunggah PDF ke Supabase Storage:', uploadError.message)
    } else {
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath)

      publicUrl = urlData?.publicUrl || ''

      // Update transactions table if transaction has a valid ID
      if (transaction?.id && !transaction.id.startsWith('local-tx-')) {
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ receipt_pdf_url: publicUrl })
          .eq('id', transaction.id)

        if (updateError) {
          console.warn('Gagal memperbarui receipt_pdf_url pada transaksi:', updateError.message)
        }
      }
    }
  } catch (err) {
    console.warn('Kesalahan saat mengunggah/mengakuisisi URL PDF:', err)
  }

  return {
    publicUrl,
    pdfBlob,
    doc
  }
}
