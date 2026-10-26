import { describe, expect, it } from 'vitest';
import { DEMO_SEED, generateDemoData } from './seed';
import type { CrmSnapshot, Ticket } from './types';

const NOW = new Date('2026-10-26T12:00:00.000Z');

function active(ticket: Ticket): boolean {
  return ticket.status === 'new' || ticket.status === 'open' || ticket.status === 'pending';
}

describe('generateDemoData', () => {
  const data = generateDemoData({ now: NOW });

  it('creates the documented amount of demo data', () => {
    expect(data.teams).toHaveLength(4);
    expect(data.agents).toHaveLength(8);
    expect(data.clients).toHaveLength(35);
    expect(data.assets).toHaveLength(12);
    expect(data.tickets).toHaveLength(120);
    expect(data.kbArticles).toHaveLength(10);
    expect(data.slaPolicies).toHaveLength(4);
    expect(data.messages.length).toBeGreaterThan(200);
    expect(data.activities.length).toBeGreaterThan(120);
  });

  it('uses stable identifiers and ticket numbers', () => {
    expect(data.agents[0]?.id).toBe('agent-1');
    expect(data.clients[0]?.id).toBe('client-01');
    const numbers = data.tickets.map((ticket) => Number(ticket.number.replace('TS-', '')));
    expect(Math.min(...numbers)).toBe(2400);
    expect(Math.max(...numbers)).toBe(2519);
    expect(new Set(numbers).size).toBe(120);
    expect(new Set(data.tickets.map((ticket) => ticket.id)).size).toBe(120);
  });

  it('includes a realistic mix of statuses and SLA states', () => {
    const byStatus = new Map<string, number>();
    data.tickets.forEach((ticket) => {
      byStatus.set(ticket.status, (byStatus.get(ticket.status) ?? 0) + 1);
    });

    expect(byStatus.get('new')).toBe(14);
    expect(byStatus.get('open')).toBe(32);
    expect(byStatus.get('pending')).toBe(18);
    expect(byStatus.get('resolved')).toBe(38);
    expect(byStatus.get('closed')).toBe(18);
    expect(data.tickets.filter((ticket) => !active(ticket)).length).toBe(56);
  });

  it('keeps every reference valid', () => {
    const clientIds = new Set(data.clients.map((client) => client.id));
    const teamIds = new Set(data.teams.map((team) => team.id));
    const agentIds = new Set(data.agents.map((agent) => agent.id));
    const assetIds = new Set(data.assets.map((asset) => asset.id));
    const ticketIds = new Set(data.tickets.map((ticket) => ticket.id));

    data.assets.forEach((asset) => expect(clientIds.has(asset.clientId)).toBe(true));
    data.tickets.forEach((ticket) => {
      expect(clientIds.has(ticket.clientId)).toBe(true);
      expect(teamIds.has(ticket.teamId)).toBe(true);
      if (ticket.assigneeId) expect(agentIds.has(ticket.assigneeId)).toBe(true);
      if (ticket.assetId) expect(assetIds.has(ticket.assetId)).toBe(true);
    });
    data.messages.forEach((message) => expect(ticketIds.has(message.ticketId)).toBe(true));
    data.activities.forEach((activity) => {
      if (activity.ticketId) expect(ticketIds.has(activity.ticketId)).toBe(true);
      if (activity.clientId) expect(clientIds.has(activity.clientId)).toBe(true);
    });
  });

  it('keeps ticket and message timelines coherent', () => {
    const ticketsById = new Map(data.tickets.map((ticket) => [ticket.id, ticket]));
    data.tickets.forEach((ticket) => {
      const created = new Date(ticket.createdAt).getTime();
      const updated = new Date(ticket.updatedAt).getTime();
      expect(updated).toBeGreaterThanOrEqual(created);

      if (ticket.firstRespondedAt) {
        expect(new Date(ticket.firstRespondedAt).getTime()).toBeGreaterThanOrEqual(created);
      }
      if (ticket.resolvedAt) {
        expect(new Date(ticket.resolvedAt).getTime()).toBeGreaterThanOrEqual(created);
      }
      if (ticket.closedAt) {
        expect(new Date(ticket.closedAt).getTime()).toBeGreaterThanOrEqual(created);
      }
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        expect(ticket.resolvedAt).not.toBeNull();
      }
    });

    data.messages.forEach((message) => {
      const parent = ticketsById.get(message.ticketId);
      expect(parent).toBeDefined();
      if (!parent) return;
      const created = new Date(parent.createdAt).getTime();
      const messageAt = new Date(message.createdAt).getTime();
      expect(messageAt).toBeGreaterThanOrEqual(created);
      expect(messageAt).toBeLessThanOrEqual(new Date(parent.updatedAt).getTime());
    });
  });

  it('is deterministic for the same seed and clock', () => {
    const again = generateDemoData({ seed: DEMO_SEED, now: NOW });
    expect(again).toStrictEqual(data);
  });

  it('generates different records for a different seed', () => {
    const other = generateDemoData({ seed: DEMO_SEED + 1, now: NOW });
    expect(other.tickets.map((ticket) => ticket.id)).not.toEqual(
      data.tickets.map((ticket) => ticket.id),
    );
  });

  it('returns a complete snapshot shape', () => {
    const keys: Array<keyof CrmSnapshot> = [
      'teams',
      'agents',
      'clients',
      'assets',
      'tickets',
      'messages',
      'kbArticles',
      'slaPolicies',
      'activities',
      'seededAt',
    ];
    keys.forEach((key) => expect(data[key]).toBeDefined());
    expect(new Date(data.seededAt).toISOString()).toBe(data.seededAt);
  });
});
