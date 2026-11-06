'use client';

export interface FloorShareData {
  floorId: string;
  floorCode: string;
  floorName: string;
  rooms: any[];
  checks: any[];
  findings?: any[];
  officerName?: string;
}

/**
 * Normalizes room / facility names to match typical security WhatsApp reporting format:
 * e.g. "R. VVIP", "R. PANEL", "HYDRANT", "APAR ( Aman )", "TANGGA DARURAT", "AC", "LAMPU"
 */
function formatItemBullet(name: string, remark?: string): string {
  let clean = name.trim().toUpperCase();

  // If already starts with R. or RUANG, format to -R.
  if (clean.startsWith('RUANG ')) {
    clean = 'R. ' + clean.substring(6).trim();
  } else if (!clean.startsWith('R.') && !clean.startsWith('R ') && !clean.includes('HYDRANT') && !clean.includes('APAR') && !clean.includes('TANGGA') && !clean.includes('PANTRY') && !clean.includes('JANITOR') && !clean.includes('TOILET') && !clean.includes('NURSE') && !clean.includes('KANTIN')) {
    clean = 'R. ' + clean;
  }

  if (remark && remark.trim()) {
    clean += ` (${remark.trim()})`;
  }

  return `-${clean}`;
}

/**
 * Generates structured WhatsApp text report matching the hospital security standard format.
 */
export function generateFloorReportText(data: FloorShareData): string {
  const { floorName, rooms, checks, findings = [] } = data;

  const floorLabel = floorName.toLowerCase().startsWith('lantai') 
    ? floorName.toLowerCase() 
    : `lantai ${floorName}`;

  // 1. Build distinct list of inspected items
  const bullets: string[] = [];
  const addedNames = new Set<string>();

  // Process rooms checked
  rooms.forEach((r: any) => {
    const rName = r.name || r.roomNameSnapshot || r.code || '';
    if (!rName) return;

    // Look for check remark (e.g. "1 pasien" or specific note)
    const chk = checks.find((c: any) => 
      c.roomId === r.id || 
      c.roomCode === r.code || 
      c.roomCodeSnapshot === r.code || 
      (c.roomNameSnapshot && c.roomNameSnapshot.toUpperCase() === rName.toUpperCase())
    );

    const remark = chk?.remarks || '';
    const norm = rName.toUpperCase();

    if (!addedNames.has(norm)) {
      addedNames.add(norm);
      bullets.push(formatItemBullet(rName, remark));
    }
  });

  // Ensure standard safety & utility checkpoints are listed if not already present
  const standardPoints = [
    { key: 'PANEL', label: '-R. PANEL' },
    { key: 'HYDRANT', label: '-HYDRANT' },
    { key: 'APAR', label: '-APAR ( Aman )' },
    { key: 'AC', label: '-AC' },
    { key: 'LAMPU', label: '-LAMPU' },
    { key: 'TANGGA DARURAT', label: '-TANGGA DARURAT' },
  ];

  standardPoints.forEach((sp) => {
    const exists = Array.from(addedNames).some(n => n.includes(sp.key));
    if (!exists) {
      bullets.push(sp.label);
    }
  });

  // 2. Determine Situation (Aman or Findings)
  let situasiText = 'situasi dalam keadaan aman';
  const patientRoom = checks.find((c: any) => c.remarks && /pasien/i.test(c.remarks));
  if (patientRoom) {
    const matchedRoom = rooms.find((r: any) => r.id === patientRoom.roomId || r.code === patientRoom.roomCode);
    const roomName = matchedRoom?.name || patientRoom.roomNameSnapshot || patientRoom.roomCode || 'Kelas 1';
    situasiText = `pasien kamar ${roomName} situasi area dalam keadaan aman`;
  } else if (findings.length > 0) {
    const fndDescs = findings.map((f: any) => f.description).filter(Boolean).join(', ');
    situasiText = `situasi terkendali (Temuan: ${fndDescs || 'Perlu pemantauan'})`;
  }

  // 3. Determine AC & Lamp status summary
  let acOnCount = 0;
  let acOffCount = 0;
  let lightOnCount = 0;
  let lightOffCount = 0;

  checks.forEach((c: any) => {
    if (c.acStatus === 'on') acOnCount++;
    if (c.acStatus === 'off') acOffCount++;
    if (c.lightStatus === 'on') lightOnCount++;
    if (c.lightStatus === 'off') lightOffCount++;
  });

  let ketText = 'LAMPU DAN AC ON.';
  if (acOnCount > 0 && acOffCount > 0 && lightOnCount > 0) {
    ketText = 'Sebagian Lampu ON dan Ac off 🙏';
  } else if (acOffCount > 0 && acOnCount === 0 && lightOffCount > 0 && lightOnCount === 0) {
    ketText = 'LAMPU DAN AC OFF.';
  } else if (acOffCount > 0 && acOnCount === 0 && lightOnCount > 0) {
    ketText = 'LAMPU ON DAN AC OFF.';
  } else if (acOnCount > 0 && lightOffCount > 0 && lightOnCount === 0) {
    ketText = 'LAMPU OFF DAN AC ON.';
  }

  // Compose full message
  const lines = [
    `Ijin melaporkan patroli di area ${floorLabel} mengecek semua area termasuk`,
    ...bullets,
    ` Terpantau ${situasiText}`,
    `KET: ${ketText}`,
  ];

  return lines.join('\n');
}

