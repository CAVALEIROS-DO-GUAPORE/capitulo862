import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

/**
 * Rota que serve a logo do capítulo como favicon (/icon).
 * Garante que a aba e compartilhamentos usem a logo mesmo quando
 * o navegador prioriza outras fontes.
 */
export async function GET() {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logocapitulo.png');
    const buffer = await fs.promises.readFile(logoPath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
