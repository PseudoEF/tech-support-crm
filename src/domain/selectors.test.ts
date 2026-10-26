import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TICKET_FILTERS,
  filterKbArticles,
  filterTickets,
  getSlaHealth,
  getSnapshotCounts,
  getTicketFlowPerDay,
  getTicketsPerDay,
  sortTickets,
  summarizeTickets,
  type TicketFilterContext,
} from './selectors';
import { DEFAULT_SLA_POLICIES } from './sla';
import type { KbArticle, Ticket } from './types';

const NOW = new Date('2026-10-26T12:00:00.000Z');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'ticket-1',
    number: 'TS-1001',
    subject: 'Нет доступа к интернету',
    description: 'Роутер не подключается',
    clientId: 'client-1',
    assetId: 'asset-1',
    teamId: 'team-1',
    assigneeId: 'agent-1',
    status: 'new',
    priority: 'critical',
    channel: 'phone',
    tags: ['vpn', 'доступ'],
    createdAt: new Date(NOW.getTime() - 2 * HOUR).toISOString(),
    updatedAt: new Date(NOW.getTime() - HOUR).toISOString(),
    firstRespondedAt: null,
    resolvedAt: null,
    closedAt: null,
    ...overrides,
  };
}

const context: TicketFilterContext = {
  clientNameById: new Map([
    ['client-1', 'ООО «Северный ветер»'],
    ['client-2', 'Мария Смирнова'],
  ]),
  policies: DEFAULT_SLA_POLICIES,
  now: NOW,
};

const tickets = [
  ticket(),
  ticket({
    id: 'ticket-2',
    number: 'TS-1002',
    subject: 'Ошибка оплаты',
    description: 'Платёж не проходит',
    clientId: 'client-2',
    teamId: 'team-2',
    assigneeId: 'agent-2',
    status: 'open',
    priority: 'low',
    tags: ['биллинг'],
    createdAt: new Date(NOW.getTime() - 10 * MINUTE).toISOString(),
    updatedAt: new Date(NOW.getTime() - 5 * MINUTE).toISOString(),
  }),
  ticket({
    id: 'ticket-3',
    number: 'TS-0999',
    subject: 'Настройка статического IP',
    description: 'Нужен адрес для офиса',
    clientId: 'client-1',
    teamId: 'team-1',
    assigneeId: null,
    status: 'pending',
    priority: 'high',
    tags: ['b2b'],
    createdAt: new Date(NOW.getTime() - 3 * HOUR).toISOString(),
    updatedAt: new Date(NOW.getTime() - 30 * MINUTE).toISOString(),
    firstRespondedAt: new Date(NOW.getTime() - HOUR).toISOString(),
  }),
];

describe('filterTickets', () => {
  it('filters by status, priority, team and assignee', () => {
    expect(
      filterTickets(tickets, { ...DEFAULT_TICKET_FILTERS, status: 'pending' }, context),
    ).toHaveLength(1);
    expect(
      filterTickets(tickets, { ...DEFAULT_TICKET_FILTERS, priority: 'critical' }, context),
    ).toHaveLength(1);
    expect(
      filterTickets(tickets, { ...DEFAULT_TICKET_FILTERS, teamId: 'team-1' }, context),
    ).toHaveLength(2);
    expect(
      filterTickets(tickets, { ...DEFAULT_TICKET_FILTERS, assigneeId: 'agent-2' }, context),
    ).toHaveLength(1);
  });

  it('searches number, subject, description, client and tags', () => {
    const expectIds = (search: string, ids: string[]) => {
      const result = filterTickets(tickets, { ...DEFAULT_TICKET_FILTERS, search }, context);
      expect(result.map((item) => item.id).sort()).toEqual(ids);
    };

    expectIds('TS-1002', ['ticket-2']);
    expectIds('северный', ['ticket-1', 'ticket-3']);
    expectIds('платёж', ['ticket-2']);
    expectIds('vpn', ['ticket-1']);
    expectIds('b2b', ['ticket-3']);
  });

  it('filters by computed SLA state', () => {
    const overdue = filterTickets(
      tickets,
      { ...DEFAULT_TICKET_FILTERS, sla: 'overdue' },
      context,
    );
    expect(overdue.map((item) => item.id).sort()).toEqual(['ticket-1', 'ticket-3']);
  });

  it('does not mutate the source collection', () => {
    const before = tickets.map((item) => item.id);
    filterTickets(tickets, { ...DEFAULT_TICKET_FILTERS, search: 'интернет' }, context);
    expect(tickets.map((item) => item.id)).toEqual(before);
  });
});

describe('sortTickets', () => {
  it('sorts by priority and falls back to update time', () => {
    expect(
      sortTickets(tickets, 'priority-desc', context).map((item) => item.priority),
    ).toEqual(['critical', 'high', 'low']);
  });

  it('sorts by SLA urgency', () => {
    const result = sortTickets(tickets, 'sla-asc', context);
    expect(result[0]?.id).toBe('ticket-1');
    expect(result[result.length - 1]?.id).toBe('ticket-2');
  });

  it('sorts by number and creation date', () => {
    expect(sortTickets(tickets, 'number-asc', context).map((item) => item.number)).toEqual([
      'TS-0999',
      'TS-1001',
      'TS-1002',
    ]);
    expect(sortTickets(tickets, 'created-desc', context)[0]?.id).toBe('ticket-2');
  });

  it('does not mutate the source collection', () => {
    const before = tickets.map((item) => item.id);
    sortTickets(tickets, 'priority-desc', context);
    expect(tickets.map((item) => item.id)).toEqual(before);
  });
});

