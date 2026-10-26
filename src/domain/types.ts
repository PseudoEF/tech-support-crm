export const PRIORITIES = ['critical', 'high', 'normal', 'low'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const TICKET_STATUSES = ['new', 'open', 'pending', 'resolved', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_CHANNELS = ['phone', 'email', 'chat', 'portal'] as const;
export type TicketChannel = (typeof TICKET_CHANNELS)[number];

export type ClientKind = 'individual' | 'business';
export type ClientStatus = 'active' | 'suspended';
export type AssetKind = 'router' | 'ont' | 'stb' | 'camera' | 'switch';
export type AssetStatus = 'online' | 'offline' | 'maintenance';
export type ActivityType =
  | 'ticket_created'
  | 'status_changed'
  | 'message_added'
  | 'note_added'
  | 'assigned'
  | 'priority_changed'
  | 'resolved'
  | 'tags_changed';

export interface Team {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId: string;
  online: boolean;
}

export interface Client {
  id: string;
  kind: ClientKind;
  name: string;
  company: string | null;
  contactName: string | null;
  email: string;
  phone: string;
  address: string;
  accountNumber: string;
  tariff: string;
  balance: number;
  status: ClientStatus;
  createdAt: string;
  notes: string;
}

export interface Asset {
  id: string;
  clientId: string;
  kind: AssetKind;
  model: string;
  serial: string;
  installedAt: string;
  status: AssetStatus;
  ipAddress: string;
  firmware: string;
}

export interface Ticket {
  id: string;
  number: string;
  subject: string;
  description: string;
  clientId: string;
  assetId: string | null;
  teamId: string;
  assigneeId: string | null;
  status: TicketStatus;
  priority: Priority;
  channel: TicketChannel;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
}

export interface Message {
  id: string;
  ticketId: string;
  authorType: 'client' | 'agent' | 'system';
  authorId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
  internal: boolean;
}

export interface KbSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface KbArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  tags: string[];
  sections: KbSection[];
  updatedAt: string;
  readMinutes: number;
}

export interface SlaPolicy {
  priority: Priority;
  responseMinutes: number;
  resolutionMinutes: number;
}

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  ticketId: string | null;
  clientId: string | null;
  actorName: string;
  text: string;
  createdAt: string;
}

export interface CrmSnapshot {
  teams: Team[];
  agents: Agent[];
  clients: Client[];
  assets: Asset[];
  tickets: Ticket[];
  messages: Message[];
  kbArticles: KbArticle[];
  slaPolicies: SlaPolicy[];
  activities: ActivityEvent[];
  seededAt: string;
}

export interface DemoMeta {
  key: string;
  value: string;
}
