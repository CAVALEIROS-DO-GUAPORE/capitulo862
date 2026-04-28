export async function convertDocxBufferToPdf(docx: Buffer): Promise<Buffer> {
  const secret = process.env.CONVERTAPI_SECRET;
  if (secret) {
    // ConvertAPI (externo) funciona em Vercel (não depende de LibreOffice).
    // Docs: https://www.convertapi.com/doc
    const form = new FormData();
    form.append(
      'File',
      new Blob([new Uint8Array(docx)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      'document.docx'
    );

    const res = await fetch(`https://v2.convertapi.com/convert/docx/to/pdf?Secret=${encodeURIComponent(secret)}`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Falha ao converter para PDF (ConvertAPI): HTTP ${res.status} ${text}`);
    }

    const json = await res.json() as { Files?: { Url?: string }[] };
    const url = json?.Files?.[0]?.Url;
    if (!url) throw new Error('Falha ao converter para PDF (ConvertAPI): resposta sem URL do arquivo');

    const pdfRes = await fetch(url);
    if (!pdfRes.ok) throw new Error(`Falha ao baixar PDF convertido: HTTP ${pdfRes.status}`);
    const arr = await pdfRes.arrayBuffer();
    return Buffer.from(arr);
  }

  // Fallback local: requer LibreOffice instalado.
  const { default: libre } = await import('libreoffice-convert');
  const { promisify } = await import('node:util');
  const convertAsync = promisify<Buffer, string, undefined, Buffer>(libre.convert);
  return await convertAsync(docx, '.pdf', undefined);
}

