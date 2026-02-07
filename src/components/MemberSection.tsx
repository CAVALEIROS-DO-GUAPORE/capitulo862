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

      {directorList.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Diretoria</h3>
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
        </div>
      )}

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
