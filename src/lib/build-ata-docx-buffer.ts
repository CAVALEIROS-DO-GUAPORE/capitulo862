import path from 'path';
import fs from 'fs';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import type { InternalMinutes, Member, RollCall } from '@/types';
import { buildAtaDocxData } from './ata-docx-data';

/** Gera o buffer do Word preenchido (modelo atareuniao.docx + dados da ata). */
export function buildFilledAtaDocxBuffer(
  minute: InternalMinutes,
  rollCall: RollCall | null,
  members: Member[]
): Buffer {
  const data = buildAtaDocxData(minute, rollCall, members);
  const templatePath = path.join(process.cwd(), 'public', 'atareuniao.docx');
  if (!fs.existsSync(templatePath)) {
    throw new Error('Modelo de ata (atareuniao.docx) não encontrado em public');
  }
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  });
  doc.render(data);
  return doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  }) as Buffer;
}
