"use client";

import React, { useState } from "react";
import {
  Search,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MessageCircle,
  Book,
  CreditCard,
  PiggyBank,
  Settings,
} from "lucide-react";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { color } from "chart.js/helpers";
import Swal from "sweetalert2";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    id: "1",
    question: "Bagaimana cara mengajukan pinjaman?",
    answer:
      "Untuk mengajukan pinjaman, klik tombol 'Ajukan Pinjaman Baru' di halaman Pinjaman. Isi formulir dengan jumlah pinjaman, tenor, dan tujuan pinjaman. Pengajuan akan diproses dalam 1-3 hari kerja.",
    category: "pinjaman",
  },
  {
    id: "2",
    question: "Apa saja jenis simpanan yang tersedia?",
    answer:
      "Koperasi menyediakan 3 jenis simpanan: Simpanan Pokok (wajib saat bergabung), Simpanan Wajib (bulanan), dan Simpanan Sukarela (opsional). Setiap jenis memiliki ketentuan dan manfaat berbeda.",
    category: "simpanan",
  },
  {
    id: "3",
    question: "Bagaimana cara mengecek status pinjaman saya?",
    answer:
      "Status pinjaman dapat dicek di halaman Pinjaman. Anda akan melihat status 'Aktif', 'Lunas', atau 'Menunggu' untuk setiap pengajuan. Notifikasi juga akan dikirim via email/SMS.",
    category: "pinjaman",
  },
  {
    id: "4",
    question: "Apakah saya bisa menarik simpanan kapan saja?",
    answer:
      "Simpanan Pokok dan Wajib tidak dapat ditarik sepenuhnya. Simpanan Sukarela dapat ditarik dengan syarat minimal saldo tertentu. Penarikan memerlukan persetujuan admin.",
    category: "simpanan",
  },
  {
    id: "5",
    question: "Bagaimana cara mengubah password?",
    answer:
      "Pergi ke halaman Pengaturan > Keamanan. Masukkan password lama, password baru, dan konfirmasi. Pastikan password minimal 6 karakter dan mengandung kombinasi huruf dan angka.",
    category: "akun",
  },
  {
    id: "6",
    question: "Apa yang harus dilakukan jika lupa password?",
    answer:
      "Klik 'Lupa Password' di halaman login. Masukkan email terdaftar dan ikuti instruksi reset password yang dikirim ke email Anda.",
    category: "akun",
  },
  {
    id: "7",
    question: "Bagaimana cara mengupdate informasi profil?",
    answer:
      "Kunjungi halaman Pengaturan > Profil. Update nama, email, atau nomor telepon sesuai kebutuhan. Perubahan akan tersimpan otomatis.",
    category: "akun",
  },
  {
    id: "8",
    question: "Apakah ada biaya administrasi untuk pinjaman?",
    answer:
      "Ya, terdapat biaya administrasi sebesar 1% dari jumlah pinjaman. Biaya ini akan dipotong dari pencairan pinjaman.",
    category: "pinjaman",
  },
];

const guideSections = [
  {
    title: "Panduan Pinjaman",
    icon: <CreditCard className="text-blue-500" size={24} />,
    steps: [
      "Login ke akun Anda",
      "Klik menu 'Pinjaman'",
      "Klik 'Ajukan Pinjaman Baru'",
      "Isi formulir dengan lengkap",
      "Tunggu persetujuan (1-3 hari)",
      "Pinjaman cair setelah disetujui",
    ],
  },
  {
    title: "Panduan Simpanan",
    icon: <PiggyBank className="text-emerald-500" size={24} />,
    steps: [
      "Login ke akun Anda",
      "Klik menu 'Simpanan'",
      "Klik 'Setor Simpanan'",
      "Pilih jenis simpanan",
      "Masukkan jumlah setor",
      "Konfirmasi transaksi",
    ],
  },
  {
    title: "Panduan Pengaturan",
    icon: <Settings className="text-purple-500" size={24} />,
    steps: [
      "Klik menu 'Pengaturan'",
      "Pilih tab yang diinginkan",
      "Update informasi sesuai kebutuhan",
      "Simpan perubahan",
      "Pengaturan otomatis tersimpan",
    ],
  },
];

