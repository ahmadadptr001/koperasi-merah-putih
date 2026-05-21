"use client";

import React, {
  useState,
  InputHTMLAttributes,
  ReactNode,
  useEffect,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Building,
  FileText,
  ShieldCheck,
} from "lucide-react";
// Pastikan path ini sesuai dengan project kamu
import { useColors } from "@/hooks/useColors";
import Swal from "sweetalert2";

// --- SCHEMA VALIDASI GABUNGAN ---
const formSchema = z.object({
  nik: z
    .string()
    .min(16, { message: "NIK minimal 16 digit" })
    .max(16, { message: "NIK maksimal 16 digit" }),
  nama: z.string().min(3, { message: "Nama terlalu pendek" }),
  phone: z.string().min(10, { message: "No HP invalid" }),
  email: z.string().email({ message: "Email salah format" }),
  password: z.string().min(8, { message: "Password minimal 8 karakter" }),
  ktpAccepted: z.any().refine((files) => files && files.length > 0, {
    message: "Upload KTP wajib dilakukan",
  }),
  kkAccepted: z.any().refine((files) => files && files.length > 0, {
    message: "Upload KK wajib dilakukan",
  }),

  // FIX: Menangani kasus saat awal form di-render nilainya masih kosong/undefined
  paket: z.enum(["pokok", "wajib"], {
    message: "Pilih paket simpanan",
  }),

  agreed: z
    .boolean()
    .refine((val) => val === true, { message: "Anda harus setuju" }),
});

type FormValues = z.infer<typeof formSchema>;

const steps = ["Data Diri", "Dokumen", "Simpanan", "Persetujuan"];

