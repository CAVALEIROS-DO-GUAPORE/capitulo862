import Image from 'next/image';

interface MemberCardProps {
  name: string;
  role: string;
  photo?: string;
}

export default function MemberCard({ name, role, photo }: MemberCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-400 shadow-sm transition-colors">
      <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
        {photo ? (
          <Image src={photo} alt={name} width={96} height={96} className="object-cover w-full h-full" />
        ) : (
          <span className="text-3xl text-blue-600/70 font-bold">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <p className="font-bold text-blue-800 text-center">{role}</p>
      <p className="text-slate-600 text-center text-sm">{name}</p>
    </div>
  );
}
