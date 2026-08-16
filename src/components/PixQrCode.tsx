'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildPixBrCode } from '@/lib/raffles-utils';

interface PixQrCodeProps {
  pixKey: string;
  amount?: number;
  description?: string;
  size?: number;
  className?: string;
}

export function PixQrCode({
  pixKey,
  amount,
  description,
  size = 180,
  className = '',
}: PixQrCodeProps) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');

  const payload = buildPixBrCode({
    pixKey,
    amount,
    description,
    merchantName: 'Capitulo DeMolay 862',
    merchantCity: 'PONTES E LACERDA',
  });

  useEffect(() => {
    let cancelled = false;
    setError('');
    setSrc('');

    if (!payload) {
      setError('Chave PIX inválida');
      return;
    }

    QRCode.toDataURL(payload, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível gerar o QR Code');
      });

    return () => {
      cancelled = true;
    };
  }, [payload, size]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs p-3 ${className}`}
        style={{ width: size, height: size }}
      >
        {error}
      </div>
    );
  }

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-xs ${className}`}
        style={{ width: size, height: size }}
      >
        Gerando QR...
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="QR Code PIX"
      width={size}
      height={size}
      className={`rounded-lg border border-slate-200 bg-white ${className}`}
    />
  );
}

export function usePixPayload(pixKey: string, amount?: number, description?: string): string {
  return buildPixBrCode({
    pixKey,
    amount,
    description,
    merchantName: 'Capitulo DeMolay 862',
    merchantCity: 'PONTES E LACERDA',
  });
}
