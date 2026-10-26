import { motion, useReducedMotion } from 'motion/react';
import type { CrmMetrics } from '../domain/selectors';
import type { DashboardTrends } from '../domain/trends';
import { formatNumber } from '../lib/format';
import { AnimatedNumber } from './AnimatedNumber';
import { Icon, type IconName } from './Icon';
import { Sparkline } from './Sparkline';

interface KpiBentoProps {
  metrics: CrmMetrics;
  trends: DashboardTrends;
  overdueShare: number;
}

interface DurationDisplay {
  value: number;
  unit: string;
  decimals: number;
}

function durationDisplay(minutes: number): DurationDisplay {
  if (minutes < 60) {
    return { value: Math.round(minutes), unit: 'мин', decimals: 0 };
  }

  const hours = minutes / 60;
  if (hours < 24) {
    return {
      value: hours,
      unit: 'ч',
      decimals: hours >= 10 ? 0 : 1,
    };
  }

  return {
    value: hours / 24,
    unit: 'д',
    decimals: 1,
  };
}

function decimalFormatter(decimals: number): (value: number) => string {
  return (value) => {
    if (decimals === 0) return String(Math.round(value));
    return value.toFixed(decimals).replace('.', ',');
  };
}

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
  },
};

interface KpiCardProps {
  label: string;
  value: number | null;
  unit?: string;
  hint: string;
  icon: IconName;
  tone: 'brand' | 'danger' | 'warning' | 'success';
  sparkline: readonly number[];
  sparklineLabel: string;
  sparklineVariant?: 'line' | 'bars';
  decimals?: number;
}

function KpiCard({
  label,
  value,
  unit,
  hint,
  icon,
  tone,
  sparkline,
  sparklineLabel,
  sparklineVariant = 'line',
  decimals = 0,
}: KpiCardProps) {
  return (
    <motion.article variants={CARD_VARIANTS} className={`stat-card kpi-card stat-${tone}`}>
      <div className="kpi-card-head">
        <span className="stat-icon">
          <Icon name={icon} size={18} />
        </span>
        <span className="stat-label">{label}</span>
        <span className="kpi-window">14 дней</span>
      </div>

      <div className="kpi-value">
        {value === null ? (
          <strong className="kpi-empty">—</strong>
        ) : (
          <>
            <strong>
              <AnimatedNumber value={value} format={decimalFormatter(decimals)} />
            </strong>
            {unit ? <span>{unit}</span> : null}
          </>
        )}
      </div>

      <p className="stat-hint">{hint}</p>

      <div className="kpi-spark">
        <Sparkline
          values={sparkline}
          tone={tone}
          variant={sparklineVariant}
          label={sparklineLabel}
        />
      </div>
    </motion.article>
  );
}

export function KpiBento({ metrics, trends, overdueShare }: KpiBentoProps) {
  const reducedMotion = useReducedMotion();
  const lastFourteen = <T,>(values: T[]): T[] => values.slice(-14);
  const firstResponse = metrics.averageFirstResponseMinutes;
  const resolution = metrics.averageResolutionMinutes;
  const firstResponseDisplay = firstResponse === null ? null : durationDisplay(firstResponse);
  const resolutionDisplay = resolution === null ? null : durationDisplay(resolution);

  return (
    <motion.section
      className="stat-grid kpi-bento"
      aria-label="Ключевые показатели"
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: reducedMotion ? 0 : 0.06 },
        },
      }}
    >
      <KpiCard
        label="Открытые заявки"
        value={metrics.openTickets}
        hint={`${metrics.byStatus.new} новых · ${metrics.byStatus.pending} ожидают`}
        icon="tickets"
        tone="brand"
        sparkline={lastFourteen(trends.open)}
        sparklineLabel="Динамика открытых заявок за 14 дней"
      />
      <KpiCard
        label="Просрочен SLA"
        value={metrics.overdueTickets}
        hint={
          metrics.overdueTickets > 0
            ? `${overdueShare}% активной очереди требуют внимания`
            : 'Все активные заявки в норме'
        }
        icon="alert-triangle"
        tone={metrics.overdueTickets > 0 ? 'danger' : 'success'}
        sparkline={lastFourteen(trends.overdue)}
        sparklineLabel="Динамика просроченных заявок за 14 дней"
        sparklineVariant="bars"
      />
      <KpiCard
        label="Среднее реагирование"
        value={firstResponseDisplay?.value ?? null}
        unit={firstResponseDisplay?.unit}
        decimals={firstResponseDisplay?.decimals}
        hint="Первый ответ клиенту"
        icon="clock"
        tone="success"
        sparkline={lastFourteen(trends.firstResponse)}
        sparklineLabel="Среднее время первого ответа за 14 дней"
      />
      <KpiCard
        label="Среднее решение"
        value={resolutionDisplay?.value ?? null}
        unit={resolutionDisplay?.unit}
        decimals={resolutionDisplay?.decimals}
        hint={`${formatNumber(metrics.resolvedTickets)} заявок решено и закрыто`}
        icon="check-circle"
        tone="warning"
        sparkline={lastFourteen(trends.resolution)}
        sparklineLabel="Среднее время решения за 14 дней"
        sparklineVariant="bars"
      />
    </motion.section>
  );
}
