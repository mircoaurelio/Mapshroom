import type { ReactNode } from 'react';

interface PanelSectionProps {
  title: string;
  eyebrow: string;
  children: ReactNode;
}

export function PanelSection({ title, eyebrow, children }: PanelSectionProps) {
  return (
    <section className="panel-section">
      <div className="panel-section-header">
        <span className="panel-eyebrow">{eyebrow}</span>
        <h2 className="panel-title">{title}</h2>
      </div>
      {children}
    </section>
  );
}
