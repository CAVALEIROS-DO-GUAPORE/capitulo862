-- Políticas do bucket "signatures" (Storage)
-- Execute no SQL Editor do Supabase depois de criar o bucket "signatures".
-- O bucket pode ser público ou privado; estas policies controlam INSERT/DELETE por usuário e SELECT.

-- 1) Usuário autenticado pode fazer upload apenas na própria pasta (userId no caminho)
CREATE POLICY "Users can upload own signature"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2) Usuário autenticado pode excluir apenas arquivos da própria pasta
CREATE POLICY "Users can delete own signature"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3) Leitura: qualquer um pode ver (para exibir no perfil e no PDF)
--    Se preferir só usuários logados, troque TO public por TO authenticated.
CREATE POLICY "Signatures are readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'signatures');
