import Image from "next/image";

type PrintLayoutProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  logoSrc: string;
  showLogo?: boolean;
  elementPrintRef: any;
};

export default function PrintLayout({
  children,
  title,
  subtitle,
  logoSrc,
  showLogo = true,
  elementPrintRef,
}: PrintLayoutProps) {
  return (
    <div
      ref={elementPrintRef}
      className="min-h-[210mm] min-w-[148mm] p-6 pt-10"
    >
      {/* Header with logo and title */}
      <div className="flex items-start mb-8">
        {showLogo && (
          <Image
            src={logoSrc}
            alt="Logo Kabupaten Konawe"
            width={60}
            height={60}
            loading="eager"
            className="mr-4"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-widest">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>

      <hr className="border-b border-gray-800 mb-6" />

      {/* Main content */}
      <div className="prose prose-lg max-w-none">{children}</div>

      <hr className="border-b border-gray-800 mt-6" />

      {/* Footer example */}
      <div className="mt-10 flex justify-between text-sm">
        <div>
          <p className="mb-1">
            Dicetak pada: {new Date().toLocaleDateString("id-ID")}
          </p>
          <p className="mb-1">
            Nomor Dokumen: {/* will be filled from props */}
          </p>
        </div>
        <div className="text-right">
          <p className="mb-1">Petugas,</p>
          <p className="h-12"></p> {/* signature line */}
          <p className="font-bold">Nama Petugas</p>
          <p>NIP. XXXXX</p>
        </div>
      </div>
    </div>
  );
}
