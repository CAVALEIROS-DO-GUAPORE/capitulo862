'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function CriarSenhaPage() {
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function checkSession() {
      const hasHash = typeof window !== 'undefined' && window.location.hash?.length > 0;

      for (let attempt = 0; attempt < (hasHash ? 4 : 1); attempt++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSessionReady(true);
          setCheckingSession(false);
          return;
        }
        if (hasHash && attempt < 3) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      setSessionReady(false);
      setCheckingSession(false);
    }

    checkSession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }
    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase.auth.updateUser({ password: senha });
      if (updateError) {
        const isDifferentPasswordError = updateError.message?.toLowerCase().includes('different') && updateError.message?.toLowerCase().includes('password');
        if (isDifferentPasswordError) {
          setError('Use uma senha que você ainda não tenha usado nesta conta. Se você já definiu uma senha antes, vá para o login. Caso contrário, tente outra senha (com letras e números).');
        } else {
          setError(updateError.message || 'Não foi possível definir a senha. Tente outra senha (mín. 6 caracteres, use letras e números).');
        }
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setError('Sessão expirada. Use o link do email novamente.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, name, role, avatar_url, active')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        setError('Conta ainda não está pronta. Entre em contato com o Capítulo ou peça um novo convite por email.');
        return;
      }

      if (profile.active === false) {
        await supabase.auth.signOut();
        setError('Esta conta está inativa. Entre em contato com o Capítulo.');
        return;
      }

      sessionStorage.setItem('dm_user', JSON.stringify({
        email: profile.email || authData.user.email,
        role: profile.role || 'membro',
        name: profile.name || 'Membro',
        avatarUrl: profile.avatar_url || null,
      }));

      router.push('/painel');
      router.refresh();
    } catch (err) {
      setError('Erro ao criar senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="text-center text-slate-600">
          <p>Verificando link...</p>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-8">
            <h1 className="text-2xl font-bold text-blue-800 mb-2">Link inválido ou expirado</h1>
            <p className="text-slate-600 mb-6 text-sm">
              O link para criar sua senha não é válido ou já expirou. Peça um novo convite ao administrador ou use o link mais recente que recebeu por email.
            </p>
            <Link
              href="/login"
              className="inline-block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-center"
            >
              Ir para o login
            </Link>
          </div>
          <p className="mt-6 text-center text-slate-500 text-sm">
            <Link href="/" className="text-blue-600 hover:underline">
              ← Voltar ao início
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-8">
          <h1 className="text-2xl font-bold text-blue-800 mb-2 text-center">
            Criar sua senha
          </h1>
          <p className="text-slate-600 text-center mb-8 text-sm">
            Defina uma senha para acessar o painel interno do Capítulo.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="senha" className="block text-slate-700 text-sm mb-1">
                Nova senha
              </label>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="confirmarSenha" className="block text-slate-700 text-sm mb-1">
                Confirmar senha
              </label>
              <input
                id="confirmarSenha"
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Digite a senha novamente"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
            >
              {loading ? 'Criando senha...' : 'Criar senha e acessar'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-slate-500 text-sm">
          <Link href="/" className="text-blue-600 hover:underline">
            ← Voltar ao início
          </Link>
        </p>
      </div>
    </div>
  );
}