export default function HalamanBantuan() {
  const colors = useColors();
  const { theme } = useTheme();
  const isLight = theme == "light";
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("semua");
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);

  const filteredFAQs = faqData.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "semua" || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (id: string) => {
    setOpenFAQ(openFAQ === id ? null : id);
  };

  const categories = [
    { value: "semua", label: "Semua", count: faqData.length },
    {
      value: "pinjaman",
      label: "Pinjaman",
      count: faqData.filter((f) => f.category === "pinjaman").length,
    },
    {
      value: "simpanan",
      label: "Simpanan",
      count: faqData.filter((f) => f.category === "simpanan").length,
    },
    {
      value: "akun",
      label: "Akun",
      count: faqData.filter((f) => f.category === "akun").length,
    },
  ];

  return (
    <div
      className="min-h-screen p-8"
      style={{ backgroundColor: colors.background }}
    >
      {/* HEADER */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold"
          style={{ color: colors.textPrimary }}
        >
          Pusat Bantuan
        </h1>
        <p className="text-sm" style={{ color: colors.textSecondary }}>
          Temukan jawaban dan panduan untuk menggunakan aplikasi koperasi.
        </p>
      </div>

      {/* SEARCH & FILTER */}
      <div className="mb-8 space-y-4">
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-3"
            style={{ color: colors.textSecondary }}
            size={20}
          />
          <input
            type="text"
            placeholder="Cari pertanyaan atau kata kunci..."
            value={searchTerm}
            style={{ borderColor: colors.border, color: colors.textPrimary }}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.value
                  ? isLight
                    ? "bg-red-100 text-red-700 border border-red-200"
                    : "bg-red-950 text-red-300 border border-red-800"
                  : isLight
                    ? "bg-white text-slate-600 hover:bg-gray-50 border border-gray-200"
                    : "bg-slate-900 text-slate-400 hover:bg-gray-800 border border-gray-700"
              }`}
            >
              {category.label} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* FAQ SECTION */}
      <div className="mb-12">
        <h2
          style={{ color: colors.textPrimary }}
          className="text-xl font-bold mb-6 flex items-center gap-2"
        >
          <HelpCircle size={24} className={`text-red-500`} />
          Pertanyaan Umum (FAQ)
        </h2>

        <div className="space-y-4">
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((faq) => (
              <div
                key={faq.id}
                className="rounded-lg border shadow-sm overflow-hidden"
                style={{
                  borderColor: colors.border,
                  background: colors.surface,
                }}
              >
                <button
                  onClick={() => toggleFAQ(faq.id)}
                  className={`w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-${isLight ? "50" : "950"} transition-colors`}
                >
                  <span
                    className="font-medium"
                    style={{ color: colors.textPrimary }}
                  >
                    {faq.question}
                  </span>
                  {openFAQ === faq.id ? (
                    <ChevronUp size={20} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={20} className="text-slate-400" />
                  )}
                </button>
                {openFAQ === faq.id && (
                  <div className="px-6 pb-4">
                    <p
                      style={{ color: colors.textSecondary }}
                      className="leading-relaxed"
                    >
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <HelpCircle size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                Tidak ada pertanyaan yang cocok dengan pencarian Anda.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* GUIDE SECTION */}
      <div className="mb-12">
        <h2
          style={{ color: colors.textPrimary }}
          className="text-xl font-bold mb-6 flex items-center gap-2"
        >
          <Book size={24} className="text-red-500" />
          Panduan Penggunaan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {guideSections.map((section, index) => (
            <div
              key={index}
              className="rounded-xl border shadow-sm p-6"
              style={{ borderColor: colors.border, background: colors.surface }}
            >
              <div className="flex items-center gap-3 mb-4">
                {section.icon}
                <h3 className="font-bold" style={{ color: colors.textPrimary }}>
                  {section.title}
                </h3>
              </div>
              <ol className="space-y-2">
                {section.steps.map((step, stepIndex) => (
                  <li
                    key={stepIndex}
                    className="flex items-start gap-2 text-sm"
                    style={{ color: colors.textSecondary }}
                  >
                    <span className="shrink-0 w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                      {stepIndex + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>

      {/* CONTACT SECTION */}
      <div>
        <h2
          style={{ color: colors.textPrimary }}
          className="text-xl font-bold mb-6 flex items-center gap-2"
        >
          <MessageCircle size={24} className="text-red-500" />
          Butuh Bantuan Lebih Lanjut?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className="rounded-xl border shadow-sm p-6 text-center"
            style={{
              borderColor: colors.border,
              background: colors.surface,
            }}
          >
            <Phone size={32} className="text-blue-500 mx-auto mb-3" />
            <h3
              className="font-bold mb-2"
              style={{ color: colors.textPrimary }}
            >
              Telepon
            </h3>
            <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
              Hubungi customer service kami
            </p>
            <p className="font-mono text-red-600">(021) 1234-5678</p>
            <p style={{ color: colors.textSecondary }} className="text-xs mt-1">
              Senin - Jumat, 08:00 - 17:00
            </p>
          </div>

          <div
            className="rounded-xl border shadow-sm p-6 text-center"
            style={{ borderColor: colors.border, background: colors.surface }}
          >
            <Mail size={32} className="text-emerald-500 mx-auto mb-3" />
            <h3
              className="font-bold text-slate-800 mb-2"
              style={{ color: colors.textPrimary }}
            >
              Email
            </h3>
            <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
              Kirim email untuk pertanyaan detail
            </p>
            <p className="font-mono text-red-600">
              support@koperasi-merah-putih.id
            </p>
            <p style={{ color: colors.textSecondary }} className="text-xs mt-1">
              Respon dalam 24 jam
            </p>
          </div>

          <div
            className="rounded-xl border shadow-sm p-6 text-center"
            style={{ borderColor: colors.border, background: colors.surface }}
          >
            <MessageCircle size={32} className="text-purple-500 mx-auto mb-3" />
            <h3
              className="font-bold text-slate-800 mb-2"
              style={{ color: colors.textPrimary }}
            >
              Live Chat
            </h3>
            <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
              Chat langsung dengan admin
            </p>
            <button
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
              onClick={async () => {
  await Swal.fire({
    title: "Fitur Live Chat",
    text: "Fitur live chat akan segera hadir!",
    icon: "info",
    confirmButtonText: "OK"
  });
}}
            >
              Mulai Chat
            </button>
            <p className="text-xs text-slate-500 mt-2">24/7 tersedia</p>
          </div>
        </div>
      </div>
    </div>
  );
}
