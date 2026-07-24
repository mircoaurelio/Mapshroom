const RANGE_PRESS_ATTRIBUTE = 'data-range-precision';
const RANGE_PRESS_MINIMUM_MS = 860;

function getRangeInput(target: EventTarget | null): HTMLInputElement | null {
  return target instanceof HTMLInputElement && target.type === 'range' ? target : null;
}

export function installRangePressMotion(): () => void {
  const activePointers = new Map<number, HTMLInputElement>();
  const pressStates = new WeakMap<HTMLInputElement, { startedAt: number; token: string }>();
  const releaseTimers = new Map<HTMLInputElement, number>();
  const installationId = crypto.randomUUID();
  let pressSequence = 0;

  const clearReleaseTimer = (input: HTMLInputElement) => {
    const timerId = releaseTimers.get(input);
    if (timerId === undefined) {
      return;
    }

    window.clearTimeout(timerId);
    releaseTimers.delete(input);
  };

  const press = (input: HTMLInputElement, pointerId: number) => {
    clearReleaseTimer(input);
    activePointers.set(pointerId, input);
    const token = `${installationId}-${pointerId}-${++pressSequence}`;
    pressStates.set(input, { startedAt: performance.now(), token });
    input.setAttribute(RANGE_PRESS_ATTRIBUTE, token);
  };

  const release = (input: HTMLInputElement) => {
    clearReleaseTimer(input);

    const pressState = pressStates.get(input);
    if (!pressState) {
      return;
    }

    const elapsed = performance.now() - pressState.startedAt;
    const remaining = Math.max(0, RANGE_PRESS_MINIMUM_MS - elapsed);
    const finish = () => {
      if (input.getAttribute(RANGE_PRESS_ATTRIBUTE) === pressState.token) {
        input.removeAttribute(RANGE_PRESS_ATTRIBUTE);
      }
      pressStates.delete(input);
      releaseTimers.delete(input);
    };

    if (remaining === 0) {
      finish();
      return;
    }

    releaseTimers.set(input, window.setTimeout(finish, remaining));
  };

  const handlePointerDown = (event: PointerEvent) => {
    const input = getRangeInput(event.target);
    if (input) {
      press(input, event.pointerId);
    }
  };

  const handlePointerEnd = (event: PointerEvent) => {
    const input = activePointers.get(event.pointerId);
    if (!input) {
      return;
    }

    activePointers.delete(event.pointerId);
    release(input);
  };

  document.addEventListener('pointerdown', handlePointerDown, true);
  document.addEventListener('pointerup', handlePointerEnd, true);
  document.addEventListener('pointercancel', handlePointerEnd, true);

  return () => {
    document.removeEventListener('pointerdown', handlePointerDown, true);
    document.removeEventListener('pointerup', handlePointerEnd, true);
    document.removeEventListener('pointercancel', handlePointerEnd, true);

    releaseTimers.forEach((timerId) => window.clearTimeout(timerId));
    releaseTimers.clear();
    activePointers.clear();
  };
}
