import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SLA_POLICIES,
  computeSla,
  formatDuration,
  formatMinutes,
  formatSlaRemaining,
  getSlaPolicy,
  getSlaProgress,
} from './sla';
import type { Ticket } from './types';

const NOW = new Date('2026-10-26T12:00:00.000Z');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'ticket-test',
    number: 'TS-9001',
    subject: 'Тестовая заявка',
    description: 'Описание',
    clientId: 'client-01',
    assetId: null,
    teamId: 'team-1',
    assigneeId: 'agent-1',
    status: 'open',
    priority: 'critical',
    channel: 'phone',
    tags: [],
    createdAt: new Date(NOW.getTime() - 5 * MINUTE).toISOString(),
    updatedAt: new Date(NOW.getTime() - MINUTE).toISOString(),
    firstRespondedAt: null,
    resolvedAt: null,
    closedAt: null,
    ...overrides,
  };
}

describe('SLA policies', () => {
  it('has one policy for every supported priority', () => {
    expect(DEFAULT_SLA_POLICIES.map((policy) => policy.priority)).toEqual([
      'critical',
      'high',
      'normal',
      'low',
    ]);
    expect(getSlaPolicy('critical').resolutionMinutes).toBe(240);
  });

  it('throws for a missing policy', () => {
    expect(() => getSlaPolicy('high', [])).toThrow(/No SLA policy/);
  });
});

describe('computeSla', () => {
  it('marks an active ticket on track when there is enough time', () => {
    const result = computeSla(ticket(), NOW);
    expect(result.overall).toBe('on-track');
    expect(result.nextTarget).toBe('response');
    expect(result.responseCompleted).toBe(false);
    expect(result.responseBreached).toBe(false);
    expect(result.responseRemainingMs).toBe(25 * MINUTE);
    expect(result.responseDueAt).toBe('2026-10-26T12:25:00.000Z');
  });

  it('marks a ticket due soon inside the warning threshold', () => {
    const result = computeSla(
      ticket({ createdAt: new Date(NOW.getTime() - 25 * MINUTE).toISOString() }),
      NOW,
    );
    expect(result.overall).toBe('due-soon');
    expect(result.responseRemainingMs).toBe(5 * MINUTE);
  });

  it('marks an unresolved ticket overdue after the response target', () => {
    const result = computeSla(
      ticket({ createdAt: new Date(NOW.getTime() - 31 * MINUTE).toISOString() }),
      NOW,
    );
    expect(result.overall).toBe('overdue');
    expect(result.responseBreached).toBe(true);
    expect(result.resolutionBreached).toBe(false);
  });

  it('uses the resolution target after the first response', () => {
    const result = computeSla(
      ticket({
        firstRespondedAt: new Date(NOW.getTime() - 10 * MINUTE).toISOString(),
      }),
      NOW,
    );
    expect(result.responseCompleted).toBe(true);
    expect(result.nextTarget).toBe('resolution');
    expect(result.overall).toBe('on-track');
  });

  it('reports a met SLA for a resolved ticket completed on time', () => {
    const result = computeSla(
      ticket({
        status: 'resolved',
        firstRespondedAt: new Date(NOW.getTime() - 2 * HOUR + 10 * MINUTE).toISOString(),
        resolvedAt: new Date(NOW.getTime() - 2 * HOUR + 50 * MINUTE).toISOString(),
      }),
      NOW,
    );
    expect(result.overall).toBe('met');
    expect(result.resolutionCompleted).toBe(true);
  });

  it('keeps a breach for a resolved ticket that missed its target', () => {
    const result = computeSla(
      ticket({
        status: 'resolved',
        createdAt: new Date(NOW.getTime() - 3 * HOUR).toISOString(),
        firstRespondedAt: new Date(NOW.getTime() - 2 * HOUR + 40 * MINUTE).toISOString(),
        resolvedAt: new Date(NOW.getTime() - 2 * HOUR + 50 * MINUTE).toISOString(),
      }),
      NOW,
    );
    expect(result.overall).toBe('overdue');
    expect(result.responseBreached).toBe(true);
  });

  it('computes progress for response and resolution targets', () => {
    const result = getSlaProgress(
      ticket({
        createdAt: new Date(NOW.getTime() - 30 * MINUTE).toISOString(),
        firstRespondedAt: new Date(NOW.getTime() - 18 * MINUTE).toISOString(),
      }),
      NOW,
    );
    expect(result.response).toBeCloseTo(0.4);
    expect(result.resolution).toBeCloseTo(0.125);
  });
});

describe('SLA formatting', () => {
  it('formats durations in Russian', () => {
    expect(formatDuration(0)).toBe('< 1 мин');
    expect(formatDuration(30 * MINUTE)).toBe('30 мин');
    expect(formatDuration(2 * HOUR)).toBe('2 ч');
    expect(formatDuration(2 * HOUR + 5 * MINUTE)).toBe('2 ч 5 мин');
    expect(formatDuration(24 * HOUR + 2 * HOUR)).toBe('1 д 2 ч');
  });

  it('formats remaining and overdue labels', () => {
    expect(formatSlaRemaining(2 * HOUR)).toBe('Осталось 2 ч');
    expect(formatSlaRemaining(-30 * MINUTE)).toBe('Просрочено на 30 мин');
  });

  it('formats average minutes compactly', () => {
    expect(formatMinutes(45)).toBe('45 мин');
    expect(formatMinutes(90)).toBe('1,5 ч');
    expect(formatMinutes(48 * 60)).toBe('2 д');
  });
});
