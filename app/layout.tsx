import localFont from "next/font/local";
import type { Metadata } from "next";
import "./globals.css";
import "./app.css";

export const metadata: Metadata = {
  title: "Koperasi Merah Putih",
  description: "Sistem Informasi Koperasi Merah Putih",
};

const jakarta = localFont({
  src: [
    {
      path: "../public/fonts/PlusJakartaSans-Regular.ttf",
      weight: "400",
    },
    {
      path: "../public/fonts/PlusJakartaSans-SemiBold.ttf",
      weight: "500",
    },
    {
      path: "../public/fonts/PlusJakartaSans-Medium.ttf",
      weight: "600",
    },
    {
      path: "../public/fonts/PlusJakartaSans-Bold.ttf",
      weight: "700",
    },
  ],
  variable: "--font-jakarta",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jakarta.className}>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
