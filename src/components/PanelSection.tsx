import type { ReactNode } from 'react';

interface PanelSectionProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PanelSection({ title, actions, children }: PanelSectionProps) {
  return (
    <section className="panel-section">
      {title || actions ? (
        <div className="panel-section-header">
          {title ? <h2 className="panel-title">{title}</h2> : null}
          {actions ? <div className="panel-section-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
