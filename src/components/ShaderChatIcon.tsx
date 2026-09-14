type IconName = 'send' | 'chevron' | 'restore' | 'retry' | 'code' | 'copy' | 'check' | 'plus' | 'more';

const paths: Record<Exclude<IconName, 'more'>, string> = {
  send: 'M12 19V5m-6 6 6-6 6 6',
  chevron: 'm7 10 5 5 5-5',
  restore: 'M9 5 4 10l5 5M4 10h9a6 6 0 0 1 0 12',
  retry: 'M20 7v5h-5M4 17v-5h5M5.1 8a8 8 0 0 1 13.2-2L20 8M4 16l1.7 2A8 8 0 0 0 18.9 16',
  code: 'm8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16',
  copy: 'M9 4h11v14H9zM6 7H4v14h11v-1',
  check: 'm5 12 4 4L19 6',
  plus: 'M12 5v14M5 12h14',
};

export function ShaderChatIcon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`shader-chat-icon ${className}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name === 'more' ? <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></> : <path d={paths[name]} />}
  </svg>;
}
