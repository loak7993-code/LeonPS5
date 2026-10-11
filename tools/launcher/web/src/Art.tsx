const PALETTES: [string, string, string][] = [
  ["#0a1440", "#1646c2", "#4d8bff"],
  ["#07223a", "#0d5f86", "#3fa9c9"],
  ["#0b1030", "#2a3f7d", "#7d9bff"],
  ["#241307", "#7c3a12", "#e08a3c"],
  ["#062b26", "#0d5f52", "#39b49a"],
];

function hash(input: string): number {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) >>> 0;
  }
  return value;
}

type ArtProps = {
  id: string;
  title: string;
  className?: string;
};

export function GameArt({ id, title, className }: ArtProps) {
  const seed = hash(id);
  const [bg, mid, glow] = PALETTES[seed % PALETTES.length];
  const variant = seed % 4;
  const tilt = (seed % 24) - 12;
  const uid = `a${seed.toString(36)}${title.length}`;
  return (
    <svg
      viewBox="0 0 448 448"
      className={className}
      role="img"
      aria-label={title}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={bg} />
          <stop offset="1" stopColor={mid} />
        </linearGradient>
        <radialGradient id={`${uid}-halo`} cx="0.3" cy="0.22" r="0.75">
          <stop offset="0" stopColor={glow} stopOpacity="0.42" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="448" height="448" fill={`url(#${uid}-bg)`} />
      <rect width="448" height="448" fill={`url(#${uid}-halo)`} />
      {variant === 0 && (
        <g fill="none" stroke={glow}>
          <circle cx="316" cy="128" r="38" strokeWidth="2" opacity="0.55" />
          <circle cx="316" cy="128" r="72" strokeWidth="1.5" opacity="0.3" />
          <circle cx="316" cy="128" r="108" strokeWidth="1" opacity="0.16" />
          <circle cx="316" cy="128" r="10" fill={glow} stroke="none" />
        </g>
      )}
      {variant === 1 && (
        <g transform={`rotate(${tilt} 224 224)`}>
          <rect x="180" y="-140" width="46" height="740" rx="23" fill={mid} opacity="0.5" />
          <rect x="252" y="-140" width="14" height="740" rx="7" fill={glow} opacity="0.3" />
          <rect x="120" y="-140" width="6" height="740" rx="3" fill={glow} opacity="0.16" />
        </g>
      )}
      {variant === 2 && (
        <g transform={`rotate(${tilt} 224 224)`}>
          <ellipse cx="224" cy="224" rx="158" ry="58" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.38" />
          <ellipse cx="224" cy="224" rx="96" ry="34" fill="none" stroke={glow} strokeWidth="1" opacity="0.2" />
          <circle cx="224" cy="224" r="44" fill={mid} opacity="0.65" />
          <circle cx="366" cy="196" r="9" fill={glow} />
        </g>
      )}
      {variant === 3 && (
        <g fill={glow}>
          {Array.from({ length: 64 }, (_, index) => {
            const x = 48 + (index % 8) * 50;
            const y = 48 + Math.floor(index / 8) * 50;
            const row = Math.floor(index / 8);
            return <circle key={index} cx={x} cy={y} r={row < 3 ? 4 : 2.5} opacity={0.34 - row * 0.038} />;
          })}
        </g>
      )}
      <rect width="448" height="448" fill="#000000" opacity="0.14" />
    </svg>
  );
}
