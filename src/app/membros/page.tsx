'use client';

import { useState, useEffect } from 'react';
import { memberDescriptions } from '@/data/mock';
import MemberSection from '@/components/MemberSection';
import type { Member } from '@/types';

// Cargos da diretoria DeMolay: cada chave é o nome de exibição; o array são variantes aceitas (inclui slug do painel)
const DEMOLAY_DIRECTOR_MAP: Record<string, string[]> = {
  'Mestre Conselheiro': ['Mestre Conselheiro', 'mestre_conselheiro', 'Mestre conselheiro'],
  '1º Conselheiro': ['1º Conselheiro', '1º conselheiro', 'primeiro_conselheiro', '1o Conselheiro'],
  '2º Conselheiro': ['2º Conselheiro', '2º conselheiro', 'segundo_conselheiro', '2o Conselheiro'],
};
const DEMOLAY_DIRECTOR_ROLES = Object.keys(DEMOLAY_DIRECTOR_MAP);
const DEMOLAY_DIRECTOR_VARIANTS = new Set(Object.values(DEMOLAY_DIRECTOR_MAP).flat());

const DEMOLAY_SECRETARY_ROLES = ['Escrivão', 'Hospitaleiro', 'Tesoureiro'];
const SENIOR_DIRECTOR_ROLES = ['Presidente', 'Vice-Presidente'];
const CONSULTIVO_DIRECTOR_ROLES = ['Presidente', 'Membro Organizador'];
const ESCUDEIRO_DIRECTOR_ROLES = ['Mestre Escudeiro', '1º Escudeiro', '2º Escudeiro'];

/** Retorna o cargo de exibição para a página (ex.: primeiro_conselheiro → 1º Conselheiro) */
function roleToDisplay(role: string): string {
  if (!role?.trim()) return role;
  const r = role.trim();
  for (const [display, variants] of Object.entries(DEMOLAY_DIRECTOR_MAP)) {
    if (variants.some((v) => v.toLowerCase() === r.toLowerCase())) return display;
  }
  return role;
}

function isDemolayDirectorRole(role: string): boolean {
  return DEMOLAY_DIRECTOR_VARIANTS.has(role) || Array.from(DEMOLAY_DIRECTOR_VARIANTS).some((v) => v.toLowerCase() === role?.trim().toLowerCase());
}

type SectionId = 'demolays' | 'seniores' | 'consultores' | 'escudeiros';

const sections: { id: SectionId; label: string }[] = [
  { id: 'demolays', label: 'DeMolays' },
  { id: 'seniores', label: 'Sêniores' },
  { id: 'consultores', label: 'Conselho Consultivo' },
  { id: 'escudeiros', label: 'Escudeiros' },
];

export default function MembrosPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('demolays');
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    fetch('/api/members')
      .then((r) => r.json())
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]));
  }, []);

  function membersInCategory(cat: SectionId) {
    return members.filter(
      (m) =>
        m.category === cat ||
        m.additionalRoles?.some((r) => r.category === cat)
    );
  }

  function roleInSection(m: Member, cat: SectionId): string {
    return m.category === cat ? m.role : (m.additionalRoles?.find((r) => r.category === cat)?.role ?? '');
  }

  function withSectionRole(members: Member[], cat: SectionId): Member[] {
    return members.map((m) => ({ ...m, role: roleInSection(m, cat) }));
  }

  const demolaysAll = membersInCategory('demolays');
  const demolaysDirectors = demolaysAll.filter((m) =>
    isDemolayDirectorRole(roleInSection(m, 'demolays'))
  );
  const demolaysSecretaries = demolaysAll.filter((m) =>
    DEMOLAY_SECRETARY_ROLES.includes(roleInSection(m, 'demolays'))
  );

  const seniores = membersInCategory('seniores');
  const senioresDirectors = seniores.filter((m) =>
    SENIOR_DIRECTOR_ROLES.includes(roleInSection(m, 'seniores'))
  );

  const consultores = membersInCategory('consultores');
  const consultoresDirectors = consultores.filter((m) =>
    CONSULTIVO_DIRECTOR_ROLES.includes(roleInSection(m, 'consultores'))
  );

  const escudeiros = membersInCategory('escudeiros');
  const escudeirosDirectors = escudeiros.filter((m) =>
    ESCUDEIRO_DIRECTOR_ROLES.includes(roleInSection(m, 'escudeiros'))
  );

  return (
    <div className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-800 mb-4 text-center">
          Membros do Capítulo
        </h1>
        <p className="text-slate-600 text-center mb-10 max-w-2xl mx-auto">
          DeMolays aparecem ao abrir a página. Selecione outra seção para ver Sêniores, Consultores ou Escudeiros.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`py-4 px-4 rounded-xl font-semibold transition-all border-2 ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                  : 'bg-white text-blue-800 border-blue-200 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {activeSection === 'demolays' && (
          <MemberSection
            title={memberDescriptions.demolays.title}
            description={memberDescriptions.demolays.description}
            members={withSectionRole(demolaysAll, 'demolays')}
            directors={withSectionRole(demolaysDirectors, 'demolays').map((m) => ({ ...m, role: roleToDisplay(m.role) }))}
            secretaries={withSectionRole(demolaysSecretaries, 'demolays')}
            otherLabel="Demais Membros"
          />
        )}
        {activeSection === 'seniores' && (
          <MemberSection
            title={memberDescriptions.seniores.title}
            description={memberDescriptions.seniores.description}
            members={withSectionRole(seniores, 'seniores')}
            directors={withSectionRole(senioresDirectors, 'seniores')}
            otherLabel="Membros"
          />
        )}
        {activeSection === 'consultores' && (
          <MemberSection
            title={memberDescriptions.consultores.title}
            description={memberDescriptions.consultores.description}
            members={withSectionRole(consultores, 'consultores')}
            directors={withSectionRole(consultoresDirectors, 'consultores')}
            otherLabel="Consultores"
          />
        )}
        {activeSection === 'escudeiros' && (
          <MemberSection
            title={memberDescriptions.escudeiros.title}
            description={memberDescriptions.escudeiros.description}
            members={withSectionRole(escudeiros, 'escudeiros')}
            directors={withSectionRole(escudeirosDirectors, 'escudeiros')}
            otherLabel="Escudeiros"
          />
        )}

      </div>
    </div>
  );
}
