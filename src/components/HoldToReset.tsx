import { useEffect, useId, useRef, type MouseEvent, type PointerEvent } from 'react';
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react';
import { Icon } from './Icon';

interface HoldToResetProps {
  onComplete: () => void;
  disabled?: boolean;
}

export function HoldToReset({ onComplete, disabled = false }: HoldToResetProps) {
  const progress = useMotionValue(0);
  const controlsRef = useRef<ReturnType<typeof animate> | null>(null);
  const reducedMotion = useReducedMotion();
  const hintId = useId();
  const holdingRef = useRef(false);

  const stopProgress = (reset = true) => {
    holdingRef.current = false;
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (reset) {
      animate(progress, 0, {
        duration: reducedMotion ? 0 : 0.18,
        ease: 'easeOut',
      });
    }
  };

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  const startHold = () => {
    if (disabled || holdingRef.current) return;
    holdingRef.current = true;
    controlsRef.current?.stop();
    controlsRef.current = animate(progress, 1, {
      duration: 0.85,
      ease: 'linear',
      onComplete: () => {
        holdingRef.current = false;
        controlsRef.current = null;
        progress.set(0);
        onComplete();
      },
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || disabled) return;
    startHold();
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0 || disabled) return;
    onComplete();
  };

  return (
    <div className="hold-reset">
      <button
        type="button"
        className="button button-danger hold-reset-button"
        disabled={disabled}
        aria-describedby={hintId}
        onPointerDown={handlePointerDown}
        onPointerUp={() => stopProgress()}
        onPointerCancel={() => stopProgress()}
        onPointerLeave={() => stopProgress()}
        onClick={handleClick}
      >
        <motion.span
          className="hold-reset-fill"
          style={{ scaleX: progress }}
          aria-hidden="true"
        />
        <span className="hold-reset-content">
          <Icon name="refresh" size={16} />
          Удерживайте для сброса
        </span>
      </button>
      <p id={hintId} className="hold-reset-hint">
        Удерживайте 0,8 с. С клавиатуры нажмите Enter или пробел.
      </p>
    </div>
  );
}
