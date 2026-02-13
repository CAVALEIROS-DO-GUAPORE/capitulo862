-- Calendário: categorias "evento" e "atividades_mensais", e campos para atividades
-- Execute no SQL Editor do Supabase

-- Coluna category: 'evento' (padrão) ou 'atividades_mensais'
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'evento'
  CHECK (category IN ('evento', 'atividades_mensais'));

-- Horário do evento (opcional)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS start_time TEXT;

-- Para atividades mensais: último dia para envio
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS date_end DATE;

-- Atividade já foi enviada (mestre marca)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS enviado BOOLEAN NOT NULL DEFAULT false;

-- Atualizar eventos existentes para category = 'evento' (já é default)
UPDATE calendar_events SET category = 'evento' WHERE category IS NULL;
