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
      <head>
        <link rel="icon" href="/Logo RS JEC ORBITA.png" type="image/png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  var CLEAN_KEY = 'sw_cleaned_v3';
                  if (!localStorage.getItem(CLEAN_KEY)) {
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then(function(regs) {
                        var hasRegs = regs && regs.length > 0;
                        if (hasRegs) {
                          for (var i = 0; i < regs.length; i++) {
                            regs[i].unregister();
                          }
                          localStorage.setItem(CLEAN_KEY, 'true');
                          setTimeout(function() {
                            window.location.reload();
                          }, 200);
                        } else {
                          localStorage.setItem(CLEAN_KEY, 'true');
                        }
                      }).catch(function() {
                        localStorage.setItem(CLEAN_KEY, 'true');
                      });
                    } else {
                      localStorage.setItem(CLEAN_KEY, 'true');
                    }
                    if ('caches' in window) {
                      caches.keys().then(function(keys) {
                        if (keys) {
                          keys.forEach(function(key) {
                            caches.delete(key);
                          });
                        }
                      });
                    }
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
