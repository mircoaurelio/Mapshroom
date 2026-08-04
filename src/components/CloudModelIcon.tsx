export function CloudModelIcon({
  className = 'ai-path-icon',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox={compact ? '7 9 50 34' : '0 0 64 64'}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M18 38c-5 0-8-3.5-8-8s3.5-8 8.5-8c1.2-5.5 6-9.5 11.8-9.5 5.2 0 9.6 3.1 11.4 7.5 1-.3 2-.5 3.1-.5 5.2 0 9.2 4 9.2 9s-4 9-9.2 9H18Z"
        fill={compact ? 'none' : 'rgba(251,191,36,.1)'}
        stroke="currentColor"
        strokeWidth={compact ? 2.6 : 2}
        strokeLinejoin="round"
      />
      {compact ? null : (
        <>
          <path
            d="M28 28c2-4 6-6 10-4M36 34c3-2 7-1 9 2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity=".7"
          />
          <circle cx="30" cy="33" r="2" fill="currentColor" />
          <circle cx="40" cy="31" r="2.4" fill="currentColor" />
          <path d="M33 40c2 .8 4 .8 6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M46 14l2 4 4 1-4 2-1 4-2-4-4-1 4-2 1-4ZM14 44l1.4 2.8 2.8.8-2.8 1.2-.8 2.8-1.4-2.8-2.8-.8 2.8-1.2.8-2.8Z"
            fill="currentColor"
            opacity=".55"
          />
        </>
      )}
    </svg>
  );
}