/**
 * Loads an image from Base64 or URL into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

export interface PhotoCollageItem {
  src: string;
  label?: string;
}

/**
 * Creates an elegant stitched photo grid collage (e.g. 4x3 or 3x3) using HTML5 Canvas
 * completely offline in the browser.
 */
export async function createFloorCollageImage(
  photoSources: (string | PhotoCollageItem)[],
  floorTitle: string = 'RS Mata JEC ORBITA'
): Promise<{ blob: Blob; file: File; dataUrl: string } | null> {
  if (!photoSources || photoSources.length === 0) return null;

  try {
    const normalizedItems = photoSources.map(p => 
      typeof p === 'string' ? { src: p, label: '' } : p
    ).filter(p => Boolean(p.src));

    // Limit to at most 16 photos for clean collage
    const itemsToUse = normalizedItems.slice(0, 16);
    if (itemsToUse.length === 0) return null;

    // Load all images in parallel
    const loadedImages: { img: HTMLImageElement; label?: string }[] = [];
    for (const item of itemsToUse) {
      try {
        const img = await loadImage(item.src);
        loadedImages.push({ img, label: item.label });
      } catch (loadErr) {
        console.warn('Failed to load image for collage:', loadErr);
      }
    }

    if (loadedImages.length === 0) return null;

    const cellWidth = 480;
    const cellHeight = 480;
    const gap = 8; // gap between photos
    const headerH = 64; // header banner height
    const rects: { x: number; y: number; w: number; h: number }[] = [];
    let canvasWidth = 0;
    let gridHeight = 0;

    // Smart layout algorithms matching WhatsApp multi-image album structures:
    if (loadedImages.length === 1) {
      canvasWidth = cellWidth + 2 * gap;
      rects.push({ x: gap, y: headerH + gap, w: cellWidth, h: cellHeight });
      gridHeight = cellHeight + 2 * gap;
    } else if (loadedImages.length === 2) {
      canvasWidth = 2 * cellWidth + 3 * gap;
      rects.push({ x: gap, y: headerH + gap, w: cellWidth, h: cellHeight });
      rects.push({ x: gap + cellWidth + gap, y: headerH + gap, w: cellWidth, h: cellHeight });
      gridHeight = cellHeight + 2 * gap;
    } else if (loadedImages.length === 5) {
      // 2 on top, 3 at bottom
      canvasWidth = 3 * cellWidth + 4 * gap;
      const topW = (canvasWidth - 3 * gap) / 2;
      const botW = (canvasWidth - 4 * gap) / 3;

      rects.push({ x: gap, y: headerH + gap, w: topW, h: cellHeight });
      rects.push({ x: gap + topW + gap, y: headerH + gap, w: topW, h: cellHeight });

      const yBot = headerH + gap + cellHeight + gap;
      for (let c = 0; c < 3; c++) {
        rects.push({ x: gap + c * (botW + gap), y: yBot, w: botW, h: cellHeight });
      }
      gridHeight = 2 * cellHeight + 3 * gap;
    } else if (loadedImages.length === 10) {
      // 2 on top (each spans 2 columns), 4 in middle, 4 at bottom
      canvasWidth = 4 * cellWidth + 5 * gap;
      const topW = (canvasWidth - 3 * gap) / 2;
      const topH = Math.round(cellHeight * 1.15);

      rects.push({ x: gap, y: headerH + gap, w: topW, h: topH });
      rects.push({ x: gap + topW + gap, y: headerH + gap, w: topW, h: topH });

      const yMid = headerH + gap + topH + gap;
      for (let c = 0; c < 4; c++) {
        rects.push({ x: gap + c * (cellWidth + gap), y: yMid, w: cellWidth, h: cellHeight });
      }

      const yBot = yMid + cellHeight + gap;
      for (let c = 0; c < 4; c++) {
        rects.push({ x: gap + c * (cellWidth + gap), y: yBot, w: cellWidth, h: cellHeight });
      }
      gridHeight = topH + 2 * cellHeight + 4 * gap;
    } else {
      // Standard regular grid
      let cols = 3;
      if (loadedImages.length <= 4) cols = 2;
      else if (loadedImages.length >= 8) cols = 4;
      else cols = 3;

      const rows = Math.ceil(loadedImages.length / cols);
      canvasWidth = cols * cellWidth + (cols + 1) * gap;
      gridHeight = rows * cellHeight + (rows + 1) * gap;

      for (let i = 0; i < loadedImages.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = gap + col * (cellWidth + gap);
        const y = headerH + gap + row * (cellHeight + gap);
        rects.push({ x, y, w: cellWidth, h: cellHeight });
      }
    }

    const canvasHeight = headerH + gridHeight;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 1. Background white frame
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Header banner (Dark Navy)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvasWidth, headerH);

    // Header text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🏥 RS MATA JEC ORBITA • ${floorTitle.toUpperCase()}`, gap + 8, headerH / 2);

    const nowStr = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Makassar',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());

    ctx.font = '500 16px sans-serif';
    ctx.fillStyle = '#94a3b8';
    const timeWidth = ctx.measureText(nowStr).width;
    ctx.fillText(nowStr, canvasWidth - timeWidth - gap - 8, headerH / 2);

    // 3. Draw each photo into its cell (aspect-fill / cover crop)
    loadedImages.forEach((item, idx) => {
      const rect = rects[idx];
      if (!rect) return;

      const { img, label } = item;
      const { x, y, w: targetW, h: targetH } = rect;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, targetW, targetH);
      ctx.clip();

      // Cover crop calculation
      const imgRatio = img.width / img.height;
      const cellRatio = targetW / targetH;
      let drawW = targetW;
      let drawH = targetH;
      let drawX = x;
      let drawY = y;

      if (imgRatio > cellRatio) {
        drawW = targetH * imgRatio;
        drawX = x - (drawW - targetW) / 2;
      } else {
        drawH = targetW / imgRatio;
        drawY = y - (drawH - targetH) / 2;
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      // 4. Draw room label tag at bottom-left corner of tile
      if (label && label.trim()) {
        ctx.save();
        ctx.font = 'bold 18px sans-serif';
        const paddingX = 12;
        const tagH = 32;
        const textW = ctx.measureText(label).width;
        const tagW = Math.min(targetW - 24, textW + paddingX * 2);
        const tagX = x + 10;
        const tagY = y + targetH - tagH - 10;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(tagX, tagY, tagW, tagH, 6);
        } else {
          ctx.rect(tagX, tagY, tagW, tagH);
        }
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, tagX + paddingX, tagY + tagH / 2, tagW - paddingX * 2);
        ctx.restore();
      }
    });

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Canvas toBlob failed'));
        },
        'image/jpeg',
        0.88
      );
    });

    const fileName = `laporan-${floorTitle.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`;
    const file = new File([blob], fileName, { type: 'image/jpeg' });

    return { blob, file, dataUrl };
  } catch (err) {
    console.error('Collage creation error:', err);
    return null;
  }
}

/**
 * Shares report text & photos to WhatsApp natively or opens WhatsApp Web/Scheme link.
 */
export async function shareReportToWhatsApp(
  text: string,
  files?: File[]
): Promise<{ success: boolean; method: 'web-share' | 'clipboard' | 'direct-link' }> {
  // Always auto-copy text to clipboard so officer can paste instantly if WhatsApp omits caption
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }

  // 1. Try Native Web Share API (Android Chrome & iOS Safari support files + text)
  if (
    typeof navigator !== 'undefined' &&
    navigator.share &&
    files &&
    files.length > 0
  ) {
    try {
      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          title: 'Laporan Patroli',
          text,
          files,
        });
        return { success: true, method: 'web-share' };
      }
    } catch (shareErr: any) {
      // User cancelled share sheet or error
      if (shareErr.name === 'AbortError') {
        return { success: false, method: 'web-share' };
      }
      console.warn('Native file share failed, falling back to link:', shareErr);
    }
  }

  // 2. Fallback: Direct WhatsApp Link
  const encoded = encodeURIComponent(text);
  const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank');
  }

  return { success: true, method: 'direct-link' };
}
