import { useCallback, useState } from 'react';

export function useRangeHoverPreview(scope: string) {
  const [preview, setPreview] = useState<{ scope: string; name: string; value: number } | null>(null);
  const onHoverValueChange = useCallback((name: string, value: number | null) => {
    setPreview(current => {
      if (value === null) return current?.name === name ? null : current;
      if (current?.scope === scope && current.name === name && current.value === value) return current;
      return { scope, name, value };
    });
  }, [scope]);
  return { preview: preview?.scope === scope ? preview : null, onHoverValueChange };
}
