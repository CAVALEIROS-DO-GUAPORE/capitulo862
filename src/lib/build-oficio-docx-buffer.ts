import path from 'path';
import fs from 'fs';
import { fillTemplateDocxData } from '@/lib/fill-template-nome-mestre';

export interface OficioDocxData {
  NUM: string;
  ANO: string;
  GESTAO: string;
  date: string;
  destino: string;
  assunto: string;
  event: string;
  date_event: string;
  hora: string;
  local: string;
  texto: string;
  mestre_conselheiro: string;
  escrivao: string;
  membro_conselho: string;
}

export function buildFilledOficioDocxBuffer(data: Partial<OficioDocxData>): Buffer {
  const templatePath = path.join(process.cwd(), 'public', 'modelo_oficio.docx');
  if (!fs.existsSync(templatePath)) {
    throw new Error('Modelo de convite (modelo_oficio.docx) não encontrado em public');
  }

  const safe: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) safe[k] = v == null ? '' : String(v);

  // Preenchimento direto no XML para manter a formatação original do modelo Word.
  return fillTemplateDocxData(templatePath, safe);
}

