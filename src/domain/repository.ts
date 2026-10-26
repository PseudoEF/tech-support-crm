import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { generateDemoData } from './seed';
import type {
  ActivityEvent,
  Agent,
  Asset,
  Client,
  CrmSnapshot,
  DemoMeta,
  KbArticle,
  Message,
  SlaPolicy,
  Team,
  Ticket,
} from './types';

const DB_NAME = 'techsupport-crm-demo';
const DB_VERSION = 1;
const SEEDED_AT_KEY = 'seededAt';

interface CrmDatabase extends DBSchema {
  teams: {
    key: string;
    value: Team;
  };
  agents: {
    key: string;
    value: Agent;
  };
  clients: {
    key: string;
    value: Client;
    indexes: { 'by-kind': string };
  };
  assets: {
    key: string;
    value: Asset;
    indexes: { 'by-client': string };
  };
  tickets: {
    key: string;
    value: Ticket;
    indexes: { 'by-status': string; 'by-assignee': string };
  };
  messages: {
    key: string;
    value: Message;
    indexes: { 'by-ticket': string };
  };
  kbArticles: {
    key: string;
    value: KbArticle;
  };
  slaPolicies: {
    key: string;
    value: SlaPolicy;
  };
  activities: {
    key: string;
    value: ActivityEvent;
  };
  meta: {
    key: string;
    value: DemoMeta;
  };
}

let databasePromise: Promise<IDBPDatabase<CrmDatabase>> | null = null;
let seedingPromise: Promise<void> | null = null;

function openDatabase(): Promise<IDBPDatabase<CrmDatabase>> {
  databasePromise ??= openDB<CrmDatabase>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      database.createObjectStore('teams', { keyPath: 'id' });
      database.createObjectStore('agents', { keyPath: 'id' });
      const clients = database.createObjectStore('clients', { keyPath: 'id' });
      clients.createIndex('by-kind', 'kind');
      const assets = database.createObjectStore('assets', { keyPath: 'id' });
      assets.createIndex('by-client', 'clientId');
      const tickets = database.createObjectStore('tickets', { keyPath: 'id' });
      tickets.createIndex('by-status', 'status');
      tickets.createIndex('by-assignee', 'assigneeId');
      const messages = database.createObjectStore('messages', { keyPath: 'id' });
      messages.createIndex('by-ticket', 'ticketId');
      database.createObjectStore('kbArticles', { keyPath: 'id' });
      database.createObjectStore('slaPolicies', { keyPath: 'priority' });
      database.createObjectStore('activities', { keyPath: 'id' });
      database.createObjectStore('meta', { keyPath: 'key' });
    },
    blocked() {
      console.warn('Techsupport CRM: database upgrade is blocked by another tab.');
    },
    blocking() {
      databasePromise?.then((database) => database.close()).catch(() => undefined);
      databasePromise = null;
    },
  });
  return databasePromise;
}

async function writeSnapshot(
  database: IDBPDatabase<CrmDatabase>,
  snapshot: CrmSnapshot,
): Promise<void> {
  const transaction = database.transaction(
    [
      'teams',
      'agents',
      'clients',
      'assets',
      'tickets',
      'messages',
      'kbArticles',
      'slaPolicies',
      'activities',
      'meta',
    ],
    'readwrite',
  );

  void transaction.objectStore('teams').clear();
  void transaction.objectStore('agents').clear();
  void transaction.objectStore('clients').clear();
  void transaction.objectStore('assets').clear();
  void transaction.objectStore('tickets').clear();
  void transaction.objectStore('messages').clear();
  void transaction.objectStore('kbArticles').clear();
  void transaction.objectStore('slaPolicies').clear();
  void transaction.objectStore('activities').clear();
  void transaction.objectStore('meta').clear();

  snapshot.teams.forEach((team) => {
    void transaction.objectStore('teams').put(team);
  });
  snapshot.agents.forEach((agent) => {
    void transaction.objectStore('agents').put(agent);
  });
  snapshot.clients.forEach((client) => {
    void transaction.objectStore('clients').put(client);
  });
  snapshot.assets.forEach((asset) => {
    void transaction.objectStore('assets').put(asset);
  });
  snapshot.tickets.forEach((ticket) => {
    void transaction.objectStore('tickets').put(ticket);
  });
  snapshot.messages.forEach((message) => {
    void transaction.objectStore('messages').put(message);
  });
  snapshot.kbArticles.forEach((article) => {
    void transaction.objectStore('kbArticles').put(article);
  });
  snapshot.slaPolicies.forEach((policy) => {
    void transaction.objectStore('slaPolicies').put(policy);
  });
  snapshot.activities.forEach((activity) => {
    void transaction.objectStore('activities').put(activity);
  });
  void transaction.objectStore('meta').put({
    key: SEEDED_AT_KEY,
    value: snapshot.seededAt,
  });

  await transaction.done;
}

async function ensureSeeded(database: IDBPDatabase<CrmDatabase>): Promise<void> {
  const seededAt = await database.get('meta', SEEDED_AT_KEY);
  const ticketCount = await database.count('tickets');
  if (seededAt && ticketCount > 0) return;

  if (!seedingPromise) {
    seedingPromise = (async () => {
      const snapshot = generateDemoData();
      await writeSnapshot(database, snapshot);
    })().finally(() => {
      seedingPromise = null;
    });
  }
  await seedingPromise;
}

async function readSnapshot(database: IDBPDatabase<CrmDatabase>): Promise<CrmSnapshot> {
  const transaction = database.transaction(
    [
      'teams',
      'agents',
      'clients',
      'assets',
      'tickets',
      'messages',
      'kbArticles',
      'slaPolicies',
      'activities',
      'meta',
    ],
    'readonly',
  );

  const [
    teams,
    agents,
    clients,
    assets,
    tickets,
    messages,
    kbArticles,
    slaPolicies,
    activities,
    seededMeta,
  ] = await Promise.all([
    transaction.objectStore('teams').getAll(),
    transaction.objectStore('agents').getAll(),
    transaction.objectStore('clients').getAll(),
    transaction.objectStore('assets').getAll(),
    transaction.objectStore('tickets').getAll(),
    transaction.objectStore('messages').getAll(),
    transaction.objectStore('kbArticles').getAll(),
    transaction.objectStore('slaPolicies').getAll(),
    transaction.objectStore('activities').getAll(),
    transaction.objectStore('meta').get(SEEDED_AT_KEY),
  ]);

  await transaction.done;

  return {
    teams,
    agents,
    clients,
    assets,
    tickets,
    messages,
    kbArticles,
    slaPolicies,
    activities,
    seededAt: seededMeta?.value ?? new Date().toISOString(),
  };
}

export async function loadSnapshot(): Promise<CrmSnapshot> {
  const database = await openDatabase();
  await ensureSeeded(database);
  return readSnapshot(database);
}

export async function resetDemo(): Promise<CrmSnapshot> {
  const database = await openDatabase();
  const snapshot = generateDemoData();
  await writeSnapshot(database, snapshot);
  return readSnapshot(database);
}

export interface TicketCommit {
  ticket: Ticket;
  messages: Message[];
  activity: ActivityEvent;
}

export async function commitTicket(commit: TicketCommit): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(
    ['tickets', 'messages', 'activities'],
    'readwrite',
  );
  void transaction.objectStore('tickets').put(commit.ticket);
  commit.messages.forEach((message) => {
    void transaction.objectStore('messages').put(message);
  });
  void transaction.objectStore('activities').put(commit.activity);
  await transaction.done;
}

export const demoRepository = {
  loadSnapshot,
  resetDemo,
  commitTicket,
};
