import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface TimelineDeleteRequest {
  stepId: string;
  shaderName: string;
  bounds: { left: number; right: number; top: number; bottom: number };
  trigger: HTMLButtonElement;
}

export function TimelineDeleteConfirmation({ request, onCancel, onConfirm }: {
  request: TimelineDeleteRequest;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const noRef = useRef<HTMLButtonElement>(null);
  const width = 196;
  const height = 88;
  const below = window.innerHeight - request.bounds.bottom;
  const top = below < height + 12 && request.bounds.top > below
    ? Math.max(8, request.bounds.top - height - 4)
    : request.bounds.bottom + 4;
  const left = Math.max(8, Math.min(request.bounds.right - width, window.innerWidth - width - 8));

  useLayoutEffect(() => { noRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) onCancel();
    };
    const scroll = (event: Event) => {
      if (!panelRef.current?.contains(event.target as Node)) onCancel();
    };
    window.addEventListener('pointerdown', outside, true);
    window.addEventListener('resize', onCancel);
    window.addEventListener('scroll', scroll, true);
    return () => {
      window.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('resize', onCancel);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [onCancel]);

  const cancelAndFocus = () => {
    onCancel();
    const target = request.trigger.isConnected ? request.trigger
      : document.querySelector<HTMLButtonElement>(`[data-timeline-step-id="${request.stepId}"] .timeline-step-overflow-trigger`);
    target?.focus({ preventScroll: true });
  };

  return createPortal(<div ref={panelRef} role="dialog" aria-label={`Delete ${request.shaderName}?`}
    className="timeline-delete-confirmation" style={{ top, left }}
    onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => event.stopPropagation()}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); cancelAndFocus(); }
      if (event.key === 'Tab') {
        event.preventDefault();
        const buttons = Array.from(panelRef.current?.querySelectorAll('button') ?? []);
        buttons.find((button) => button !== document.activeElement)?.focus();
      }
    }}>
    <strong>Are you sure?</strong>
    <span className="timeline-delete-shader-name" title={request.shaderName}>{request.shaderName}</span>
    <div className="timeline-delete-choices">
      <button ref={noRef} type="button" onClick={cancelAndFocus}>No</button>
      <button type="button" className="timeline-delete-yes" onClick={onConfirm}>Yes</button>
    </div>
  </div>, document.body);
}
