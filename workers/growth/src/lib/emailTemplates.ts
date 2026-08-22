import type { EmailTemplateKey } from '../types';

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

const BRAND = {
  bg: '#09090b',
  panel: '#0d0d10',
  raised: '#111114',
  line: '#27272a',
  lineStrong: '#3f3f46',
  text: '#d4d4d8',
  textBright: '#f4f4f5',
  textMuted: '#a1a1aa',
  textDim: '#71717a',
  accent: '#34d399',
  accentInk: '#042f24',
  accentSoft: 'rgba(52, 211, 153, 0.12)',
  logoUrl: 'https://mapshroom.dev/assets/icons/favicon-32.png',
  siteUrl: 'https://mapshroom.dev',
} as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function shell(input: {
  kicker: string;
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
}): string {
  const { kicker, title, bodyHtml, ctaLabel, ctaUrl, footerNote } = input;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};color:${BRAND.text};font-family:'IBM Plex Sans',Segoe UI,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(title)} — Mapshroom
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.bg};padding:28px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;border:1px solid ${BRAND.lineStrong};border-radius:6px;background:${BRAND.panel};overflow:hidden;">
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,${BRAND.accent},rgba(52,211,153,0.15));font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:22px 24px 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="${BRAND.logoUrl}" width="28" height="28" alt="" style="display:block;border:0;border-radius:4px;" />
                  </td>
                  <td style="vertical-align:middle;font-family:'IBM Plex Mono',Consolas,monospace;font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND.accent};">
                    Mapshroom
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 24px 0;font-family:'IBM Plex Mono',Consolas,monospace;font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.textDim};">
              ${escapeHtml(kicker)}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 14px;font-size:24px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:${BRAND.textBright};">
              ${escapeHtml(title)}
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 22px;font-size:14px;line-height:1.55;color:${BRAND.textMuted};">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;">
              <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${BRAND.accent};color:${BRAND.accentInk};text-decoration:none;font-family:'IBM Plex Mono',Consolas,monospace;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:12px 16px;border-radius:4px;border:1px solid ${BRAND.accent};">
                ${escapeHtml(ctaLabel)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 10px;font-size:12px;line-height:1.5;color:${BRAND.textDim};">
              ${escapeHtml(footerNote)}
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 22px;font-size:11px;line-height:1.5;color:${BRAND.textDim};font-family:'IBM Plex Mono',Consolas,monospace;">
              <a href="${escapeHtml(ctaUrl)}" style="color:${BRAND.accent};text-decoration:none;word-break:break-all;">${escapeHtml(ctaUrl)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 24px 18px;border-top:1px solid ${BRAND.line};font-size:11px;line-height:1.45;color:${BRAND.textDim};">
              <a href="${BRAND.siteUrl}" style="color:${BRAND.textMuted};text-decoration:none;">mapshroom.dev</a>
              &nbsp;·&nbsp; Projects stay on your device by default.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildEmail(
  template: EmailTemplateKey,
  params: { verifyUrl: string; locale?: string },
): EmailContent {
  const italian = params.locale === 'it';

  if (template === 'verify_download') {
    return {
      subject: italian
        ? 'Verifica email · Mapshroom Windows beta'
        : 'Verify email · Mapshroom Windows beta',
      html: shell({
        kicker: italian ? 'Desktop beta' : 'Desktop beta',
        title: italian ? 'Verifica e scarica' : 'Verify and download',
        bodyHtml: italian
          ? '<p style="margin:0 0 12px;">Conferma questa email per sbloccare l’installer Windows della beta gratuita.</p><p style="margin:0;">I progetti restano sul tuo PC. Windows può mostrare un avviso SmartScreen perché la build non è ancora firmata.</p>'
          : '<p style="margin:0 0 12px;">Confirm this email to unlock the free Windows beta installer.</p><p style="margin:0;">Projects stay on your PC. Windows may show a SmartScreen warning because this build is not code-signed yet.</p>',
        ctaLabel: italian ? 'Verifica email' : 'Verify email',
        ctaUrl: params.verifyUrl,
        footerNote: italian
          ? 'Se il pulsante non funziona, apri questo link:'
          : 'If the button does not work, open this link:',
      }),
      text: italian
        ? `Mapshroom · Verifica e scarica\n\nConferma questa email per sbloccare l’installer Windows:\n${params.verifyUrl}\n\nmapshroom.dev`
        : `Mapshroom · Verify and download\n\nConfirm this email to unlock the Windows installer:\n${params.verifyUrl}\n\nmapshroom.dev`,
    };
  }

  if (template === 'verify_newsletter') {
    return {
      subject: italian ? 'Conferma newsletter · Mapshroom' : 'Confirm newsletter · Mapshroom',
      html: shell({
        kicker: 'Newsletter',
        title: italian ? 'Conferma iscrizione' : 'Confirm subscription',
        bodyHtml: italian
          ? '<p style="margin:0;">Hai chiesto aggiornamenti Mapshroom. Conferma questa email per attivare la newsletter. Puoi annullare in qualsiasi momento.</p>'
          : '<p style="margin:0;">You asked for Mapshroom updates. Confirm this email to activate the newsletter. You can unsubscribe anytime.</p>',
        ctaLabel: italian ? 'Conferma iscrizione' : 'Confirm subscription',
        ctaUrl: params.verifyUrl,
        footerNote: italian
          ? 'Se il pulsante non funziona, apri questo link:'
          : 'If the button does not work, open this link:',
      }),
      text: italian
        ? `Conferma iscrizione Mapshroom\n\n${params.verifyUrl}`
        : `Confirm Mapshroom newsletter\n\n${params.verifyUrl}`,
    };
  }

  if (template === 'verify_pro_beta') {
    return {
      subject: italian ? 'Conferma interesse · Mapshroom Pro' : 'Confirm interest · Mapshroom Pro',
      html: shell({
        kicker: 'Pro waitlist',
        title: italian ? 'Lista d’attesa Pro' : 'Pro waitlist',
        bodyHtml: italian
          ? '<p style="margin:0;">Conferma la tua email per entrare nella lista d’attesa di Mapshroom Pro.</p>'
          : '<p style="margin:0;">Confirm your email to join the Mapshroom Pro waitlist.</p>',
        ctaLabel: italian ? 'Conferma interesse' : 'Confirm interest',
        ctaUrl: params.verifyUrl,
        footerNote: italian
          ? 'Se il pulsante non funziona, apri questo link:'
          : 'If the button does not work, open this link:',
      }),
      text: italian
        ? `Conferma interesse Pro\n\n${params.verifyUrl}`
        : `Confirm Pro interest\n\n${params.verifyUrl}`,
    };
  }

  return {
    subject: italian ? 'Verifica email · Mapshroom' : 'Verify email · Mapshroom',
    html: shell({
      kicker: italian ? 'Profilo' : 'Profile',
      title: italian ? 'Verifica email' : 'Verify your email',
      bodyHtml: italian
        ? '<p style="margin:0;">Conferma questa email per attivare il tuo profilo Mapshroom senza password. I progetti creativi restano sul dispositivo.</p>'
        : '<p style="margin:0;">Confirm this email to activate your passwordless Mapshroom profile. Creative projects stay on your device.</p>',
      ctaLabel: italian ? 'Verifica email' : 'Verify email',
      ctaUrl: params.verifyUrl,
      footerNote: italian
        ? 'Se il pulsante non funziona, apri questo link:'
        : 'If the button does not work, open this link:',
    }),
    text: italian
      ? `Verifica email Mapshroom\n\n${params.verifyUrl}`
      : `Verify Mapshroom email\n\n${params.verifyUrl}`,
  };
}

export function templateForSource(source: string): EmailTemplateKey {
  if (source === 'newsletter') {
    return 'verify_newsletter';
  }
  if (source === 'pro_beta') {
    return 'verify_pro_beta';
  }
  if (source === 'profile_register') {
    return 'verify_profile';
  }
  return 'verify_download';
}
