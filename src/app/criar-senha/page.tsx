'use client';

import Link from 'next/link';

export default function CriarSenhaPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-8">
          <h1 className="text-2xl font-bold text-blue-800 mb-2">Cadastro por email desativado</h1>
          <p className="text-slate-600 mb-6 text-sm leading-relaxed">
            O cadastro por link de email não é mais usado. Os usuários são criados pelo Admin, MC ou 1º Conselheiro com uma senha padrão. Faça login com a senha informada pelo administrador (padrão: <strong>capitulo862</strong>) e altere-a em <strong>Perfil</strong> após o acesso.
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
