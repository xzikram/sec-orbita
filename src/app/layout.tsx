import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Security Patrol Monitoring System — JEC ORBITA",
  description: "Sistem monitoring patroli security digital untuk RS Mata JEC ORBITA. Digitalisasi buku patroli dengan foto bukti, QR validasi, dan dashboard real-time.",
  keywords: "security patrol, monitoring, JEC ORBITA, rumah sakit mata",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JEC Security",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0A1628",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
