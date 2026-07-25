const BRAND_LETTERS = ['M', 'a', 'p', 's', 'h', 'r', 'o', 'o', 'm'] as const;
export const BRAND_LOGO_REVEAL_MS = 260;
export const BRAND_LETTER_STAGGER_MS = 55;
export const BRAND_LETTER_REVEAL_MS = 180;
export const BRAND_REVEAL_DURATION_MS =
  BRAND_LOGO_REVEAL_MS +
  (BRAND_LETTERS.length - 1) * BRAND_LETTER_STAGGER_MS +
  BRAND_LETTER_REVEAL_MS;

export function MapshroomBrandLockup() {
  return (
    <div className="loading-brand-lockup">
      <img
        className="loading-brand-logo"
        src={`${import.meta.env.BASE_URL}assets/icons/mapshroom-icon-transparent-512.png`}
        alt=""
        style={{ animationDuration: `${BRAND_LOGO_REVEAL_MS}ms` }}
      />
      <span className="loading-brand-name" aria-hidden="true">
        {BRAND_LETTERS.map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            className={`loading-brand-letter ${index < 3 ? 'loading-brand-letter-accent' : ''}`}
            style={{
              animationDelay: `${
                BRAND_LOGO_REVEAL_MS + index * BRAND_LETTER_STAGGER_MS
              }ms`,
              animationDuration: `${BRAND_LETTER_REVEAL_MS}ms`,
            }}
          >
            {letter}
          </span>
        ))}
      </span>
    </div>
  );
}
