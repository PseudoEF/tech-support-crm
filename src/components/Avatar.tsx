import { initials } from '../lib/format';

const PALETTE = [
  { background: '#e3ecff', color: '#194185' },
  { background: '#e0f5ef', color: '#085d52' },
  { background: '#f8e9d4', color: '#7a3e00' },
  { background: '#eee7fb', color: '#4f2a9a' },
  { background: '#fce7ec', color: '#8b1f3d' },
  { background: '#e4f1fa', color: '#0b4a6f' },
  { background: '#eef1e0', color: '#47551b' },
] as const;

function paletteIndex(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return hash % PALETTE.length;
}

interface AvatarProps {
  name: string;
  size?: number;
  online?: boolean;
  className?: string;
}

export function Avatar({ name, size = 36, online = false, className = '' }: AvatarProps) {
  const colors = PALETTE[paletteIndex(name)];
  return (
    <span
      className={`avatar ${online ? 'avatar-online' : ''} ${className}`.trim()}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.34)),
        backgroundColor: colors.background,
        color: colors.color,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