describe('summarizeTickets', () => {
  it('counts active, overdue, resolved and status totals', () => {
    const metrics = summarizeTickets(tickets, NOW, DEFAULT_SLA_POLICIES);
    expect(metrics.openTickets).toBe(3);
    expect(metrics.overdueTickets).toBe(2);
    expect(metrics.resolvedTickets).toBe(0);
    expect(metrics.byStatus.new).toBe(1);
    expect(metrics.byStatus.open).toBe(1);
    expect(metrics.byStatus.pending).toBe(1);
    expect(metrics.activeByPriority.critical).toBe(1);
  });

  it('computes first response and resolution averages', () => {
    const metrics = summarizeTickets(
      [
        ticket({ firstRespondedAt: new Date(NOW.getTime() - 90 * MINUTE).toISOString() }),
        ticket({
          id: 'ticket-2',
          status: 'resolved',
          firstRespondedAt: new Date(NOW.getTime() - 60 * MINUTE).toISOString(),
          resolvedAt: new Date(NOW.getTime() - 30 * MINUTE).toISOString(),
        }),
      ],
      NOW,
      DEFAULT_SLA_POLICIES,
    );
    expect(metrics.averageFirstResponseMinutes).toBe(45);
    expect(metrics.averageResolutionMinutes).toBe(90);
    expect(metrics.resolvedTickets).toBe(1);
  });

  it('returns null averages when no timestamps exist', () => {
    const metrics = summarizeTickets([], NOW, DEFAULT_SLA_POLICIES);
    expect(metrics.averageFirstResponseMinutes).toBeNull();
    expect(metrics.averageResolutionMinutes).toBeNull();
  });
});

describe('activity helpers', () => {
  it('creates one point per requested day', () => {
    const points = getTicketsPerDay(tickets, NOW, 7);
    expect(points).toHaveLength(7);
    expect(points.reduce((sum, point) => sum + point.count, 0)).toBe(3);
  });

  it('aggregates created and resolved ticket flow', () => {
    const flow = getTicketFlowPerDay(
      [
        ...tickets,
        ticket({
          id: 'ticket-4',
          status: 'resolved',
          resolvedAt: new Date(NOW.getTime() - HOUR).toISOString(),
        }),
      ],
      NOW,
      7,
    );

    expect(flow).toHaveLength(7);
    expect(flow.reduce((sum, point) => sum + point.created, 0)).toBe(4);
    expect(flow.reduce((sum, point) => sum + point.resolved, 0)).toBe(1);
  });

  it('computes SLA health across completed tickets', () => {
    const resolved = [
      ticket({
        id: 'ticket-ok',
        status: 'resolved',
        createdAt: new Date(NOW.getTime() - 3 * HOUR).toISOString(),
        firstRespondedAt: new Date(NOW.getTime() - 160 * MINUTE).toISOString(),
        resolvedAt: new Date(NOW.getTime() - 2 * HOUR).toISOString(),
      }),
      ticket({
        id: 'ticket-late',
        status: 'closed',
        createdAt: new Date(NOW.getTime() - 6 * HOUR).toISOString(),
        firstRespondedAt: new Date(NOW.getTime() - 5 * HOUR - 15 * MINUTE).toISOString(),
        closedAt: new Date(NOW.getTime() - 4 * HOUR).toISOString(),
      }),
    ];

    const health = getSlaHealth(resolved, NOW, DEFAULT_SLA_POLICIES);
    expect(health.compliance).toBe(50);
    expect(health.firstResponse).toBe(50);
    expect(health.resolution).toBe(100);
    expect(health.complianceMet).toBe(1);
    expect(health.complianceTotal).toBe(2);
  });

  it('filters knowledge-base articles by category and body text', () => {
    const articles: KbArticle[] = [
      {
        id: 'kb-1',
        slug: 'wifi',
        title: 'Wi-Fi не работает',
        category: 'Wi-Fi',
        excerpt: 'Диагностика Wi-Fi',
        tags: ['роутер'],
        sections: [
          {
            heading: 'Проверка',
            paragraphs: ['Перезагрузите роутер'],
            bullets: ['Проверьте индикатор'],
          },
        ],
        updatedAt: NOW.toISOString(),
        readMinutes: 3,
      },
      {
        id: 'kb-2',
        slug: 'billing',
        title: 'Платёж не прошёл',
        category: 'Оплата',
        excerpt: 'Проверка платежа',
        tags: ['биллинг'],
        sections: [{ heading: 'Причина', paragraphs: ['Банк отклонил операцию'] }],
        updatedAt: NOW.toISOString(),
        readMinutes: 4,
      },
    ];

    expect(filterKbArticles(articles, 'роутер', 'all')).toHaveLength(1);
    expect(filterKbArticles(articles, '', 'Оплата').map((item) => item.id)).toEqual(['kb-2']);
    expect(filterKbArticles(articles, 'банк', 'all')).toHaveLength(1);
  });

  it('returns snapshot collection counts', () => {
    expect(
      getSnapshotCounts({
        teams: [],
        agents: [],
        clients: [],
        assets: [],
        tickets: [],
        messages: [],
        kbArticles: [],
        slaPolicies: [],
        activities: [],
        seededAt: NOW.toISOString(),
      }),
    ).toEqual({
      tickets: 0,
      clients: 0,
      agents: 0,
      teams: 0,
      assets: 0,
      articles: 0,
      messages: 0,
      activities: 0,
    });
  });
});