export default function HalamanDaftar() {
  const colors = useColors();
  const [activeStep, setActiveStep] = useState(0);
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      nik: "",
      nama: "",
      phone: "",
      email: "",
      password: "",
      agreed: false,
      // Trick untuk TS agar tidak error saat render pertama
      paket: "" as unknown as "pokok" | "wajib",
    },
  });

  type FieldName = keyof FormValues;
  const stepFields: FieldName[][] = [
    ["nik", "nama", "phone", "email", "password"],
    ["ktpAccepted", "kkAccepted"],
    ["paket"],
    ["agreed"],
  ];

  const onNext = async () => {
    const fieldsToValidate = stepFields[activeStep];
    const isStepValid = await trigger(fieldsToValidate);

    if (isStepValid) {
      setActiveStep((s) => s + 1);
    }
  };

  const onSubmitFinal = async (data: FormValues) => {
    console.log("Data Selesai:", data);
    await Swal.fire({
      title: "Pendaftaran Berhasil!",
      text: "Anda berhasil terdaftar sebagai anggota koperasi.",
      icon: "success",
      confirmButtonText: "OK"
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* KIRI: Branding */}
      <div
        className="hidden lg:flex lg:w-[40%] flex-col justify-center px-12 py-12 text-white relative overflow-hidden"
        style={{ backgroundColor: colors.primary }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6 font-bold text-xl">
            <Building size={24} />
            <span>Koperasi Merah Putih</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
            Wujudkan Masa Depan
            <br />
            Finansial Anda.
          </h1>
          <p className="opacity-90 text-sm md:text-base leading-relaxed">
            Bergabunglah menjadi bagian dari ekosistem koperasi modern yang
            transparan dan memberdayakan ekonomi rakyat.
          </p>
        </div>
      </div>

      {/* KANAN: Form Area */}
      <div className="w-full lg:w-[60%] p-4 md:p-8 lg:p-12 flex items-center justify-center flex-col">
        {/* FIX: Memperlebar max-width dari max-w-md menjadi max-w-xl */}
        <div className="w-full max-w-xl bg-white border-red-400 rounded-2xl shadow-xl p-6 md:p-10 border">
          {/* HEADER JUDUL */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Daftar Anggota</h2>
            <p className="text-sm text-gray-500 mt-1">
              Lengkapi informasi berikut untuk melanjutkan.
            </p>
          </div>

          {/* STEPPER INDICATOR */}
          <div className="flex justify-between items-center mb-8 relative">
            <div
              className="absolute top-4 left-0 w-full h-0.5 -z-10"
              style={{ backgroundColor: "#e5e7eb" }}
            ></div>

            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2
                  ${idx <= activeStep ? "text-white scale-110" : "bg-white text-gray-400"}`}
                  style={{
                    borderColor: idx <= activeStep ? colors.primary : "#e5e7eb",
                    backgroundColor:
                      idx <= activeStep ? colors.primary : "#fff",
                  }}
                >
                  {idx < activeStep ? "✓" : idx + 1}
                </div>
                <span
                  className={`text-[10px] font-medium ${idx === activeStep ? "text-red-600 font-bold" : "text-gray-400"}`}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>

          {/* FORM CONTENT DYNAMIC */}
          <form onSubmit={handleSubmit(onSubmitFinal)} className="space-y-5">
            {/* STEP 1: DATA PRIBADI */}
            {activeStep === 0 && (
              <div className="animate-fade-in space-y-4">
                <InputGroup
                  label="Nomor Induk Kependudukan (NIK)"
                  type="number"
                  placeholder="16 Digit Angka"
                  error={errors.nik?.message}
                  maxLength={16}
                  {...register("nik")}
                />
                <InputGroup
                  label="Nama Lengkap"
                  type="text"
                  placeholder="Sesuai KTP"
                  error={errors.nama?.message}
                  {...register("nama")}
                />
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup
                    label="No. Handphone"
                    type="text"
                    placeholder="08xx..."
                    error={errors.phone?.message}
                    {...register("phone")}
                  />
                  <InputGroup
                    label="Alamat Email"
                    type="email"
                    placeholder="mail@domain.com"
                    error={errors.email?.message}
                    {...register("email")}
                  />
                </div>
                <InputGroup
                  label="Kata Sandi"
                  type={showPass ? "text" : "password"}
                  placeholder="Min 8 karakter"
                  error={errors.password?.message}
                  rightIcon={
                    showPass ? (
                      <EyeOff
                        size={18}
                        onClick={() => setShowPass(!showPass)}
                        className="cursor-pointer text-gray-400 hover:text-gray-600"
                      />
                    ) : (
                      <Eye
                        size={18}
                        onClick={() => setShowPass(!showPass)}
                        className="cursor-pointer text-gray-400 hover:text-gray-600"
                      />
                    )
                  }
                  {...register("password")}
                />
              </div>
            )}

            {/* STEP 2: UPLOAD DOKUMEN */}
            {activeStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <FileUpload
                  label="Foto KTP"
                  accept="image/*"
                  error={errors.ktpAccepted?.message as string}
                  {...register("ktpAccepted")}
                />
                <FileUpload
                  label="Foto Kartu Keluarga"
                  accept="image/*"
                  error={errors.kkAccepted?.message as string}
                  {...register("kkAccepted")}
                />
                <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100 flex gap-2">
                  <ShieldCheck size={16} /> Dokumen bersifat aman dan
                  terenkripsi.
                </div>
              </div>
            )}

            {/* STEP 3: PILIH SIMPANAN */}
            {activeStep === 2 && (
              <div className="space-y-4 animate-fade-in">
                <label
                  className="block text-sm font-semibold"
                  style={{ color: colors.textPrimary }}
                >
                  Pilihan Simpanan
                </label>
                <div className="grid gap-4">
                  <OptionCard
                    label="Simpanan Pokok"
                    desc="Rp 100.000 (Sekali bayar)"
                    checked={watch("paket") === "pokok"}
                    onClick={() =>
                      setValue("paket", "pokok", { shouldValidate: true })
                    }
                    error={errors.paket?.message}
                  />
                  <OptionCard
                    label="Simpanan Wajib"
                    desc="Rp 50.000 / bulan"
                    checked={watch("paket") === "wajib"}
                    onClick={() =>
                      setValue("paket", "wajib", { shouldValidate: true })
                    }
                    error={errors.paket?.message}
                  />
                </div>
              </div>
            )}

            {/* STEP 4: AGREEMENT */}
            {activeStep === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="h-32 overflow-y-auto p-4 bg-gray-50 rounded-lg text-xs text-gray-500 border border-gray-200">
                  <p>
                    <strong>Syarat & Ketentuan</strong>
                  </p>
                  <br />
                  <p>
                    Dengan mendaftarkan diri pada Koperasi Merah Putih, anggota
                    menyatakan telah membaca, mengerti, dan menyetujui seluruh
                    ketentuan yang berlaku...
                  </p>
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 rounded border-gray-300 accent-red-600 cursor-pointer"
                    {...register("agreed")}
                  />
                  <span
                    className="text-sm text-gray-600 select-none cursor-pointer"
                    onClick={() =>
                      setValue("agreed", !watch("agreed"), {
                        shouldValidate: true,
                      })
                    }
                  >
                    Saya menyetujui semua syarat dan ketentuan yang berlaku.
                  </span>
                </div>
                {errors.agreed && (
                  <p className="text-red-500 text-xs">
                    {errors.agreed.message}
                  </p>
                )}
              </div>
            )}

            {/* FOOTER ACTION BUTTONS */}
            <div className="pt-4 flex gap-3">
              {activeStep > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(activeStep - 1)}
                  className="flex-1 py-3 rounded-lg text-sm font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Kembali
                </button>
              )}

              {activeStep === 3 ? (
                <button
                  type="submit"
                  disabled={!isValid}
                  className="flex-1 py-3 rounded-lg text-sm font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: colors.primary,
                    boxShadow: `0 4px 12px ${colors.primary}40`,
                  }}
                >
                  Daftar Sekarang
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onNext}
                  className="flex-1 py-3 rounded-lg text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: colors.primary,
                    boxShadow: `0 4px 12px ${colors.primary}40`,
                  }}
                >
                  Lanjutkan
                </button>
              )}
            </div>
          </form>
          <div className="mt-5 text-center">
            <p className="text-sm">
              Sudah punya akun?{" "}
              <a
                href="/autentikasi/masuk"
                className="hover:underline font-bold"
                style={{ color: colors.primary }}
              >
                Masuk
              </a>
            </p>
          </div>
        </div>

        {/* FOOTER COPIRIGHT */}
        <div className="mt-7 ">
          <p className="mt-5 text-center text-xs text-gray-400 pointer-events-none">
            &copy; 2026 Koperasi Merah Putih
          </p>
        </div>
      </div>
    </div>
  );
}

// --- SUB-KOMPONEN BANTUAN (REUSABLE) ---

interface InputGroupProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightIcon?: ReactNode;
}

const InputGroup = React.forwardRef<HTMLInputElement, InputGroupProps>(
  ({ label, error, rightIcon, ...props }, ref) => {
    const colors = useColors();
    return (
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            className={`w-full text-black p-3 rounded-lg border outline-none transition-all text-sm ${error ? "border-red-400 bg-red-50 focus:border-red-500" : "border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-100"}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-3">{rightIcon}</div>
          )}
        </div>
        {error && <p className="text-red-500 text-[11px] mt-1 ml-1">{error}</p>}
      </div>
    );
  },
);
InputGroup.displayName = "InputGroup";

