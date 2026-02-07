'use client';

import { useState } from 'react';

export default function CandidaturaForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [knowsDemolay, setKnowsDemolay] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    motherName: '',
    fatherName: '',
    birthDate: '',
    city: '',
    fatherIsMason: false,
    phone: '',
    email: '',
    demolayContactName: '',
    interestReason: '',
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (name === 'knowsDemolay') setKnowsDemolay(checked);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/candidatos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          knowsDemolay,
          demolayContactName: knowsDemolay ? formData.demolayContactName : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar');

      setSuccess(true);
      setFormData({
        fullName: '',
        motherName: '',
        fatherName: '',
        birthDate: '',
        city: '',
        fatherIsMason: false,
        phone: '',
        email: '',
        demolayContactName: '',
        interestReason: '',
      });
      setKnowsDemolay(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar a ficha.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-xl border border-blue-200 p-8 text-center shadow-sm">
        <div className="text-5xl mb-4">✓</div>
        <h3 className="text-xl font-bold text-blue-800 mb-2">Ficha enviada com sucesso!</h3>
        <p className="text-slate-600">
          O Mestre Conselheiro e o 1º Conselheiro receberão sua candidatura. Em breve entraremos em contato.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-sm max-w-2xl mx-auto">
      <h3 className="text-xl font-bold text-blue-800 mb-6">Ficha de Candidato à Ordem DeMolay</h3>

      <div className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-slate-700 text-sm font-medium mb-1">
            Nome completo *
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            value={formData.fullName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label htmlFor="motherName" className="block text-slate-700 text-sm font-medium mb-1">
            Nome da mãe *
          </label>
          <input
            id="motherName"
            name="motherName"
            type="text"
            required
            value={formData.motherName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label htmlFor="fatherName" className="block text-slate-700 text-sm font-medium mb-1">
            Nome do pai (caso tenha)
          </label>
          <input
            id="fatherName"
            name="fatherName"
            type="text"
            value={formData.fatherName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label htmlFor="birthDate" className="block text-slate-700 text-sm font-medium mb-1">
            Data de nascimento *
          </label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            required
            value={formData.birthDate}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label htmlFor="city" className="block text-slate-700 text-sm font-medium mb-1">
            Cidade em que mora *
          </label>
          <input
            id="city"
            name="city"
            type="text"
            required
            value={formData.city}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="fatherIsMason"
            name="fatherIsMason"
            type="checkbox"
            checked={formData.fatherIsMason}
            onChange={handleChange}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="fatherIsMason" className="text-slate-700 text-sm">
            O pai é maçom?
          </label>
        </div>

        <div>
          <label htmlFor="phone" className="block text-slate-700 text-sm font-medium mb-1">
            Telefone *
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-slate-700 text-sm font-medium mb-1">
            E-mail *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="knowsDemolay"
            name="knowsDemolay"
            type="checkbox"
            checked={knowsDemolay}
            onChange={(e) => {
              handleChange(e);
              if (!e.target.checked) setFormData((p) => ({ ...p, demolayContactName: '' }));
            }}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="knowsDemolay" className="text-slate-700 text-sm">
            Conhece algum DeMolay?
          </label>
        </div>

        {knowsDemolay && (
          <div>
            <label htmlFor="demolayContactName" className="block text-slate-700 text-sm font-medium mb-1">
              Nome do DeMolay
            </label>
            <input
              id="demolayContactName"
              name="demolayContactName"
              type="text"
              value={formData.demolayContactName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        )}

        <div>
          <label htmlFor="interestReason" className="block text-slate-700 text-sm font-medium mb-1">
            Por que você se interessa em entrar na Ordem? *
          </label>
          <textarea
            id="interestReason"
            name="interestReason"
            required
            rows={4}
            value={formData.interestReason}
            onChange={handleChange}
            placeholder="Escreva brevemente o que te atrai na Ordem DeMolay..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 text-red-600 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
      >
        {loading ? 'Enviando...' : 'Enviar ficha cadastral'}
      </button>
    </form>
  );
}
