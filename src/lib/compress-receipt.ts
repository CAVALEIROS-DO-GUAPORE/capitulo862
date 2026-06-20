import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

const MAX_IMAGE_WIDTH = 1600;
const JPEG_QUALITY = 75;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export interface CompressedReceipt {
  buffer: Buffer;
  contentType: string;
  ext: string;
}

async function compressImage(buffer: Buffer): Promise<CompressedReceipt> {
  let pipeline = sharp(buffer).rotate();
  const meta = await pipeline.metadata();
  if (meta.width && meta.width > MAX_IMAGE_WIDTH) {
    pipeline = pipeline.resize(MAX_IMAGE_WIDTH, undefined, { withoutEnlargement: true });
  }
  const out = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
  return { buffer: out, contentType: 'image/jpeg', ext: 'jpg' };
}

async function compressPdf(buffer: Buffer): Promise<CompressedReceipt> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const out = await doc.save({ useObjectStreams: true });
  return { buffer: Buffer.from(out), contentType: 'application/pdf', ext: 'pdf' };
}

export async function compressReceiptFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<CompressedReceipt> {
  if (buffer.length > MAX_INPUT_BYTES) {
    throw new Error('Arquivo muito grande (máx. 15 MB)');
  }

  const lowerMime = mimeType.toLowerCase();
  const lowerName = fileName.toLowerCase();

  if (lowerMime.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(lowerName)) {
    try {
      return await compressImage(buffer);
    } catch {
      throw new Error('Imagem inválida ou corrompida');
    }
  }

  if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    try {
      return await compressPdf(buffer);
    } catch {
      throw new Error('PDF inválido ou corrompido');
    }
  }

  throw new Error('Formato não suportado. Use PDF ou imagem (JPEG, PNG, WebP).');
}

export function sanitizeFileName(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[^\w\s\-áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]/gi, '').trim() || 'comprovante';
  return `${base.slice(0, 80)}.${ext}`;
}
