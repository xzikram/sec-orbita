'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export default function QRCodeDisplay({ value, size = 150, className }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      },
      (error) => {
        if (error) {
          console.error('Error generating QR Code:', error);
        }
      }
    );
  }, [value, size]);

  return (
    <canvas 
      ref={canvasRef} 
      className={className} 
      style={{ 
        width: size, 
        height: size,
        borderRadius: '8px',
        border: '1px solid var(--color-neutral-200)',
      }} 
    />
  );
}
