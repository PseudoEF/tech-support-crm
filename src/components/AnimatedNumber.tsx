import { useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  className?: string;
}

function defaultFormat(value: number): string {
  return String(Math.round(value));
}

export function AnimatedNumber({
  value,
  format = defaultFormat,
  className = '',
}: AnimatedNumberProps) {
  const reducedMotion = useReducedMotion();
  const progress = useMotionValue(reducedMotion ? value : 0);
  const display = useTransform(progress, (latest) => format(latest));

  useEffect(() => {
    if (reducedMotion) {
      progress.set(value);
      return;
    }
    const controls = animate(progress, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [progress, reducedMotion, value]);

  return (
    <span className={`animated-number ${className}`.trim()}>
      <motion.span aria-hidden="true">{display}</motion.span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
