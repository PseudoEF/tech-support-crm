import {
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
} from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { TicketFlowPoint } from '../domain/selectors';
import { formatNumber } from '../lib/format';
import { buildSmoothPath } from '../lib/chart';
import { Icon } from './Icon';

const RANGES = [7, 14, 30] as const;
type Range = (typeof RANGES)[number];

const WIDTH = 760;
const HEIGHT = 272;
const LEFT = 38;
const RIGHT = 14;
const TOP = 18;
const BOTTOM = 38;
const PLOT_WIDTH = WIDTH - LEFT - RIGHT;
const PLOT_HEIGHT = HEIGHT - TOP - BOTTOM;

const COLORS = {
  created: '#2f6fed',
  resolved: '#0f9f8f',
};

function axisMaximum(values: readonly number[]): number {
  const highest = Math.max(1, ...values);
  if (highest <= 4) return 4;
  const step = highest <= 10 ? 2 : highest <= 20 ? 5 : highest <= 50 ? 10 : 20;
  return Math.ceil(highest / step) * step;
}

function linePath(
  values: readonly number[],
  xAt: (index: number) => number,
  yAt: (value: number) => number,
): string {
  return buildSmoothPath(values.map((value, index) => ({ x: xAt(index), y: yAt(value) })));
}

function areaPath(line: string, xAt: (index: number) => number, count: number): string {
  if (!line || count === 0) return '';
  const baseline = TOP + PLOT_HEIGHT;
  return `${line} L ${xAt(count - 1)} ${baseline} L ${xAt(0)} ${baseline} Z`;
}

interface TicketFlowChartProps {
  points: TicketFlowPoint[];
}

