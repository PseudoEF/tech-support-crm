import { motion, useReducedMotion } from 'motion/react';
import type { SlaHealth } from '../domain/selectors';
import { AnimatedNumber } from './AnimatedNumber';

const RINGS = [
  {
    key: 'compliance',
    label: 'Соблюдение SLA',
    radius: 78,
    strokeWidth: 10,
    color: '#2f6fed',
    track: '#e6edfb',
  },
  {
    key: 'firstResponse',
    label: 'Первый ответ',
    radius: 59,
    strokeWidth: 8,
    color: '#0f9f8f',
    track: '#e2f4f0',
  },
  {
    key: 'resolution',
    label: 'Решение',
    radius: 40,
    strokeWidth: 7,
    color: '#b7791f',
    track: '#f7edda',
  },
] as const;

interface SlaRingsProps {
  health: SlaHealth;
}

export function SlaRings({ health }: SlaRingsProps) {
  const reducedMotion = useReducedMotion();

  return (
    <section className="card sla-rings-card" aria-labelledby="sla-rings-title">
      <header className="card-header">
        <div>
          <h2 id="sla-rings-title">SLA-здоровье</h2>
          <p>Закрытые заявки и соблюдение целей</p>
        </div>
        <span className="rings-status">
          <span className="local-dot" aria-hidden="true" />
          live
        </span>
      </header>

      <div className="sla-rings-body">
        <div className="rings-figure">
          <svg
            viewBox="0 0 200 200"
            role="img"
            aria-label={`Соблюдение SLA ${health.compliance}%, первый ответ ${health.firstResponse}%, решение ${health.resolution}%`}
          >
            {RINGS.map((ring) => {
              const value = health[ring.key];
              return (
                <g key={ring.key}>
                  <circle
                    cx="100"
                    cy="100"
                    r={ring.radius}
                    fill="none"
                    stroke={ring.track}
                    strokeWidth={ring.strokeWidth}
                  />
                  <motion.circle
                    cx="100"
                    cy="100"
                    r={ring.radius}
                    fill="none"
                    stroke={ring.color}
                    strokeWidth={ring.strokeWidth}
                    strokeLinecap="round"
                    transform="rotate(-90 100 100)"
                    initial={{ pathLength: reducedMotion ? value / 100 : 0 }}
                    animate={{ pathLength: value / 100 }}
                    transition={{
                      duration: reducedMotion ? 0 : 1.05,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                </g>
              );
            })}
          </svg>
          <div className="rings-center" aria-hidden="true">
            <strong>
              <AnimatedNumber value={health.compliance} />
            </strong>
            <span>% SLA</span>
          </div>
        </div>

        <ul className="rings-legend">
          {RINGS.map((ring) => {
            const value = health[ring.key];
            const metKey =
              ring.key === 'compliance'
                ? 'complianceMet'
                : ring.key === 'firstResponse'
                  ? 'firstResponseMet'
                  : 'resolutionMet';
            const totalKey =
              ring.key === 'compliance'
                ? 'complianceTotal'
                : ring.key === 'firstResponse'
                  ? 'firstResponseTotal'
                  : 'resolutionTotal';
            return (
              <li key={ring.key}>
                <span
                  className="ring-swatch"
                  style={{ backgroundColor: ring.color }}
                  aria-hidden="true"
                />
                <span className="ring-legend-copy">
                  <span>{ring.label}</span>
                  <small>
                    {health[metKey]} из {health[totalKey]}
                  </small>
                </span>
                <strong>{value}%</strong>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="rings-note">
        {health.complianceTotal > 0
          ? `Рассчитано по ${health.complianceTotal} завершённым заявкам`
          : 'Пока нет завершённых заявок для расчёта'}
      </p>
    </section>
  );
}
