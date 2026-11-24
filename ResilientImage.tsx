import { Cpu } from 'lucide-react';
import { useState } from 'react';

interface ResilientImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export function ResilientImage({ src, alt, className = '' }: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#18181B] via-[#111114] to-[#09090B] text-[#A1A1AA] select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <Cpu className="w-8 h-8 text-[#8B5CF6]/60 mb-2" />
        <span className="text-xs text-[#A1A1AA] px-3 text-center line-clamp-1">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
