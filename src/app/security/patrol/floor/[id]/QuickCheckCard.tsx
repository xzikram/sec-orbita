'use client';

import React, { useState, useRef } from 'react';
import { Room } from '@/lib/dummy-data';

interface QuickCheckCardProps {
  room: Room;
  onSwipeLeft: (room: Room) => void;  // Finding
  onSwipeRight: (room: Room) => void; // Normal
  onTap: (room: Room) => void;
}

export default function QuickCheckCard({ room, onSwipeLeft, onSwipeRight, onTap }: QuickCheckCardProps) {
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [swiped, setSwiped] = useState<'left' | 'right' | null>(null);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const swipeThreshold = 100;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (swiped) return;
    const touch = e.touches[0];
    setStartX(touch.clientX);
    setStartY(touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (swiped) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - startX;
    const diffY = touch.clientY - startY;

    // Prevent vertical scrolling if swiping horizontally
    if (Math.abs(diffX) > Math.abs(diffY)) {
      e.preventDefault();
    }
    setOffsetX(diffX);
    setOffsetY(diffY);
  };

  const handleTouchEnd = () => {
    if (swiped) return;
    
    // Check if swipe exceeded threshold
    if (offsetX > swipeThreshold) {
      // Swiped Right -> Normal
      setSwiped('right');
      setTimeout(() => onSwipeRight(room), 300);
    } else if (offsetX < -swipeThreshold) {
      // Swiped Left -> Finding
      setSwiped('left');
      setTimeout(() => onSwipeLeft(room), 300);
    } else {
      // Tap threshold (minimal movement)
      if (Math.abs(offsetX) < 10 && Math.abs(offsetY) < 10) {
        onTap(room);
      }
      // Snap back
      setOffsetX(0);
      setOffsetY(0);
    }
  };

  // Determine overlay color and transform styling
  const rotation = offsetX * 0.05; // slight rotate effect
  const cardStyle: React.CSSProperties = swiped
    ? {
        transform: `translateX(${swiped === 'right' ? 500 : -500}px) rotate(${swiped === 'right' ? 30 : -30}deg)`,
        opacity: 0,
        transition: 'all 0.3s ease-out',
      }
    : {
        transform: `translateX(${offsetX}px) translateY(${offsetY * 0.2}px) rotate(${rotation}deg)`,
        transition: offsetX === 0 ? 'transform 0.2s ease-out' : 'none',
      };

  // Overlay opacity based on swipe distance
  const greenOpacity = Math.min(0.6, Math.max(0, offsetX / swipeThreshold));
  const redOpacity = Math.min(0.6, Math.max(0, -offsetX / swipeThreshold));

  return (
    <div
      ref={cardRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        width: '100%',
        height: '280px',
        borderRadius: '16px',
        backgroundColor: 'var(--bg-card)',
        border: '1.5px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)',
        userSelect: 'none',
        touchAction: 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px',
        cursor: 'grab',
        ...cardStyle,
      }}
    >
      {/* Green Overlay for Normal Swipe */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'var(--color-success-500)',
          opacity: greenOpacity,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          pointerEvents: 'none',
          transition: 'opacity 0.1s ease',
          zIndex: 2,
        }}
      >
        ✓ NORMAL
      </div>

      {/* Red Overlay for Finding Swipe */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'var(--color-danger-500)',
          opacity: redOpacity,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          pointerEvents: 'none',
          transition: 'opacity 0.1s ease',
          zIndex: 2,
        }}
      >
        ⚠ TEMUAN
      </div>

      {/* Card Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-primary-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Rencana Pemeriksaan
          </span>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
            Code: {room.code}
          </span>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 6px', color: 'var(--text-primary)' }}>{room.name}</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
          ℹ️ {room.photoGuide || 'Ambil foto area keseluruhan.'}
        </p>
      </div>

      {/* Card checklist indicators */}
      <div style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
        {room.hasAc && (
          <span style={{ fontSize: '11px', background: 'rgba(21, 101, 192, 0.1)', color: 'var(--color-primary-600)', padding: '4px 8px', borderRadius: '8px', fontWeight: '600' }}>
            ❄️ Cek AC
          </span>
        )}
        {room.hasLight && (
          <span style={{ fontSize: '11px', background: 'rgba(255, 193, 7, 0.1)', color: 'var(--color-warning-700)', padding: '4px 8px', borderRadius: '8px', fontWeight: '600' }}>
            💡 Cek Lampu
          </span>
        )}
      </div>

      {/* Card Footer instructions */}
      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
        <span>Swipe Kiri: Temuan ⚠</span>
        <span style={{ color: 'var(--color-primary-500)', fontWeight: 'bold' }}>Ketuk: Detail</span>
        <span>Swipe Kanan: Normal ✓</span>
      </div>
    </div>
  );
}
