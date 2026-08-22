import { Link } from 'react-router-dom';
import { resolveAppLocale } from '../lib/privacyCopy';

const COPY = {
  en: {
    title: 'Desktop beta terms',
    intro:
      'Mapshroom Desktop for Windows is offered as a free beta. These terms apply when you request or download the offline installer.',
    bullets: [
      'The desktop app is beta software and may change, break, or be replaced without notice.',
      'It is currently free. Pricing may change later; we will communicate changes before charging.',
      'Your creative projects remain local by default. Email is collected to verify download access and, only if you opt in, for product updates.',
      'Marketing consent is optional and separate from the download request. You can withdraw anytime.',
      'We may retain download-only emails for a limited period for abuse prevention and support, then delete or anonymize them.',
      'Newsletter subscribers are retained until unsubscribe or deletion request.',
    ],
    back: 'Back to download',
  },
  it: {
    title: 'Termini della beta desktop',
    intro:
      'Mapshroom Desktop per Windows è offerta come beta gratuita. Questi termini si applicano quando richiedi o scarichi l’installer offline.',
    bullets: [
      'L’app desktop è software beta e può cambiare, interrompersi o essere sostituita senza preavviso.',
      'Al momento è gratuita. I prezzi potranno cambiare in futuro; comunicheremo prima di addebitare costi.',
      'I progetti creativi restano locali di default. L’email serve a verificare l’accesso al download e, solo se acconsenti, agli aggiornamenti prodotto.',
      'Il consenso marketing è opzionale e separato dalla richiesta di download. Puoi revocarlo in qualsiasi momento.',
      'Possiamo conservare le email solo-download per un periodo limitato per prevenzione abusi e supporto, poi cancellarle o anonimizzarle.',
      'Gli iscritti alla newsletter restano finché non annullano l’iscrizione o chiedono la cancellazione.',
    ],
    back: 'Torna al download',
  },
} as const;

export function BetaTermsRoute() {
  const locale = resolveAppLocale();
  const copy = COPY[locale];

  return (
    <main className="privacy-page" lang={locale}>
      <div className="privacy-page-inner">
        <p className="panel-eyebrow">Mapshroom</p>
        <h1>{copy.title}</h1>
        <p className="helper-copy">{copy.intro}</p>
        <section className="privacy-section">
          <ul className="privacy-list">
            {copy.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <Link to="/download" className="secondary-button">
          {copy.back}
        </Link>
      </div>
    </main>
  );
}
