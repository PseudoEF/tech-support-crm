import type { TicketSort } from './selectors';
import type { SlaState } from './sla';
import { PRIORITIES, TICKET_STATUSES, type Priority, type TicketStatus } from './types';

export function isPriority(value: string): value is Priority {
  return PRIORITIES.some((priority) => priority === value);
}

export function isTicketStatus(value: string): value is TicketStatus {
  return TICKET_STATUSES.some((status) => status === value);
}

export function isSlaState(value: string): value is SlaState {
  return value === 'overdue' || value === 'due-soon' || value === 'on-track' || value === 'met';
}

export function isSlaFilter(value: string): value is SlaState | 'all' {
  return value === 'all' || isSlaState(value);
}

export function isTicketSort(value: string): value is TicketSort {
  return (
    value === 'updated-desc' ||
    value === 'created-desc' ||
    value === 'priority-desc' ||
    value === 'sla-asc' ||
    value === 'number-asc'
  );
}

export function isAgentId(value: string, agentIds: ReadonlySet<string>): boolean {
  return value === '' || agentIds.has(value);
}
