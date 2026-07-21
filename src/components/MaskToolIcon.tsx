interface MaskToolIconProps {
  className?: string;
}

export function MaskToolIcon({ className = '' }: MaskToolIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.8c4.9 0 8.1 3.6 7.5 8.3-.6 4.8-3.7 8.4-7.5 10.1-3.8-1.7-6.9-5.3-7.5-10.1C3.9 6.4 7.1 2.8 12 2.8Z" />
      <path d="M7.1 9.2c1.5-1.3 3.1-1.2 4.1.2-1.6 1-3.1 1-4.1-.2Zm9.8 0c-1.5-1.3-3.1-1.2-4.1.2 1.6 1 3.1 1 4.1-.2Z" />
      <path d="m12 9.7-1 5 1 1 1-1-1-5Zm-2.7 8c1.7.8 3.7.8 5.4 0M6.1 6.5c1.2.1 2.2-.5 2.7-1.7M17.9 6.5c-1.2.1-2.2-.5-2.7-1.7" />
      <path d="M6.5 13.2c1.2.1 2 .7 2.4 1.8-1.4.2-2.4-.4-2.4-1.8Zm11 0c-1.2.1-2 .7-2.4 1.8 1.4.2 2.4-.4 2.4-1.8Z" />
    </svg>
  );
}
