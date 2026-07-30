// lib/reference-number.ts
// Pembuat nomor referensi transaksi (angsuran, simpanan, dll)

/**
 * Bangun nomor referensi unik, mis. "ANG-1753848000000-A3F9K2".
 *
 * Timestamp saja tidak cukup: dua transaksi yang diproses dalam milidetik
 * yang sama menghasilkan nomor identik dan langsung ditolak oleh unique
 * constraint `reference_number`. Komponen acak menghilangkan tabrakan itu.
 */
export function buildReferenceNumber(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${Date.now()}-${random}`;
}
