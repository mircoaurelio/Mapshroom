const BRAND_LETTERS = ['M', 'a', 'p', 's', 'h', 'r', 'o', 'o', 'm'] as const;
const LETTER_STAGGER_MS = 28;
const LETTER_REVEAL_MS = 70;

export function MapshroomBrandLockup() {
  return (
    <div className="loading-brand-lockup">
      <img
        className="loading-brand-logo"
        src={`${import.meta.env.BASE_URL}assets/icons/mapshroom-icon-transparent-512.png`}
        alt=""
      />
      <span className="loading-brand-name" aria-hidden="true">
        {BRAND_LETTERS.map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            className={`loading-brand-letter ${index < 3 ? 'loading-brand-letter-accent' : ''}`}
            style={{
              animationDelay: `${index * LETTER_STAGGER_MS}ms`,
              animationDuration: `${LETTER_REVEAL_MS}ms`,
            }}
          >
            {letter}
          </span>
        ))}
      </span>
    </div>
  );
}
