'use client';

import { useState, useEffect } from 'react';
import styles from './PwaInstallBanner.module.css';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Registrasi Service Worker jika didukung browser
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker registered:', reg.scope))
        .catch((err) => console.error('Service Worker registration failed:', err));
    }

    // 2. Cek apakah sudah terinstal (Standalone Mode)
    const isInStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    
    setIsStandalone(isInStandaloneMode);

    if (isInStandaloneMode) return;

    // 3. Deteksi iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(ios);

    // 4. Untuk Android/Chrome: Tangkap event install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. Untuk iOS: Tampilkan banner petunjuk share sheet (jika belum terpasang)
    if (ios && !isInStandaloneMode) {
      // Munculkan setelah 3 detik agar tidak terlalu mengganggu
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Tampilkan prompt bawaan browser
    deferredPrompt.prompt();
    
    // Tunggu respon pengguna
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User install response: ${outcome}`);
    
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (isStandalone || !showBanner) return null;

  return (
    <div className={styles.bannerContainer}>
      <div className={styles.bannerContent}>
        <div className={styles.appIcon}>
          <img src="/icons/icon-192.png" alt="Logo JEC" className={styles.iconImage} />
        </div>
        <div className={styles.bannerText}>
          <h4 className={styles.bannerTitle}>Pasang Aplikasi Patroli</h4>
          <p className={styles.bannerDesc}>
            {isIos 
              ? 'Ketuk tombol "Bagikan" (Share) lalu pilih "Tambahkan ke Layar Utama" (Add to Home Screen).' 
              : 'Instal aplikasi untuk akses cepat langsung dari beranda HP Anda.'}
          </p>
        </div>
      </div>
      <div className={styles.actions}>
        {isIos ? (
          <button className={styles.dismissBtn} onClick={handleDismiss}>Mengerti</button>
        ) : (
          <>
            <button className={styles.dismissBtn} onClick={handleDismiss}>Nanti</button>
            <button className={styles.installBtn} onClick={handleInstallClick}>Pasang</button>
          </>
        )}
      </div>
    </div>
  );
}
