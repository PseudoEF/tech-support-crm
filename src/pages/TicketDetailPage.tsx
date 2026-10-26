import {
  Fragment,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { format } from 'date-fns';
import {
  computeSla,
  formatDuration,
  formatSlaRemaining,
  getSlaPolicy,
  getSlaProgress,
} from '../domain/sla';
import {
  ASSET_KIND_LABELS,
  ASSET_STATUS_LABELS,
  CHANNEL_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  pluralRu,
} from '../domain/labels';
import { isPriority, isTicketStatus } from '../domain/guards';
import type {
  ActivityEvent,
  ActivityType,
  Message,
  Ticket,
  TicketStatus,
} from '../domain/types';
import { createId } from '../lib/ids';
import {
  formatDate,
  formatDateTime,
  formatRelative,
  formatShortDateTime,
  formatTime,
} from '../lib/format';
import { routeHref } from '../lib/router';
import { useCrm, useCrmData } from '../state/CrmContext';
import { useToast } from '../state/ToastContext';
import { useNow } from '../lib/useNow';
import { Avatar } from '../components/Avatar';
import { PriorityBadge, SlaBadge, StatusBadge, TagChip } from '../components/Badges';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';

interface TicketDetailPageProps {
  ticketId: string;
}

type ComposerMode = 'reply' | 'note';

function targetState(
  completed: boolean,
  breached: boolean,
  remaining: number,
): { label: string; className: string } {
  if (completed) {
    return breached
      ? { label: 'Нарушен', className: 'is-overdue' }
      : { label: 'Соблюдён', className: 'is-met' };
  }
  if (remaining < 0) return { label: 'Просрочен', className: 'is-overdue' };
  if (remaining < 30 * 60_000) return { label: 'Скоро дедлайн', className: 'is-soon' };
  return { label: 'В работе', className: 'is-active' };
}

export function TicketDetailPage({ ticketId }: TicketDetailPageProps) {
  const data = useCrmData();
  const { saveTicket } = useCrm();
  const { notify } = useToast();
  const now = useNow(15_000);
  const [composerMode, setComposerMode] = useState<ComposerMode>('reply');
  const [draft, setDraft] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const foundTicket = data.tickets.find((item) => item.id === ticketId);
  const currentAgent =
    data.agents.find((agent) => agent.id === 'agent-1') ?? data.agents[0];
  const actorName = currentAgent?.name ?? 'Сотрудник';
  const actorId = currentAgent?.id ?? null;

  const messages = useMemo(
    () =>
      data.messages
        .filter((message) => message.ticketId === ticketId)
        .sort(
          (left, right) =>
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        ),
    [data.messages, ticketId],
  );

  if (!foundTicket) {
    return (
      <div className="page">
        <PageHeader title="Заявка не найдена" description={`Идентификатор: ${ticketId}`} />
        <div className="card">
          <EmptyState
            icon="tickets"
            title="Такой заявки нет"
            description="Возможно, демо-данные были сброшены или ссылка устарела."
            action={
              <a href={routeHref.tickets} className="button button-primary">
                Вернуться к заявкам
              </a>
            }
          />
        </div>
      </div>
    );
  }

  const ticket = foundTicket;
  const client = data.clients.find((item) => item.id === ticket.clientId);
  const team = data.teams.find((item) => item.id === ticket.teamId);
  const assignee = ticket.assigneeId
    ? data.agents.find((agent) => agent.id === ticket.assigneeId)
    : undefined;
  const asset = ticket.assetId
    ? data.assets.find((item) => item.id === ticket.assetId)
    : undefined;
  const agentById = new Map(data.agents.map((agent) => [agent.id, agent]));
  const sla = computeSla(ticket, now, data.slaPolicies);
  const policy = getSlaPolicy(ticket.priority, data.slaPolicies);
  const progress = getSlaProgress(ticket, now, data.slaPolicies);
  const clientTicketCount = data.tickets.filter(
    (item) => item.clientId === ticket.clientId,
  ).length;
  const clientOpenCount = data.tickets.filter(
    (item) =>
      item.clientId === ticket.clientId &&
      (item.status === 'new' || item.status === 'open' || item.status === 'pending'),
  ).length;

  const responseState = targetState(
    sla.responseCompleted,
    sla.responseBreached,
    sla.responseRemainingMs,
  );
  const resolutionState = targetState(
    sla.resolutionCompleted,
    sla.resolutionBreached,
    sla.resolutionRemainingMs,
  );

  async function commitUpdate(
    patch: Partial<Ticket>,
    type: ActivityType,
    text: string,
    newMessages: Message[] = [],
  ): Promise<boolean> {
    if (saving) return false;
    setSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const activity: ActivityEvent = {
        id: createId('activity'),
        type,
        ticketId: ticket.id,
        clientId: ticket.clientId,
        actorName,
        text,
        createdAt: timestamp,
      };
      await saveTicket({
        ticket: { ...ticket, ...patch, updatedAt: timestamp },
        messages: newMessages,
        activity,
      });
      return true;
    } catch (error) {
      console.error('Failed to persist ticket update', error);
      notify('Не удалось сохранить изменения в IndexedDB', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: TicketStatus) {
    if (status === ticket.status) return;
    const timestamp = new Date().toISOString();
    const patch: Partial<Ticket> = { status };
    if (status === 'resolved') {
      patch.resolvedAt = ticket.resolvedAt ?? timestamp;
      patch.closedAt = null;
    } else if (status === 'closed') {
      patch.resolvedAt = ticket.resolvedAt ?? timestamp;
      patch.closedAt = ticket.closedAt ?? timestamp;
    } else {
      patch.resolvedAt = null;
      patch.closedAt = null;
    }
    const saved = await commitUpdate(
      patch,
      status === 'resolved' ? 'resolved' : 'status_changed',
      `Статус изменён на «${STATUS_LABELS[status]}»`,
    );
    if (saved) notify(`Статус: ${STATUS_LABELS[status].toLowerCase()}`);
  }

  async function handlePriorityChange(priority: string) {
    if (!isPriority(priority) || priority === ticket.priority) return;
    const saved = await commitUpdate(
      { priority },
      'priority_changed',
      `Приоритет изменён на «${PRIORITY_LABELS[priority]}»`,
    );
    if (saved) notify(`Приоритет: ${PRIORITY_LABELS[priority].toLowerCase()}`);
  }

  async function handleAssigneeChange(assigneeId: string) {
    if (assigneeId !== '' && !agentById.has(assigneeId)) return;
    const nextId = assigneeId === '' ? null : assigneeId;
    if (nextId === ticket.assigneeId) return;
    const nextAgent = nextId ? agentById.get(nextId) : undefined;
    const saved = await commitUpdate(
      { assigneeId: nextId },
      'assigned',
      nextAgent
        ? `Заявка назначена на ${nextAgent.name}`
        : 'Исполнитель снят с заявки',
    );
    if (saved) {
      notify(nextAgent ? `Назначено: ${nextAgent.name}` : 'Исполнитель снят');
    }
  }

  async function addTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tag = tagDraft.trim().toLowerCase();
    if (!tag) return;
    if (ticket.tags.some((item) => item.toLowerCase() === tag)) {
      notify('Такой тег уже добавлен', 'info');
      return;
    }
    if (ticket.tags.length >= 8) {
      notify('Можно добавить не более 8 тегов', 'info');
      return;
    }
    const saved = await commitUpdate(
      { tags: [...ticket.tags, tag] },
      'tags_changed',
      `Добавлен тег «${tag}»`,
    );
    if (saved) {
      setTagDraft('');
      notify('Тег добавлен');
    }
  }

  async function removeTag(tag: string) {
    const saved = await commitUpdate(
      { tags: ticket.tags.filter((item) => item !== tag) },
      'tags_changed',
      `Удалён тег «${tag}»`,
    );
    if (saved) notify('Тег удалён');
  }

  async function copyLink() {
    if (!navigator.clipboard) {
      notify('Буфер обмена недоступен в этом браузере', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify('Ссылка на заявку скопирована');
    } catch {
      notify('Не удалось скопировать ссылку', 'error');
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || saving) return;
    const timestamp = new Date().toISOString();
    const isReply = composerMode === 'reply';
    const newMessage: Message = {
      id: createId('message'),
      ticketId: ticket.id,
      authorType: 'agent',
      authorId: actorId,
      authorName: actorName,
      body,
      createdAt: timestamp,
      internal: !isReply,
    };
    const patch: Partial<Ticket> = {};
    if (isReply) {
      if (!ticket.firstRespondedAt) patch.firstRespondedAt = timestamp;
      if (ticket.status === 'new') patch.status = 'open';
    }
    const saved = await commitUpdate(
      patch,
      isReply ? 'message_added' : 'note_added',
      isReply
        ? `Ответ клиенту по заявке ${ticket.number}`
        : `Внутренняя заметка к заявке ${ticket.number}`,
      [newMessage],
    );
    if (saved) {
      setDraft('');
      notify(isReply ? 'Ответ отправлен' : 'Внутренняя заметка добавлена');
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="page ticket-detail-page">
      <nav className="breadcrumbs" aria-label="Хлебные крошки">
        <a href={routeHref.tickets}>Заявки</a>
        <Icon name="chevron-right" size={13} />
        <span aria-current="page">{ticket.number}</span>
      </nav>

      <header className="ticket-detail-head">
        <div className="ticket-title-block">
          <div className="ticket-kicker">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <span className="channel-label">
              <Icon name="message" size={14} />
              {CHANNEL_LABELS[ticket.channel]}
            </span>
          </div>
          <h1>{ticket.subject}</h1>
          <div className="ticket-head-meta">
            <span>№ {ticket.number}</span>
            <span aria-hidden="true">·</span>
            <span>Создана {formatDateTime(ticket.createdAt)}</span>
            <span aria-hidden="true">·</span>
            <span>Обновлена {formatRelative(ticket.updatedAt, now)}</span>
          </div>
        </div>
        <div className="ticket-head-actions">
          <button type="button" className="button button-ghost" onClick={copyLink}>
            <Icon name="copy" size={16} />
            Ссылка
          </button>
          <a href={routeHref.client(ticket.clientId)} className="button button-secondary">
            <Icon name="user" size={16} />
            Клиент
          </a>
        </div>
      </header>

      <div className="ticket-detail-grid">
        <div className="ticket-main-column">
          <section className="card conversation-card" aria-labelledby="conversation-title">
            <header className="card-header conversation-header">
              <div>
                <h2 id="conversation-title">Переписка</h2>
                <p>
                  {messages.length}{' '}
                  {pluralRu(messages.length, 'сообщение', 'сообщения', 'сообщений')} в заявке
                </p>
              </div>
              <span className="conversation-participants">
                <Avatar name={client?.name ?? 'Клиент'} size={26} />
                {assignee ? <Avatar name={assignee.name} size={26} /> : null}
              </span>
            </header>

            <div className="thread">
              {messages.map((message, index) => {
                const dayKey = format(new Date(message.createdAt), 'yyyy-MM-dd');
                const previousMessage = messages[index - 1];
                const showDay =
                  !previousMessage ||
                  format(new Date(previousMessage.createdAt), 'yyyy-MM-dd') !== dayKey;

                if (message.authorType === 'system') {
                  return (
                    <Fragment key={message.id}>
                      {showDay ? (
                        <div className="thread-day">
                          <span>{formatDate(message.createdAt)}</span>
                        </div>
                      ) : null}
                      <div className="thread-system">
                        <Icon name="info" size={14} />
                        <span>{message.body}</span>
                        <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
                      </div>
                    </Fragment>
                  );
                }

                const isClient = message.authorType === 'client';
                return (
                  <Fragment key={message.id}>
                    {showDay ? (
                      <div className="thread-day">
                        <span>{formatDate(message.createdAt)}</span>
                      </div>
                    ) : null}
                    <article
                      className={`thread-message ${
                        message.internal
                          ? 'thread-internal'
                          : isClient
                            ? 'thread-from-client'
                            : 'thread-from-agent'
                      }`}
                    >
                      <Avatar name={message.authorName} size={34} />
                      <div className="thread-message-body">
                        <header className="thread-message-head">
                          <strong>{message.authorName}</strong>
                          <span className={message.internal ? 'role-note' : 'role-label'}>
                            {message.internal ? (
                              <>
                                <Icon name="lock" size={12} /> Внутренняя заметка
                              </>
                            ) : isClient ? (
                              'Клиент'
                            ) : (
                              'Сотрудник поддержки'
                            )}
                          </span>
                          <time dateTime={message.createdAt}>
                            {formatTime(message.createdAt)}
                          </time>
                        </header>
                        <p>{message.body}</p>
                      </div>
                    </article>
                  </Fragment>
                );
              })}
            </div>

            <form className="composer" onSubmit={sendMessage}>
              <div className="composer-top">
                <div className="composer-modes" role="group" aria-label="Тип сообщения">
                  <button
                    type="button"
                    className={composerMode === 'reply' ? 'is-active' : ''}
                    aria-pressed={composerMode === 'reply'}
                    onClick={() => setComposerMode('reply')}
                  >
                    <Icon name="send" size={14} />
                    Ответ клиенту
                  </button>
                  <button
                    type="button"
                    className={composerMode === 'note' ? 'is-active' : ''}
                    aria-pressed={composerMode === 'note'}
                    onClick={() => setComposerMode('note')}
                  >
                    <Icon name="lock" size={14} />
                    Внутренняя заметка
                  </button>
                </div>
                <span className="composer-author">
                  от {actorName}
                </span>
              </div>

              {composerMode === 'note' ? (
                <p className="composer-notice">
                  <Icon name="lock" size={14} />
                  Заметку видят только сотрудники. Клиент не получит уведомление.
                </p>
              ) : null}

              <label className="sr-only" htmlFor="composer-text">
                {composerMode === 'reply' ? 'Текст ответа клиенту' : 'Текст внутренней заметки'}
              </label>
              <textarea
                id="composer-text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                rows={4}
                maxLength={2000}
                placeholder={
                  composerMode === 'reply'
                    ? 'Напишите ответ клиенту. Ctrl+Enter — отправить.'
                    : 'Зафиксируйте диагностику или договорённости для команды.'
                }
              />
              <div className="composer-footer">
                <span>{draft.length} / 2000</span>
                <div className="composer-actions">
                  <span className="composer-hint">Ctrl+Enter</span>
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={draft.trim().length === 0 || saving}
                  >
                    {saving ? (
                      <span className="spinner" aria-hidden="true" />
                    ) : (
                      <Icon name={composerMode === 'reply' ? 'send' : 'lock'} size={15} />
                    )}
                    {composerMode === 'reply' ? 'Отправить ответ' : 'Добавить заметку'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>

        <aside className="ticket-side" aria-label="Свойства заявки">
          <section className="card property-card">
            <header className="card-header">
              <div>
                <h2>Свойства</h2>
                <p>Изменения сохраняются сразу</p>
              </div>
              {saving ? <span className="saving-label">Сохраняем…</span> : null}
            </header>

            <label className="property-field">
              <span>Статус</span>
              <select
                value={ticket.status}
                disabled={saving}
                onChange={(event) => {
                  const value = event.target.value;
                  if (isTicketStatus(value)) void handleStatusChange(value);
                }}
              >
                <option value="new">Новая</option>
                <option value="open">В работе</option>
                <option value="pending">Ожидает</option>
                <option value="resolved">Решена</option>
                <option value="closed">Закрыта</option>
              </select>
            </label>

            <label className="property-field">
              <span>Приоритет</span>
              <select
                value={ticket.priority}
                disabled={saving}
                onChange={(event) => void handlePriorityChange(event.target.value)}
              >
                <option value="critical">Критический</option>
                <option value="high">Высокий</option>
                <option value="normal">Обычный</option>
                <option value="low">Низкий</option>
              </select>
            </label>

            <label className="property-field">
              <span>Исполнитель</span>
              <select
                value={ticket.assigneeId ?? ''}
                disabled={saving}
                onChange={(event) => void handleAssigneeChange(event.target.value)}
              >
                <option value="">Не назначен</option>
                {data.agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="property-static">
              <span>Команда</span>
              <span className="team-value">
                <span
                  className="team-swatch"
                  style={{ backgroundColor: team?.color ?? 'var(--brand)' }}
                  aria-hidden="true"
                />
                {team?.name ?? 'Не указана'}
              </span>
            </div>

            <div className="property-static">
              <span>Канал</span>
              <strong>{CHANNEL_LABELS[ticket.channel]}</strong>
            </div>

            <div className="property-tags">
              <span className="property-label">Теги</span>
              <div className="tag-list">
                {ticket.tags.length === 0 ? (
                  <span className="muted-text">Тегов пока нет</span>
                ) : (
                  ticket.tags.map((tag) => (
                    <span className="tag-with-action" key={tag}>
                      <TagChip>{tag}</TagChip>
                      <button
                        type="button"
                        aria-label={`Удалить тег ${tag}`}
                        disabled={saving}
                        onClick={() => void removeTag(tag)}
                      >
                        <Icon name="close" size={11} />
                      </button>
                    </span>
                  ))
                )}
              </div>
              {ticket.tags.length < 8 ? (
                <form className="tag-form" onSubmit={(event) => void addTag(event)}>
                  <label className="sr-only" htmlFor="tag-input">
                    Новый тег
                  </label>
                  <input
                    id="tag-input"
                    value={tagDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    placeholder="Добавить тег"
                    maxLength={24}
                    disabled={saving}
                  />
                  <button
                    type="submit"
                    className="icon-button"
                    aria-label="Добавить тег"
                    disabled={!tagDraft.trim() || saving}
                  >
                    <Icon name="plus" size={16} />
                  </button>
                </form>
              ) : null}
            </div>
          </section>

          <section className="card sla-panel" aria-labelledby="sla-title">
            <header className="card-header">
              <div>
                <h2 id="sla-title">SLA</h2>
                <p>
                  {PRIORITY_LABELS[ticket.priority]} · {policy.responseMinutes} мин на ответ
                </p>
              </div>
              <SlaBadge ticket={ticket} now={now} policies={data.slaPolicies} showLabel />
            </header>

            <div className="sla-target">
              <div className="sla-target-head">
                <span>Первый ответ</span>
                <span className={`sla-target-state ${responseState.className}`}>
                  {responseState.label}
                </span>
              </div>
              <div
                className="sla-progress"
                role="progressbar"
                aria-label="Прогресс первого ответа"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress.response * 100)}
              >
                <span
                  className={sla.responseBreached ? 'is-overdue' : ''}
                  style={{ width: `${Math.round(progress.response * 100)}%` }}
                />
              </div>
              <div className="sla-target-meta">
                <span>До {formatShortDateTime(sla.responseDueAt)}</span>
                <strong>
                  {sla.responseCompleted
                    ? `Выполнено ${ticket.firstRespondedAt ? formatTime(ticket.firstRespondedAt) : ''}`
                    : formatSlaRemaining(sla.responseRemainingMs)}
                </strong>
              </div>
            </div>

            <div className="sla-target">
              <div className="sla-target-head">
                <span>Решение</span>
                <span className={`sla-target-state ${resolutionState.className}`}>
                  {resolutionState.label}
                </span>
              </div>
              <div
                className="sla-progress"
                role="progressbar"
                aria-label="Прогресс решения"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress.resolution * 100)}
              >
                <span
                  className={sla.resolutionBreached ? 'is-overdue' : ''}
                  style={{ width: `${Math.round(progress.resolution * 100)}%` }}
                />
              </div>
              <div className="sla-target-meta">
                <span>До {formatShortDateTime(sla.resolutionDueAt)}</span>
                <strong>
                  {sla.resolutionCompleted
                    ? 'Заявка решена'
                    : formatSlaRemaining(sla.resolutionRemainingMs)}
                </strong>
              </div>
            </div>

            <p className="sla-footnote">
              Политика {PRIORITY_LABELS[ticket.priority].toLowerCase()}:{' '}
              {formatDuration(policy.responseMinutes * 60_000)} на первый ответ ·{' '}
              {formatDuration(policy.resolutionMinutes * 60_000)} на решение.
            </p>
          </section>

          {client ? (
            <section className="card client-summary-card" aria-labelledby="client-summary-title">
              <header className="card-header">
                <div>
                  <h2 id="client-summary-title">Клиент</h2>
                  <p>{client.kind === 'business' ? 'Юридическое лицо' : 'Частное лицо'}</p>
                </div>
                <Avatar name={client.name} size={40} />
              </header>
              <strong className="client-summary-name">{client.name}</strong>
              <span className="client-summary-account">{client.accountNumber}</span>
              {client.contactName ? (
                <span className="client-summary-contact">Контакт: {client.contactName}</span>
              ) : null}
              <ul className="contact-list">
                <li>
                  <Icon name="phone" size={15} />
                  <a href={`tel:${client.phone.replace(/[^+\d]/g, '')}`}>{client.phone}</a>
                </li>
                <li>
                  <Icon name="mail" size={15} />
                  <a href={`mailto:${client.email}`}>{client.email}</a>
                </li>
                <li>
                  <Icon name="map-pin" size={15} />
                  <span>{client.address}</span>
                </li>
              </ul>
              <div className="client-summary-stats">
                <span>
                  <strong>{clientOpenCount}</strong> открыто
                </span>
                <span>
                  <strong>{clientTicketCount}</strong> всего
                </span>
              </div>
              <a
                href={routeHref.client(client.id)}
                className="button button-secondary button-block"
              >
                Профиль клиента
                <Icon name="arrow-up-right" size={15} />
              </a>
            </section>
          ) : null}

          {asset ? (
            <section className="card asset-summary-card" aria-labelledby="asset-summary-title">
              <header className="card-header">
                <div>
                  <h2 id="asset-summary-title">Оборудование</h2>
                  <p>{ASSET_KIND_LABELS[asset.kind]}</p>
                </div>
                <span className={`asset-status asset-${asset.status}`}>
                  {ASSET_STATUS_LABELS[asset.status]}
                </span>
              </header>
              <strong>{asset.model}</strong>
              <dl className="asset-details">
                <div>
                  <dt>Серийный номер</dt>
                  <dd>{asset.serial}</dd>
                </div>
                <div>
                  <dt>IP-адрес</dt>
                  <dd>{asset.ipAddress}</dd>
                </div>
                <div>
                  <dt>Прошивка</dt>
                  <dd>{asset.firmware}</dd>
                </div>
              </dl>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
