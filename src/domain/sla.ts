import type { Priority, SlaPolicy, Ticket } from './types';

export type SlaState = 'overdue' | 'due-soon' | 'on-track' | 'met';

export interface SlaComputation {
  responseDueAt: string;
  resolutionDueAt: string;
  responseRemainingMs: number;
  resolutionRemainingMs: number;
  responseBreached: boolean;
  resolutionBreached: boolean;
  responseCompleted: boolean;
  resolutionCompleted: boolean;
  nextTarget: 'response' | 'resolution' | null;
  nextDueAt: string | null;
  overall: SlaState;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export const DEFAULT_SLA_POLICIES: SlaPolicy[] = [
  { priority: 'critical', responseMinutes: 30, resolutionMinutes: 4 * 60 },
  { priority: 'high', responseMinutes: 60, resolutionMinutes: 8 * 60 },
  { priority: 'normal', responseMinutes: 4 * 60, resolutionMinutes: 24 * 60 },
  { priority: 'low', responseMinutes: 8 * 60, resolutionMinutes: 48 * 60 },
];

export function getSlaPolicy(
  priority: Priority,
  policies: readonly SlaPolicy[] = DEFAULT_SLA_POLICIES,
): SlaPolicy {
  const policy = policies.find((item) => item.priority === priority);
  if (!policy) {
    throw new Error(`No SLA policy configured for priority "${priority}"`);
  }
  return policy;
}

function isFinished(ticket: Ticket): boolean {
  return ticket.status === 'resolved' || ticket.status === 'closed';
}

function breachThresholdMs(policyMinutes: number): number {
  return Math.min(HOUR_MS, Math.max(15 * MINUTE_MS, policyMinutes * MINUTE_MS * 0.2));
}

export function computeSla(
  ticket: Ticket,
  now: Date = new Date(),
  policies: readonly SlaPolicy[] = DEFAULT_SLA_POLICIES,
): SlaComputation {
  const policy = getSlaPolicy(ticket.priority, policies);
  const createdAt = new Date(ticket.createdAt).getTime();
  const nowMs = now.getTime();
  const responseDueMs = createdAt + policy.responseMinutes * MINUTE_MS;
  const resolutionDueMs = createdAt + policy.resolutionMinutes * MINUTE_MS;
  const finished = isFinished(ticket);
  const finishedAt = ticket.resolvedAt ?? ticket.closedAt;
  const responseCompletedAt = ticket.firstRespondedAt ?? (finished ? finishedAt : null);
  const resolutionCompletedAt = ticket.resolvedAt ?? ticket.closedAt;

  const responseCompleted = responseCompletedAt !== null;
  const resolutionCompleted = resolutionCompletedAt !== null;

  const responseBreached = responseCompleted
    ? new Date(responseCompletedAt).getTime() > responseDueMs
    : !finished && nowMs > responseDueMs;
  const resolutionBreached = resolutionCompleted
    ? new Date(resolutionCompletedAt).getTime() > resolutionDueMs
    : !finished && nowMs > resolutionDueMs;

  let nextTarget: 'response' | 'resolution' | null = null;
  let nextDueAt: string | null = null;
  let overall: SlaState;

  if (finished) {
    overall = responseBreached || resolutionBreached ? 'overdue' : 'met';
  } else if (responseBreached || resolutionBreached) {
    overall = 'overdue';
  } else {
    nextTarget = responseCompleted ? 'resolution' : 'response';
    const targetPolicy = nextTarget === 'response' ? policy.responseMinutes : policy.resolutionMinutes;
    const targetDueMs = nextTarget === 'response' ? responseDueMs : resolutionDueMs;
    nextDueAt = new Date(targetDueMs).toISOString();
    overall = targetDueMs - nowMs <= breachThresholdMs(targetPolicy) ? 'due-soon' : 'on-track';
  }

  return {
    responseDueAt: new Date(responseDueMs).toISOString(),
    resolutionDueAt: new Date(resolutionDueMs).toISOString(),
    responseRemainingMs: responseDueMs - nowMs,
    resolutionRemainingMs: resolutionDueMs - nowMs,
    responseBreached,
    resolutionBreached,
    responseCompleted,
    resolutionCompleted,
    nextTarget,
    nextDueAt,
    overall,
  };
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.ceil(Math.abs(ms) / MINUTE_MS);
  if (totalMinutes < 1) {
    return '< 1 мин';
  }

  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days} д ${hours} ч`;
  }
  if (hours > 0) {
    return `${hours} ч ${minsWord(minutes)}`.replace(' 0 мин', '');
  }
  return `${minutes} мин`;
}

function minsWord(minutes: number): string {
  return `${minutes} мин`;
}

export function formatSlaRemaining(ms: number): string {
  if (ms >= 0) {
    return `Осталось ${formatDuration(ms)}`;
  }
  return `Просрочено на ${formatDuration(ms)}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} мин`;
  }
  const hours = minutes / 60;
  if (hours < 24) {
    const rounded = hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10;
    return `${String(rounded).replace('.', ',')} ч`;
  }
  const days = hours / 24;
  return `${String(Math.round(days * 10) / 10).replace('.', ',')} д`;
}

export function getSlaProgress(
  ticket: Ticket,
  now: Date = new Date(),
  policies: readonly SlaPolicy[] = DEFAULT_SLA_POLICIES,
): { response: number; resolution: number } {
  const policy = getSlaPolicy(ticket.priority, policies);
  const createdAt = new Date(ticket.createdAt).getTime();
  const nowMs = now.getTime();
  const responseEnd = ticket.firstRespondedAt
    ? new Date(ticket.firstRespondedAt).getTime()
    : nowMs;
  const resolutionEnd = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : nowMs;
  const clamp = (value: number): number => Math.min(1, Math.max(0, value));

  return {
    response: clamp(
      (responseEnd - createdAt) / (policy.responseMinutes * MINUTE_MS),
    ),
    resolution: clamp(
      (resolutionEnd - createdAt) / (policy.resolutionMinutes * MINUTE_MS),
    ),
  };
}
