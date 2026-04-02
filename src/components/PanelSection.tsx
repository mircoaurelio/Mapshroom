import type { ReactNode } from 'react';

interface PanelSectionProps {
  title?: string;
  children: ReactNode;
}

export function PanelSection({ title, children }: PanelSectionProps) {
  return (
    <section className="panel-section">
      {title ? (
        <div className="panel-section-header">
          <h2 className="panel-title">{title}</h2>
        </div>
      ) : null}
      {children}
    </section>
  );
}
