import type { Member } from '@/types';
import MemberCard from './MemberCard';

interface MemberSectionProps {
  title: string;
  description: string;
  members: Member[];
  directors: Member[];
  secretaries?: Member[];
  otherLabel?: string;
}

function sortByOrder(members: Member[]) {
  return [...members].sort((a, b) => a.order - b.order);
}

function isMc(role: string) {
  const r = role?.trim().toLowerCase() ?? '';
  return r === 'mestre conselheiro' || r === 'mestre_conselheiro';
}
function is1c(role: string) {
  const r = role?.trim().toLowerCase() ?? '';
  return r.includes('1º') || r.includes('1o') || r === 'primeiro_conselheiro';
}
function is2c(role: string) {
  const r = role?.trim().toLowerCase() ?? '';
  return r.includes('2º') || r.includes('2o') || r === 'segundo_conselheiro';
}

function getDemolayDirectorLayout(directors: Member[]): { mc?: Member; c1?: Member; c2?: Member } | null {
  if (directors.length !== 3) return null;
  let mc: Member | undefined;
  let c1: Member | undefined;
  let c2: Member | undefined;
  for (const m of directors) {
    if (isMc(m.role)) mc = m;
    else if (is1c(m.role)) c1 = m;
    else if (is2c(m.role)) c2 = m;
  }
  if (mc && c1 && c2) return { mc, c1, c2 };
  return null;
}

export default function MemberSection({
  title,
  description,
  members,
  directors,
  secretaries = [],
  otherLabel = 'Membros',
}: MemberSectionProps) {
  const directorIds = new Set(directors.map((d) => d.id));
  const secretaryIds = new Set(secretaries.map((s) => s.id));
  const directorList = sortByOrder(directors);
  const secretaryList = sortByOrder(secretaries);
  const otherList = sortByOrder(
    members.filter((m) => !directorIds.has(m.id) && !secretaryIds.has(m.id))
  );

  return (
    <section className="mb-16">
      <h2 className="text-2xl font-bold text-blue-800 mb-2">{title}</h2>
      <p className="text-slate-600 mb-8 max-w-3xl">{description}</p>

      {directorList.length > 0 && (() => {
        const layout = getDemolayDirectorLayout(directorList);
        return (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Diretoria</h3>
            {layout ? (
              <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto">
                <div className="flex justify-center">
                  <MemberCard
                    key={layout.mc.id}
                    name={layout.mc.name}
                    role={layout.mc.role}
                    photo={layout.mc.photo}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
                  <div className="flex justify-center sm:justify-end">
                    <MemberCard
                      key={layout.c1.id}
                      name={layout.c1.name}
                      role={layout.c1.role}
                      photo={layout.c1.photo}
                    />
                  </div>
                  <div className="flex justify-center sm:justify-start">
                    <MemberCard
                      key={layout.c2.id}
                      name={layout.c2.name}
                      role={layout.c2.role}
                      photo={layout.c2.photo}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {directorList.map((member) => (
                  <MemberCard
                    key={member.id}
                    name={member.name}
                    role={member.role}
                    photo={member.photo}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {secretaryList.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Secretaria</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {secretaryList.map((member) => (
              <MemberCard
                key={member.id}
                name={member.name}
                role={member.role}
                photo={member.photo}
              />
            ))}
          </div>
        </div>
      )}

      {otherList.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-700 mb-4">{otherLabel}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {otherList.map((member) => (
              <MemberCard
                key={member.id}
                name={member.name}
                role={member.role}
                photo={member.photo}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
