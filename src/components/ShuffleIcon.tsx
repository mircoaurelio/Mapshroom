interface ShuffleIconProps {
  blocked?: boolean;
}

export function ShuffleIcon({ blocked = false }: ShuffleIconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.25 4.25h1.5c3.75 0 4.5 7.5 8.5 7.5h1.5" />
      <path d="m11.75 9.75 2 2-2 2" />
      <path d="M2.25 11.75h1.5c1.55 0 2.55-1.28 3.48-2.75" />
      <path d="M8.78 6.95c.93-1.45 1.93-2.7 3.47-2.7h1.5" />
      <path d="m11.75 2.25 2 2-2 2" />
      {blocked ? <path d="M2 14 14 2" /> : null}
    </svg>
  );
}
