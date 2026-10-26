import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { buildSmoothPath, type ChartCoordinate } from '../lib/chart';

const TONE_COLORS = {
  brand: '#2f6fed',
  danger: '#d92d20',
  warning: '#b7791f',
  success: '#138a63',
} as const;

interface SparklineProps {
  values: readonly number[];
  tone?: keyof typeof TONE_COLORS;
  variant?: 'line' | 'bars';
  label: string;
}

function coordinates(values: readonly number[]): ChartCoordinate[] {
  const width = 160;
  const height = 46;
  const padding = 4;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = maximum - minimum || 1;

  return values.map((value, index) => ({
    x:
      values.length === 1
        ? width / 2
        : padding + (index / (values.length - 1)) * (width - padding * 2),
    y: padding + (1 - (value - minimum) / span) * (height - padding * 2),
  }));
}

export function Sparkline({
  values,
  tone = 'brand',
  variant = 'line',
  label,
}: SparklineProps) {
  const reducedMotion = useReducedMotion();
  const gradientId = useId().replace(/:/g, '');
  const color = TONE_COLORS[tone];
  const points = coordinates(values.length > 1 ? values : [values[0] ?? 0, values[0] ?? 0]);
  const line = buildSmoothPath(points);
  const area = `${line} L ${points[points.length - 1].x} 46 L ${points[0].x} 46 Z`;
  const max = Math.max(1, ...values);
  const barWidth = values.length > 0 ? 160 / values.length - 3 : 0;

  return (
    <svg
      className="sparkline"
      viewBox="0 0 160 46"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {variant === 'line' ? (
        <>
          <motion.path
            d={area}
            fill={`url(#${gradientId})`}
            initial={{ opacity: reducedMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.55, delay: 0.16 }}
          />
          <motion.path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: reducedMotion ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: reducedMotion ? 0 : 0.8,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="2.4"
            fill="#fff"
            stroke={color}
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
          />
        </>
      ) : (
        values.map((value, index) => {
          const barHeight = Math.max(2, (value / max) * 40);
          const x = index * (barWidth + 3);
          return (
            <motion.rect
              key={`${index}-${value}`}
              x={x}
              width={barWidth}
              rx="1.5"
              fill={color}
              fillOpacity={0.3 + (value / max) * 0.7}
              initial={
                reducedMotion ? { y: 46 - barHeight, height: barHeight } : { y: 46, height: 0 }
              }
              animate={{ y: 46 - barHeight, height: barHeight }}
              transition={{
                duration: reducedMotion ? 0 : 0.5,
                delay: reducedMotion ? 0 : index * 0.025,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          );
        })
      )}
    </svg>
  );
}
