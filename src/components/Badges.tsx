import { computeSla, formatDuration, getSlaPolicy } from '../domain/sla';
import {
  PRIORITY_LABELS,
  SLA_STATE_LABELS,
  STATUS_LABELS,
} from '../domain/labels';
import type { Priority, SlaPolicy, Ticket, TicketStatus } from '../domain/types';

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`badge priority priority-${priority}`}>
      <span className="badge-dot" aria-hidden="true" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`badge status status-${status}`}>{STATUS_LABELS[status]}</span>;
}

export function TagChip({ children }: { children: string }) {
  return <span className="tag-chip">{children}</span>;
}

interface SlaBadgeProps {
  ticket: Ticket;
  now: Date;
  policies?: readonly SlaPolicy[];
  showLabel?: boolean;
}

export function SlaBadge({ ticket, now, policies, showLabel = false }: SlaBadgeProps) {
  const sla = computeSla(ticket, now, policies);
  const policy = getSlaPolicy(ticket.priority, policies);
  const finished = ticket.status === 'resolved' || ticket.status === 'closed';

  let text: string;
  if (sla.overall === 'overdue' && finished) {
    text = showLabel ? 'SLA нарушен при закрытии' : 'SLA нарушен';
  } else if (sla.overall === 'overdue') {
    const candidates: number[] = [];
    if (sla.responseBreached) candidates.push(sla.responseRemainingMs);
    if (sla.resolutionBreached) candidates.push(sla.resolutionRemainingMs);
    const mostOverdue = candidates.length > 0 ? Math.min(...candidates) : sla.resolutionRemainingMs;
    text = `Просрочено · ${formatDuration(mostOverdue)}`;
  } else if (sla.overall === 'met') {
    text = 'SLA соблюдён';
  } else {
    const remaining =
      sla.nextTarget === 'response' ? sla.responseRemainingMs : sla.resolutionRemainingMs;
    text = `${showLabel ? `${SLA_STATE_LABELS[sla.overall]} · ` : ''}${formatDuration(remaining)}`;
  }

  return (
    <span
      className={`badge sla sla-${sla.overall}`}
      title={`Реакция: ${policy.responseMinutes} мин · решение: ${formatDuration(
        policy.resolutionMinutes * 60_000,
      )}`}
    >
      <span className="badge-dot" aria-hidden="true" />
      {showLabel && sla.overall === 'overdue' ? '' : null}
      {text}
    </span>
  );
}

export function SlaStateLabel({ state }: { state: 'overdue' | 'due-soon' | 'on-track' | 'met' }) {
  return <span className={`sla-label sla-${state}`}>{SLA_STATE_LABELS[state]}</span>;
}
