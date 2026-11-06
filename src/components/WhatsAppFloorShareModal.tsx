'use client';

import { useState, useEffect } from 'react';
import {
  generateFloorReportText,
  createFloorCollageImage,
  shareReportToWhatsApp,
  FloorShareData,
} from '@/lib/whatsapp-share';
import { getOfflineChecks } from '@/lib/db';
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

    // 2. Collect photos from IndexedDB, session cache, and passed checks
    async function preparePhotosAndCollage() {
      setIsGeneratingCollage(true);

      // A. Fetch offline checks from IndexedDB to ensure 100% offline coverage
      let idbChecks: any[] = [];
      try {
        idbChecks = await getOfflineChecks();
      } catch (e) {
        console.warn('IndexedDB checks read notice:', e);
      }

      // B. Read from cached-active-session in localStorage if present
      const cachedSessionChecks: any[] = [];
      try {
        const rawSess = localStorage.getItem('cached-active-session');
        if (rawSess) {
          const parsed = JSON.parse(rawSess);
          if (Array.isArray(parsed.sessionFloors)) {
            parsed.sessionFloors.forEach((sf: any) => {
              if (Array.isArray(sf.patrolChecks)) {
                cachedSessionChecks.push(...sf.patrolChecks);
              }
            });
          }
        }
      } catch {}

      // C. Normalize floor & room identifiers
      const floorCodeNorm = String(floor.code || '').replace(/^floor-/, '').replace(/^sf-/, '').toUpperCase().trim();
      const floorIdNorm = String(floor.id || '').toLowerCase().trim();
      const roomIds = new Set(rooms.map((r: any) => String(r.id || '').toLowerCase()));
      const roomCodes = new Set(rooms.map((r: any) => String(r.code || '').toUpperCase()));

      // D. Combine all candidate checks
      const allCandidates = [...checks, ...idbChecks, ...cachedSessionChecks];
      const matchedChecks: any[] = [];
      const seenCheckKeys = new Set<string>();

      allCandidates.forEach((c: any) => {
        if (!c) return;
        const cFloorCode = String(c.floorCode || c.floorCodeSnapshot || '').replace(/^floor-/, '').replace(/^sf-/, '').toUpperCase().trim();
        const cFloorId = String(c.floorId || '').toLowerCase().trim();
        const cRoomId = String(c.roomId || '').toLowerCase().trim();
        const cRoomCode = String(c.roomCode || c.roomCodeSnapshot || '').toUpperCase().trim();

        const isMatch =
          (floorCodeNorm && cFloorCode === floorCodeNorm) ||
          (floorIdNorm && cFloorId === floorIdNorm) ||
          roomIds.has(cRoomId) ||
          roomCodes.has(cRoomCode) ||
          (c.sessionFloorId && floorCodeNorm && c.sessionFloorId.toUpperCase().includes(floorCodeNorm));

        if (isMatch) {
          const key = cRoomCode || cRoomId || c.id;
          const existingIdx = matchedChecks.findIndex(m => (m.roomCode || m.roomCodeSnapshot) === cRoomCode || m.roomId === cRoomId);
          if (existingIdx === -1) {
            seenCheckKeys.add(key);
            matchedChecks.push(c);
          } else {
            // Upgrade existing record if this candidate has photoBase64
            if (c.photoBase64 && !matchedChecks[existingIdx].photoBase64) {
              matchedChecks[existingIdx] = { ...matchedChecks[existingIdx], ...c };
            }
          }
        }
      });

      // E. Update report text with the combined matched checks for complete accuracy
      const finalShareData: FloorShareData = {
        floorId: floor.id,
        floorCode: floor.code || '',
        floorName: floor.name,
        rooms,
        checks: matchedChecks.length > 0 ? matchedChecks : checks,
        findings,
        officerName,
      };
      setReportText(generateFloorReportText(finalShareData));

      // F. Collect photos and labels for the collage
      const photoItems: { src: string; label: string }[] = [];
      const filesList: File[] = [];

      for (let i = 0; i < matchedChecks.length; i++) {
        const c = matchedChecks[i];
        let pSrc = c.photoBase64 || c.photoUrl;

        // Check if server photos array exists
        if (!pSrc && Array.isArray(c.photos) && c.photos.length > 0) {
          pSrc = c.photos[0].filePath;
        }
        if (!pSrc && Array.isArray(c.patrolPhotos) && c.patrolPhotos.length > 0) {
          pSrc = c.patrolPhotos[0].filePath;
        }

        if (pSrc && typeof pSrc === 'string' && pSrc.length > 20) {
          const matchedRoom = rooms.find((r: any) =>
            String(r.id).toLowerCase() === String(c.roomId || '').toLowerCase() ||
            String(r.code).toUpperCase() === String(c.roomCode || c.roomCodeSnapshot || '').toUpperCase()
          );
          const rCode = c.roomCode || c.roomCodeSnapshot || matchedRoom?.code || `R${i + 1}`;
          const rName = matchedRoom?.name || c.roomNameSnapshot || rCode;
          const label = `${rCode} | ${rName}`;

          photoItems.push({ src: pSrc, label });

          // Convert to File for individual photo sharing option
          try {
            if (pSrc.startsWith('data:image/')) {
              const res = await fetch(pSrc);
              const blob = await res.blob();
              filesList.push(new File([blob], `${rCode}-${Date.now()}.jpg`, { type: 'image/jpeg' }));
            }
          } catch {}
        }
      }

      setPhotoCount(photoItems.length);
      setOriginalPhotoFiles(filesList);

      // G. Generate HTML5 Canvas stitched collage
      if (photoItems.length > 0) {
        try {
          const collage = await createFloorCollageImage(photoItems, floor.name);
          if (collage) {
            setCollagePreviewUrl(collage.dataUrl);
            setCollageFile(collage.file);
          }
        } catch (err) {
          console.warn('Could not generate collage:', err);
        }
      } else {
        setCollagePreviewUrl(null);
        setCollageFile(null);
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
      showToast('✓ WhatsApp dibuka & teks laporan telah disalin ke clipboard! (Tekan Tempel / Paste di WhatsApp)');
    }
  };

  const handleShareOriginalPhotos = async () => {
    const filesToSend = originalPhotoFiles.length > 0 ? originalPhotoFiles : (collageFile ? [collageFile] : []);
    const result = await shareReportToWhatsApp(reportText, filesToSend);
    if (result.success) {
      showToast('✓ WhatsApp dibuka & teks laporan telah disalin ke clipboard! (Tekan Tempel / Paste di WhatsApp)');
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
      showToast('✓ Foto kolase berhasil disimpan ke HP!');
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
                    style={{ background: 'none', border: 'none', color: '#128c7e', cursor: 'pointer', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    ⬇️ Simpan Gambar Kolase
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

          {/* Helpful Tip */}
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '8px 12px',
            marginTop: '10px',
            fontSize: '11.5px',
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span>💡</span>
            <span><strong>Tips:</strong> Teks laporan otomatis tersalin. Saat WhatsApp terbuka, Anda tinggal tekan <strong>Tempel / Paste</strong> di obrolan!</span>
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
            {collagePreviewUrl ? (
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={handleDownloadCollage}
                id="btn-save-collage-gallery"
                title="Simpan gambar kolase ke memori / galeri HP"
                style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', fontWeight: 700 }}
              >
                <span>💾</span>
                <span>Simpan ke Galeri</span>
              </button>
            ) : photoCount > 1 ? (
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
            ) : null}

            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handleShareTextOnly}
              id="btn-share-wa-text-only"
              style={{ gridColumn: (!collagePreviewUrl && photoCount <= 1) ? '1 / -1' : 'auto' }}
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