export function TicketFlowChart({ points }: TicketFlowChartProps) {
  const [range, setRange] = useState<Range>(14);
  const [hovered, setHovered] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();
  const rangeIndicatorId = useId().replace(/:/g, '');
  const createdGradientId = useId().replace(/:/g, '');
  const resolvedGradientId = useId().replace(/:/g, '');
  const notesId = useId();

  const visible = useMemo(() => points.slice(-range), [points, range]);
  const created = visible.map((point) => point.created);
  const resolved = visible.map((point) => point.resolved);
  const maximum = axisMaximum([...created, ...resolved]);
  const xStep = visible.length > 1 ? PLOT_WIDTH / (visible.length - 1) : 0;
  const xAt = (index: number) => LEFT + index * xStep;
  const yAt = (value: number) => TOP + PLOT_HEIGHT * (1 - value / maximum);
  const createdLine = linePath(created, xAt, yAt);
  const resolvedLine = linePath(resolved, xAt, yAt);
  const createdArea = areaPath(createdLine, xAt, visible.length);
  const resolvedArea = areaPath(resolvedLine, xAt, visible.length);
  const labelStep = range === 7 ? 1 : range === 14 ? 2 : 5;
  const totalCreated = created.reduce((sum, value) => sum + value, 0);
  const totalResolved = resolved.reduce((sum, value) => sum + value, 0);
  const summary = visible
    .map((point) => `${point.label}: создано ${point.created}, решено ${point.resolved}`)
    .join('; ');

  const hoveredPoint = hovered === null ? null : visible[hovered];
  const hoveredX = hovered === null ? 0 : xAt(hovered);
  const tooltipLeft = `${(hoveredX / WIDTH) * 100}%`;

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;
    const relative = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
    const index = Math.round((relative - LEFT) / (xStep || PLOT_WIDTH));
    setHovered(Math.min(visible.length - 1, Math.max(0, index)));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setHovered(null);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    setHovered((current) => {
      if (event.key === 'Home') return 0;
      if (event.key === 'End') return visible.length - 1;
      const base = current ?? visible.length - 1;
      if (event.key === 'ArrowLeft') return Math.max(0, base - 1);
      return Math.min(visible.length - 1, base + 1);
    });
  };

  return (
    <section className="card chart-card ticket-flow-card" aria-labelledby="ticket-flow-title">
      <header className="card-header chart-header">
        <div>
          <h2 id="ticket-flow-title">Динамика обращений</h2>
          <p>Созданные и решённые заявки за выбранный период</p>
        </div>
        <div className="flow-chart-controls">
          <div className="chart-legend" aria-label="Серии графика">
            <span>
              <span className="legend-dot legend-created" aria-hidden="true" />
              Создано
            </span>
            <span>
              <span className="legend-dot legend-resolved" aria-hidden="true" />
              Решено
            </span>
          </div>
          <div className="range-switch" role="group" aria-label="Период графика">
            {RANGES.map((value) => (
              <button
                key={value}
                type="button"
                className={`range-option ${range === value ? 'is-active' : ''}`}
                aria-pressed={range === value}
                onClick={() => {
                  setRange(value);
                  setHovered(null);
                }}
              >
                {range === value ? (
                  <motion.span
                    className="range-indicator"
                    layoutId={`range-${rangeIndicatorId}`}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 460, damping: 38 }
                    }
                  />
                ) : null}
                <span>{value} дн</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flow-chart-meta" aria-live="polite">
        <span>
          <strong>{formatNumber(totalCreated)}</strong> создано
        </span>
        <span>
          <strong>{formatNumber(totalResolved)}</strong> решено
        </span>
        <span className="flow-meta-note">
          <Icon name="spark" size={13} />
          Наведите или используйте стрелки
        </span>
      </div>

      <div
        className="chart-plot-wrap"
        role="group"
        tabIndex={0}
        aria-label={`График обращений за ${range} дней: ${summary}`}
        aria-describedby={notesId}
        onKeyDown={handleKeyDown}
        onFocus={() => setHovered(visible.length - 1)}
        onBlur={() => setHovered(null)}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="flow-chart-svg"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          onPointerLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id={createdGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.created} stopOpacity="0.24" />
              <stop offset="82%" stopColor={COLORS.created} stopOpacity="0.035" />
              <stop offset="100%" stopColor={COLORS.created} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={resolvedGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.resolved} stopOpacity="0.17" />
              <stop offset="82%" stopColor={COLORS.resolved} stopOpacity="0.025" />
              <stop offset="100%" stopColor={COLORS.resolved} stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = TOP + PLOT_HEIGHT * fraction;
            return (
              <g key={fraction}>
                <line
                  x1={LEFT}
                  x2={WIDTH - RIGHT}
                  y1={y}
                  y2={y}
                  className={`chart-grid-line ${fraction === 1 ? 'is-baseline' : ''}`}
                />
                {[0, 0.5, 1].includes(fraction) ? (
                  <text x={LEFT - 9} y={y + 3} textAnchor="end" className="chart-axis-label">
                    {Math.round(maximum * (1 - fraction))}
                  </text>
                ) : null}
              </g>
            );
          })}

          <motion.path
            key={`created-area-${range}`}
            d={createdArea}
            fill={`url(#${createdGradientId})`}
            initial={{ opacity: reducedMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.5 }}
          />
          <motion.path
            key={`resolved-area-${range}`}
            d={resolvedArea}
            fill={`url(#${resolvedGradientId})`}
            initial={{ opacity: reducedMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.5, delay: 0.08 }}
          />
          <motion.path
            key={`resolved-line-${range}`}
            d={resolvedLine}
            fill="none"
            stroke={COLORS.resolved}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reducedMotion ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: reducedMotion ? 0 : 0.95,
              delay: reducedMotion ? 0 : 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
          <motion.path
            key={`created-line-${range}`}
            d={createdLine}
            fill="none"
            stroke={COLORS.created}
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reducedMotion ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: reducedMotion ? 0 : 0.95,
              ease: [0.22, 1, 0.36, 1],
            }}
          />

          {visible.map((point, index) => {
            const showLabel =
              index % labelStep === 0 || index === visible.length - 1 || range === 7;
            return showLabel ? (
              <text
                key={point.date}
                x={xAt(index)}
                y={HEIGHT - 12}
                textAnchor="middle"
                className="chart-axis-label chart-x-label"
              >
                {point.label}
              </text>
            ) : null;
          })}

          {hovered !== null && hoveredPoint ? (
            <g className="chart-hover-layer" aria-hidden="true">
              <line
                x1={hoveredX}
                x2={hoveredX}
                y1={TOP}
                y2={TOP + PLOT_HEIGHT}
                className="chart-crosshair"
              />
              <circle
                cx={hoveredX}
                cy={yAt(hoveredPoint.created)}
                r="4"
                fill="#fff"
                stroke={COLORS.created}
                strokeWidth="2.2"
              />
              <circle
                cx={hoveredX}
                cy={yAt(hoveredPoint.resolved)}
                r="4"
                fill="#fff"
                stroke={COLORS.resolved}
                strokeWidth="2.2"
              />
            </g>
          ) : null}
        </svg>

        {hovered !== null && hoveredPoint ? (
          <div
            className="chart-tooltip"
            style={{ left: `clamp(86px, ${tooltipLeft}, calc(100% - 86px))` }}
            aria-hidden="true"
          >
            <strong>{hoveredPoint.label}</strong>
            <span>
              <span className="legend-dot legend-created" />
              Создано <b>{hoveredPoint.created}</b>
            </span>
            <span>
              <span className="legend-dot legend-resolved" />
              Решено <b>{hoveredPoint.resolved}</b>
            </span>
          </div>
        ) : null}
      </div>

      <p id={notesId} className="sr-only">
        Используйте стрелки влево и вправо, Home и End, чтобы перемещаться по дням. Escape
        скрывает подсказку.
      </p>

      <table className="sr-only">
        <caption>Показатели обращений за {range} дней</caption>
        <thead>
          <tr>
            <th scope="col">День</th>
            <th scope="col">Создано</th>
            <th scope="col">Решено</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((point) => (
            <tr key={point.date}>
              <th scope="row">{point.label}</th>
              <td>{point.created}</td>
              <td>{point.resolved}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
