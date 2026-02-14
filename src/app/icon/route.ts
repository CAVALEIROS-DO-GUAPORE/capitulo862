import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

/**
 * Rota que serve a logo do capítulo como favicon (/icon).
 * Usa logocapitulo.ico de public.
 */
export async function GET() {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logocapitulo.ico');
    const buffer = await fs.promises.readFile(logoPath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/x-icon',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
