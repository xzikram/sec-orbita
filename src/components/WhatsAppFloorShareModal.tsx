'use client';

import { useState, useEffect } from 'react';
import {
  generateFloorReportText,
  createFloorCollageImage,
  shareReportToWhatsApp,
  FloorShareData,
} from '@/lib/whatsapp-share';
import styles from './whatsapp-share-modal.module.css';

interface WhatsAppFloorShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  floor: { id: string; name: string; code?: string };
  rooms: any[];
  checks: any[];
  findings?: any[];
  officerName?: string;
}

export default function WhatsAppFloorShareModal({
  isOpen,
  onClose,
  floor,
  rooms,
  checks,
  findings = [],
  officerName,
}: WhatsAppFloorShareModalProps) {
  const [reportText, setReportText] = useState('');
  const [collagePreviewUrl, setCollagePreviewUrl] = useState<string | null>(null);
  const [collageFile, setCollageFile] = useState<File | null>(null);
  const [originalPhotoFiles, setOriginalPhotoFiles] = useState<File[]>([]);
  const [photoCount, setPhotoCount] = useState(0);
  const [isGeneratingCollage, setIsGeneratingCollage] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    if (!isOpen) return;

    // 1. Initial report text auto-generation
    const shareData: FloorShareData = {
      floorId: floor.id,
      floorCode: floor.code || '',
      floorName: floor.name,
      rooms,
      checks,
      findings,
      officerName,
    };
    const generated = generateFloorReportText(shareData);
    setReportText(generated);

    // 2. Collect photos from checks (IndexedDB photoBase64 or server URL)
    async function preparePhotosAndCollage() {
      setIsGeneratingCollage(true);
      const photoUrls: string[] = [];
      const filesList: File[] = [];

      // Look in checks for this floor
      for (let i = 0; i < checks.length; i++) {
        const c = checks[i];
        let pSrc = c.photoBase64 || c.photoUrl;

        // Check if patrolPhotos array exists (from server check)
        if (!pSrc && Array.isArray(c.patrolPhotos) && c.patrolPhotos.length > 0) {
          pSrc = c.patrolPhotos[0].filePath;
        }

        if (pSrc && typeof pSrc === 'string' && pSrc.length > 20) {
          photoUrls.push(pSrc);

          // Convert to File for individual photo sharing option
          try {
            if (pSrc.startsWith('data:image/')) {
              const res = await fetch(pSrc);
              const blob = await res.blob();
              filesList.push(new File([blob], `foto-${i + 1}.jpg`, { type: 'image/jpeg' }));
            }
          } catch {}
        }
      }

      setPhotoCount(photoUrls.length);
      setOriginalPhotoFiles(filesList);

      // Generate HTML5 Canvas stitched collage
      if (photoUrls.length > 0) {
        try {
          const collage = await createFloorCollageImage(photoUrls, floor.name);
          if (collage) {
            setCollagePreviewUrl(collage.dataUrl);
            setCollageFile(collage.file);
          }
        } catch (err) {
          console.warn('Could not generate collage:', err);
        }
      }

      setIsGeneratingCollage(false);
    }

    preparePhotosAndCollage();
  }, [isOpen, floor, rooms, checks, findings, officerName]);

  if (!isOpen) return null;

  const handleApplyKetChip = (newKet: string) => {
    setReportText((prev) => {
      const ketRegex = /KET:.*$/im;
      if (ketRegex.test(prev)) {
        return prev.replace(ketRegex, `KET: ${newKet}`);
      }
      return `${prev}\nKET: ${newKet}`;
    });
  };

  const handleApplySituationChip = (newSit: string) => {
    setReportText((prev) => {
      const sitRegex = /Terpantau.*$/im;
      if (sitRegex.test(prev)) {
        return prev.replace(sitRegex, `Terpantau ${newSit}`);
      }
      return prev;
    });
  };

  const handleShareCollage = async () => {
    const filesToSend = collageFile ? [collageFile] : [];
    const result = await shareReportToWhatsApp(reportText, filesToSend);
    if (result.success) {
      showToast('✓ WhatsApp dibuka & teks laporan telah disalin ke clipboard!');
    }
  };

  const handleShareOriginalPhotos = async () => {
    const filesToSend = originalPhotoFiles.length > 0 ? originalPhotoFiles : (collageFile ? [collageFile] : []);
    const result = await shareReportToWhatsApp(reportText, filesToSend);
    if (result.success) {
      showToast('✓ WhatsApp dibuka & teks laporan telah disalin ke clipboard!');
    }
  };

  const handleShareTextOnly = async () => {
    await shareReportToWhatsApp(reportText, []);
    showToast('✓ Membuka WhatsApp dengan teks laporan!');
  };

  const handleCopyText = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(reportText);
        showToast('✓ Teks laporan berhasil disalin ke clipboard!');
      } catch {
        showToast('Gagal menyalin teks');
      }
    }
  };

  const handleDownloadCollage = () => {
    if (!collagePreviewUrl) return;
    try {
      const a = document.createElement('a');
      a.href = collagePreviewUrl;
      a.download = collageFile?.name || `kolase-${floor.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('✓ Foto grid kolase berhasil diunduh!');
    } catch {
      showToast('Gagal mengunduh gambar');
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <div className={styles.headerIcon}>📲</div>
            <div>
              <h3>Bagikan Laporan ke WhatsApp</h3>
              <p>Area {floor.name} • Siap Kirim</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Tutup">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.body}>
          {/* Collage Photo Grid Preview */}
          <div className={styles.collageSection}>
            <div className={styles.sectionLabel}>
              <span>📸 Pratinjau Foto Grid ({photoCount} Foto)</span>
              {collageFile && <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Kolase Siap</span>}
            </div>

            {isGeneratingCollage ? (
              <div className={styles.collageLoading}>
                <div className="spinner-border text-primary" style={{ width: '24px', height: '24px' }} />
                <span>Merangkai {photoCount || 'semua'} foto menjadi kolase grid...</span>
              </div>
            ) : collagePreviewUrl ? (
              <div>
                <img
                  src={collagePreviewUrl}
                  alt="Pratinjau Kolase Patroli"
                  className={styles.collagePreview}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Format: 1 foto kolase grid terpadu</span>
                  <button
                    type="button"
                    onClick={handleDownloadCollage}
                    style={{ background: 'none', border: 'none', color: '#128c7e', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    ⬇️ Unduh Gambar Kolase
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ margin: '8px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Belum ada foto yang diambil di lantai ini. Anda tetap dapat mengirimkan laporan teks.
              </p>
            )}
          </div>

          {/* Quick Change Chips */}
          <div>
            <div className={styles.sectionLabel}>
              <span>⚡ Ubah Keterangan Cepat (1-Klik)</span>
            </div>
            <div className={styles.chipsContainer}>
              <button
                type="button"
                className={styles.chip}
                onClick={() => handleApplyKetChip('LAMPU DAN AC ON.')}
              >
                💡 Lampu & AC ON
              </button>
              <button
                type="button"
                className={styles.chip}
                onClick={() => handleApplyKetChip('LAMPU DAN AC OFF.')}
              >
                🌙 Lampu & AC OFF
              </button>
              <button
                type="button"
                className={styles.chip}
                onClick={() => handleApplyKetChip('Sebagian Lampu ON dan Ac off 🙏')}
              >
                ⚡ Sebagian Lampu ON, AC OFF
              </button>
              <button
                type="button"
                className={styles.chip}
                onClick={() => handleApplySituationChip('situasi dalam keadaan aman')}
              >
                🛡️ Situasi Aman
              </button>
            </div>
          </div>

          {/* Editable Textarea */}
          <div className={styles.textareaWrapper}>
            <div className={styles.sectionLabel}>
              <span>📝 Teks Laporan (Bisa Diedit / Tambah Catatan)</span>
              <button
                type="button"
                onClick={handleCopyText}
                style={{ background: 'none', border: 'none', color: '#128c7e', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600 }}
              >
                📋 Salin Teks
              </button>
            </div>
            <textarea
              className={styles.reportTextarea}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Menyusun laporan..."
              rows={8}
            />
          </div>

          {toastMsg && <div className={styles.toastSuccess}>{toastMsg}</div>}
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className={styles.footer}>
          {/* Primary Button: Stitched Grid Collage + Text (Recommended) */}
          <button
            type="button"
            className={styles.btnPrimaryWa}
            onClick={handleShareCollage}
            id="btn-share-wa-collage"
          >
            <span>💬</span>
            <span>Buka WhatsApp (Foto Kolase Grid + Teks)</span>
          </button>

          {/* Secondary Options */}
          <div className={styles.secondaryRow}>
            {photoCount > 1 && (
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={handleShareOriginalPhotos}
                id="btn-share-wa-multi-photos"
                title="Kirim semua file foto asli terpisah ke WhatsApp"
              >
                <span>📸</span>
                <span>Kirim Foto Asli</span>
              </button>
            )}
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handleShareTextOnly}
              id="btn-share-wa-text-only"
              style={{ gridColumn: photoCount > 1 ? 'auto' : '1 / -1' }}
            >
              <span>💬</span>
              <span>Kirim Teks Saja</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
