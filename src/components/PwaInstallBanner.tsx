'use client';

import { useState, useEffect } from 'react';
import styles from './PwaInstallBanner.module.css';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isSafari, setIsSafari] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasBottomNav, setHasBottomNav] = useState(false);

  useEffect(() => {
    // 1. Check if running in Standalone (already installed PWA)
    const isInStandaloneMode = 
      typeof window !== 'undefined' && (
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://')
      );
    
    setIsStandalone(isInStandaloneMode);
    if (isInStandaloneMode) return;

    // 2. Detect iOS & Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const safariBrowser = iosDevice && /safari/.test(userAgent) && !/crios|fxios|opios/.test(userAgent);
    
    setIsIos(iosDevice);
    setIsSafari(safariBrowser);

    // 3. Check dismissal history (suppress banner if dismissed within 24h)
    const dismissedAt = localStorage.getItem('pwa_prompt_dismissed_at');
    const isRecentlyDismissed = dismissedAt && (Date.now() - parseInt(dismissedAt, 10) < 24 * 60 * 60 * 1000);

    // 4. Capture beforeinstallprompt for Android/Chromium
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isRecentlyDismissed) {
        setShowBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setShowBanner(false);
      try {
        localStorage.setItem('pwa_installed', 'true');
      } catch {}
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. If iOS and not standalone, show banner after 2.5 seconds (unless recently dismissed)
    if (iosDevice && !isRecentlyDismissed) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }

    // 6. Check for bottom nav in DOM
    const navCheckTimer = setTimeout(() => {
      setHasBottomNav(Boolean(document.querySelector('.bottom-nav')));
    }, 500);

    return () => {
      clearTimeout(navCheckTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowGuideModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
        try {
          localStorage.setItem('pwa_installed', 'true');
        } catch {}
      }
      setDeferredPrompt(null);
    } else {
      // Show manual install guidance for Android/Chrome
      setShowGuideModal(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem('pwa_prompt_dismissed_at', Date.now().toString());
    } catch {}
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Floating Install Prompt Banner */}
      {showBanner && (
        <div className={`${styles.bannerContainer} ${hasBottomNav ? styles.withBottomNav : ''}`} id="pwa-install-banner">
          <div className={styles.bannerContent}>
            <div className={styles.appIcon}>
              <img src="/icons/icon-192.png" alt="Logo JEC" className={styles.iconImage} />
            </div>
            <div className={styles.bannerText}>
              <h4 className={styles.bannerTitle}>
                <span>📲</span> Pasang Aplikasi Patroli
              </h4>
              <p className={styles.bannerDesc}>
                {isIos
                  ? 'Pasang di Layar Utama iPhone/iPad untuk akses cepat tanpa browser.'
                  : 'Instal aplikasi di HP Android Anda agar dapat dibuka langsung dari layar utama.'}
              </p>
            </div>
          </div>
          <div className={styles.actions}>
            <button className={styles.dismissBtn} onClick={handleDismiss}>
              Nanti
            </button>
            <button className={styles.installBtn} onClick={handleInstallClick} id="btn-pwa-install">
              {isIos ? 'Petunjuk Pasang' : 'Pasang Aplikasi'}
            </button>
          </div>
        </div>
      )}

      {/* Step-by-Step Installation Modal for iOS or manual Android */}
      {showGuideModal && (
        <div className={styles.modalOverlay} onClick={() => setShowGuideModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalAppIcon}>
                <img src="/icons/icon-192.png" alt="SecPatrol" className={styles.iconImage} />
              </div>
              <div>
                <h3 className={styles.modalTitle}>
                  {isIos ? 'Pasang di iPhone / iPad' : 'Pasang di Android'}
                </h3>
                <p className={styles.modalSubtitle}>JEC ORBITA Security Patrol</p>
              </div>
            </div>

            {isIos ? (
              <>
                {!isSafari && (
                  <div className={styles.modalNote}>
                    ℹ️ Untuk memasang di iPhone/iPad, pastikan Anda membuka tautan ini menggunakan browser <strong>Safari</strong> bawaan Apple.
                  </div>
                )}
                <div className={styles.stepList}>
                  <div className={styles.stepItem}>
                    <div className={styles.stepNumber}>1</div>
                    <div className={styles.stepContent}>
                      Ketuk tombol <span className={styles.stepHighlight}>Bagikan / Share</span> 
                      <span className={styles.stepIcon}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <polyline points="16 6 12 2 8 6" />
                          <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                      </span> 
                      di bar bawah Safari.
                    </div>
                  </div>

                  <div className={styles.stepItem}>
                    <div className={styles.stepNumber}>2</div>
                    <div className={styles.stepContent}>
                      Gulir ke bawah, lalu pilih menu <span className={styles.stepHighlight}>Tambah ke Layar Utama</span> 
                      <span className={styles.stepIcon}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="4" />
                          <line x1="12" y1="8" x2="12" y2="16" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                      </span>
                      (Add to Home Screen).
                    </div>
                  </div>

                  <div className={styles.stepItem}>
                    <div className={styles.stepNumber}>3</div>
                    <div className={styles.stepContent}>
                      Ketuk tombol <span className={styles.stepHighlight}>Tambah</span> (Add) di pojok kanan atas layar. Aplikasi akan langsung muncul di beranda HP Anda!
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.stepList}>
                <div className={styles.stepItem}>
                  <div className={styles.stepNumber}>1</div>
                  <div className={styles.stepContent}>
                    Ketuk menu <span className={styles.stepHighlight}>titik tiga (⋮)</span> di pojok kanan atas browser Google Chrome.
                  </div>
                </div>

                <div className={styles.stepItem}>
                  <div className={styles.stepNumber}>2</div>
                  <div className={styles.stepContent}>
                    Pilih opsi <span className={styles.stepHighlight}>Instal aplikasi</span> atau <span className={styles.stepHighlight}>Tambahkan ke Layar Utama</span>.
                  </div>
                </div>

                <div className={styles.stepItem}>
                  <div className={styles.stepNumber}>3</div>
                  <div className={styles.stepContent}>
                    Ketuk <span className={styles.stepHighlight}>Instal</span> untuk menyelesaikan pemasangan.
                  </div>
                </div>
              </div>
            )}

            <button className={styles.modalActionBtn} onClick={() => setShowGuideModal(false)}>
              Saya Mengerti ✓
            </button>
          </div>
        </div>
      )}
    </>
  );
}
