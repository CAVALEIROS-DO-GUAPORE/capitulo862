'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Profile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  birthDate: string | null;
  avatarUrl: string | null;
  role: string;
}

export default function PerfilPage() {
  const searchParams = useSearchParams();
  const trocarSenha = searchParams.get('trocar') === '1';
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', birthDate: '' });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  async function getAuthHeaders(): Promise<HeadersInit> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async function loadProfile() {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/profile', { headers });
    if (!res.ok) {
      setProfile(null);
      return;
    }
    const data = await res.json();
    setProfile(data);
    setForm({
      name: data.name || '',
      phone: data.phone || '',
      birthDate: data.birthDate ? data.birthDate.slice(0, 10) : '',
    });
  }

  useEffect(() => {
    loadProfile().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setMustChangePassword(u.mustChangePassword === true);
      } catch {}
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          birthDate: form.birthDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      setSuccess('Perfil atualizado com sucesso.');
      setProfile((p) => (p ? { ...p, ...data } : p));
      const stored = sessionStorage.getItem('dm_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          u.name = form.name.trim();
          sessionStorage.setItem('dm_user', JSON.stringify(u));
        } catch {}
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Não autorizado');

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar foto');
      setProfile((p) => (p ? { ...p, avatarUrl: data.avatarUrl } : p));
      setSuccess('Foto atualizada com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar foto');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setPasswordSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers,
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao alterar senha');
      setPasswordSuccess('Senha alterada com sucesso.');
      setNewPassword('');
      setConfirmPassword('');
      setMustChangePassword(false);
      const stored = sessionStorage.getItem('dm_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          u.mustChangePassword = false;
          sessionStorage.setItem('dm_user', JSON.stringify(u));
        } catch {}
      }
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Erro ao alterar senha');
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-slate-500">Carregando...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-slate-600">
        Não foi possível carregar seu perfil.
      </div>
    );
  }

  const showTrocarSenhaBanner = trocarSenha || mustChangePassword;

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-blue-800">Meu Perfil</h1>

      {showTrocarSenhaBanner && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
          <p className="font-medium">Altere sua senha padrão</p>
          <p className="text-sm mt-1">Por segurança, defina uma nova senha abaixo. A senha inicial foi definida pelo administrador.</p>
        </div>
      )}

      {/* Avatar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-semibold text-blue-800 mb-4">Foto de perfil</h2>
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-slate-100 shrink-0">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt="Foto de perfil"
                fill
                className="object-cover"
                unoptimized={profile.avatarUrl.includes('supabase')}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-2xl font-bold">
                {profile.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div>
            <label className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50">
              {avatarUploading ? 'Enviando...' : 'Alterar foto'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={avatarUploading}
              />
            </label>
            <p className="text-slate-500 text-xs mt-2">JPG ou PNG, máx. 5MB</p>
          </div>
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-semibold text-blue-800 mb-4">Dados pessoais</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-700 text-sm mb-1">Email</label>
            <input
              type="email"
              value={profile.email || ''}
              disabled
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
            />
            <p className="text-slate-400 text-xs mt-1">O email não pode ser alterado.</p>
          </div>
          <div>
            <label className="block text-slate-700 text-sm mb-1">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-slate-700 text-sm mb-1">Telefone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="(00) 00000-0000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-slate-700 text-sm mb-1">Data de nascimento</label>
            <input
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>

      {/* Alterar senha */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-semibold text-blue-800 mb-4">Alterar senha</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-700 text-sm mb-1">Nova senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-slate-700 text-sm mb-1">Confirmar nova senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          {passwordError && <p className="text-red-600 text-sm">{passwordError}</p>}
          {passwordSuccess && <p className="text-green-600 text-sm">{passwordSuccess}</p>}
          <button
            type="submit"
            disabled={passwordSaving || !newPassword || !confirmPassword}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {passwordSaving ? 'Alterando...' : 'Alterar senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
