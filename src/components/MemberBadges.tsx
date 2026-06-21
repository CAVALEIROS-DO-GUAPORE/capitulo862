import Image from 'next/image';
import { getMemberBadge, type MemberBadgeId } from '@/lib/member-badges';

interface MemberBadgesProps {
  badges?: MemberBadgeId[] | string[];
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClasses = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
};

export default function MemberBadges({ badges, size = 'sm', className = '' }: MemberBadgesProps) {
  const list = (badges || [])
    .map((id) => getMemberBadge(id))
    .filter((b): b is NonNullable<typeof b> => Boolean(b));

  if (list.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`}>
      {list.map((badge) => (
        <span
          key={badge.id}
          title={`${badge.label}: ${badge.description}`}
          className={`${sizeClasses[size]} relative shrink-0 rounded-md overflow-hidden ring-1 ring-slate-200 bg-white`}
        >
          <Image
            src={badge.image}
            alt={badge.label}
            fill
            className="object-contain p-0.5"
            sizes={size === 'sm' ? '28px' : '36px'}
          />
        </span>
      ))}
    </div>
  );
}
