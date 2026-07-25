export type OnboardingMissionLocale =
  | 'en'
  | 'it'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt'
  | 'nl'
  | 'pl'
  | 'uk'
  | 'ja'
  | 'ko'
  | 'zh-Hans'
  | 'zh-Hant'
  | 'ar';

export const ONBOARDING_MISSION_COPY: Record<OnboardingMissionLocale, string> = {
  en: 'Mapshroom’s goal is to bring setup time as close to zero as possible.',
  it: 'L’obiettivo di Mapshroom è portare il tempo di configurazione il più vicino possibile allo zero.',
  es: 'El objetivo de Mapshroom es acercar el tiempo de configuración lo máximo posible a cero.',
  fr: 'L’objectif de Mapshroom est de réduire le temps de configuration au plus près de zéro.',
  de: 'Mapshrooms Ziel ist es, die Einrichtungszeit so nah wie möglich an null zu bringen.',
  pt: 'O objetivo do Mapshroom é reduzir o tempo de configuração para o mais próximo possível de zero.',
  nl: 'Het doel van Mapshroom is om de installatietijd zo dicht mogelijk bij nul te brengen.',
  pl: 'Celem Mapshroom jest skrócenie czasu konfiguracji tak, aby był jak najbliższy zeru.',
  uk: 'Мета Mapshroom — максимально наблизити час налаштування до нуля.',
  ja: 'Mapshroomの目標は、セットアップ時間を限りなくゼロに近づけることです。',
  ko: 'Mapshroom의 목표는 설정 시간을 가능한 한 0에 가깝게 줄이는 것입니다.',
  'zh-Hans': 'Mapshroom 的目标是让设置时间尽可能接近于零。',
  'zh-Hant': 'Mapshroom 的目標是讓設定時間盡可能接近於零。',
  ar: 'هدف Mapshroom هو جعل وقت الإعداد أقرب ما يمكن إلى الصفر.',
};

function matchMissionLocale(language: string): OnboardingMissionLocale | null {
  const normalized = language.trim().replaceAll('_', '-').toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith('zh')) {
    return normalized.includes('hant') || /^zh-(tw|hk|mo)(-|$)/.test(normalized)
      ? 'zh-Hant'
      : 'zh-Hans';
  }

  const baseLanguage = normalized.split('-')[0] as OnboardingMissionLocale;
  return baseLanguage in ONBOARDING_MISSION_COPY ? baseLanguage : null;
}

export function resolveOnboardingMissionLocale(
  preferredLanguages: readonly string[] =
    typeof navigator !== 'undefined'
      ? [...navigator.languages, navigator.language].filter(Boolean)
      : [],
): OnboardingMissionLocale {
  for (const language of preferredLanguages) {
    const locale = matchMissionLocale(language);
    if (locale) {
      return locale;
    }
  }

  return 'en';
}