interface FileUploadProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

// FIX: Menambahkan state lokal untuk Image Preview
const FileUpload = React.forwardRef<HTMLInputElement, FileUploadProps>(
  ({ label, error, onChange, ...props }, ref) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        // Buat temporary URL untuk preview image
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }

      // Tetap panggil onChange dari react-hook-form agar validasi berjalan
      if (onChange) {
        onChange(e);
      }
    };

    // Bersihkan memory URL saat komponen unmount
    useEffect(() => {
      return () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      };
    }, [previewUrl]);

    return (
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label}
        </label>
        <label
          className={`border-2 border-dashed rounded-lg p-6 text-center block cursor-pointer hover:bg-gray-50 transition-all ${error ? "border-red-300 bg-red-50" : "border-gray-300"}`}
        >
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="mx-auto max-h-32 object-contain rounded"
              />
              <div className="mt-3 text-xs font-semibold text-blue-600">
                Klik untuk mengganti foto
              </div>
            </div>
          ) : (
            <>
              <FileText className="mx-auto mb-2 opacity-40" size={24} />
              <p className="text-xs text-gray-500">Klik untuk upload foto</p>
            </>
          )}
          <input
            type="file"
            className="hidden"
            ref={ref}
            onChange={handleFileChange}
            {...props}
          />
        </label>
        {error && <p className="text-red-500 text-[11px] mt-1 ml-1">{error}</p>}
      </div>
    );
  },
);
FileUpload.displayName = "FileUpload";

interface OptionCardProps {
  label: string;
  desc: string;
  checked: boolean;
  error?: string;
  onClick: () => void;
}

function OptionCard({ label, desc, checked, error, onClick }: OptionCardProps) {
  const colors = useColors();

  return (
    <div onClick={onClick}>
      <div
        className={`p-6 rounded-xl border-2 cursor-pointer flex justify-between items-center transition-all ${checked ? "border-primary bg-red-50" : "border-gray-100 hover:border-gray-200"}`}
        style={{
          borderColor: error ? "red" : checked ? colors.primary : "#f3f4f6",
          backgroundColor: checked ? "rgba(220, 38, 38, 0.05)" : "white",
        }}
      >
        <div className="flex flex-col gap-1">
          <span className="font-bold text-base text-gray-800">{label}</span>
          <span className="text-sm text-gray-500">{desc}</span>
        </div>
        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${checked ? "border-transparent" : "border-gray-300"}`}
          style={{ backgroundColor: checked ? colors.primary : "transparent" }}
        >
          {checked && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
        </div>
      </div>
      {error && <p className="text-red-500 text-[11px] mt-1 ml-1">{error}</p>}
    </div>
  );
}
