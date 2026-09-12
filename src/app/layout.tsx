import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaInstallBanner from "@/components/PwaInstallBanner";

export const metadata: Metadata = {
  title: "Security Patrol Monitoring System — JEC ORBITA",
  description: "Sistem monitoring patroli security digital untuk RS Mata JEC ORBITA. Digitalisasi buku patroli dengan foto bukti, QR validasi, dan dashboard real-time.",
  keywords: "security patrol, monitoring, JEC ORBITA, rumah sakit mata",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SecPatrol",
    startupImage: [
      "/icons/icon-512.png",
    ],
  },
  icons: {
    icon: "/icons/icon-192.png",
    shortcut: "/icons/icon-192.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
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
      <head>
        <link rel="icon" href="/icons/icon-192.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SecPatrol" />
        <meta name="application-name" content="SecPatrol" />
        <meta name="format-detection" content="telephone=no" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Auto-recover from chunk load errors caused by new deployments
              window.addEventListener('error', function(e) {
                var msg = (e && e.message) || '';
                if (msg.indexOf('Loading chunk') !== -1 || msg.indexOf('ChunkLoadError') !== -1 || msg.indexOf('Failed to fetch dynamically imported module') !== -1 || msg.indexOf('error loading dynamically imported module') !== -1) {
                  var count = parseInt(sessionStorage.getItem('chunk_reload_count') || '0', 10);
                  if (count < 2) {
                    sessionStorage.setItem('chunk_reload_count', String(count + 1));
                    window.location.reload();
                  }
                }
              });
              window.addEventListener('unhandledrejection', function(e) {
                var reason = (e && e.reason) ? (e.reason.message || String(e.reason)) : '';
                if (reason.indexOf('Loading chunk') !== -1 || reason.indexOf('ChunkLoadError') !== -1 || reason.indexOf('Failed to fetch dynamically imported module') !== -1 || reason.indexOf('error loading dynamically imported module') !== -1) {
                  var count = parseInt(sessionStorage.getItem('chunk_reload_count') || '0', 10);
                  if (count < 2) {
                    sessionStorage.setItem('chunk_reload_count', String(count + 1));
                    window.location.reload();
                  }
                }
              });
              // Clear reload counter on successful page load (after 5s stability)
              window.addEventListener('load', function() {
                setTimeout(function() {
                  try {
                    sessionStorage.removeItem('chunk_reload_count');
                    sessionStorage.removeItem('chunk_reload_attempted');
                    sessionStorage.removeItem('patrol_chunk_retry_count');
                    sessionStorage.removeItem('security_chunk_retry_count');
                    sessionStorage.removeItem('patrol_render_retry_count');
                    sessionStorage.removeItem('security_render_retry_count');
                  } catch(e) {}
                }, 5000);
              });

              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) {
                      console.log('PWA Service Worker registered:', reg.scope);
                    })
                    .catch(function(err) {
                      console.warn('PWA Service Worker registration error:', err);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body>
        {children}
        <PwaInstallBanner />
      </body>
    </html>
  );
}
