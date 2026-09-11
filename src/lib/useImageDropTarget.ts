import { useEffect, useState, type DragEvent } from 'react';
import { canDropImage, captureImageTransfer, type ImageTransfer } from './imageTransfer';

export function useImageDropTarget(onDrop: (transfer: ImageTransfer, targetId: string) => void) {
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  useEffect(() => {
    const clear = () => setDropTargetId(null);
    window.addEventListener('dragend', clear);
    window.addEventListener('drop', clear, true);
    return () => {
      window.removeEventListener('dragend', clear);
      window.removeEventListener('drop', clear, true);
    };
  }, []);
  const dropProps = (targetId = 'image') => ({
    'data-image-drop-active': dropTargetId === targetId || undefined,
    onDragEnter: (event: DragEvent<HTMLElement>) => {
      if (!canDropImage(event.dataTransfer)) return;
      event.preventDefault();
      event.stopPropagation();
      setDropTargetId(targetId);
    },
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!canDropImage(event.dataTransfer)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'copy';
      setDropTargetId(targetId);
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
        setDropTargetId(null);
      }
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      if (!canDropImage(event.dataTransfer)) return;
      event.preventDefault();
      event.stopPropagation();
      setDropTargetId(null);
      onDrop(captureImageTransfer(event.dataTransfer), targetId);
    },
  });
  return { dropProps };
}
