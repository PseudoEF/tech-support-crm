import { ASSET_KIND_LABELS, ASSET_STATUS_LABELS, CLIENT_KIND_LABELS } from '../domain/labels';
import { formatDate, formatMoney, formatRelative } from '../lib/format';
import { routeHref } from '../lib/router';
import { useCrmData } from '../state/CrmContext';
import { useNow } from '../lib/useNow';
import { Avatar } from '../components/Avatar';
import { PriorityBadge, SlaBadge, StatusBadge } from '../components/Badges';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';

interface ClientDetailPageProps {
  clientId: string;
}

export function ClientDetailPage({ clientId }: ClientDetailPageProps) {
  const data = useCrmData();
  const now = useNow(30_000);
  const client = data.clients.find((item) => item.id === clientId);

  if (!client) {
    return (
      <div className="page">
        <PageHeader title="Клиент не найден" description={`Идентификатор: ${clientId}`} />
        <div className="card">
          <EmptyState
            icon="clients"
            title="Такого клиента нет"
            description="Возможно, демо-данные были сброшены или ссылка устарела."
            action={
              <a href={routeHref.clients} className="button button-primary">
                Вернуться к клиентам
              </a>
            }
          />
        </div>
      </div>
    );
  }

  const tickets = data.tickets
    .filter((ticket) => ticket.clientId === client.id)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  const activeTickets = tickets.filter(
    (ticket) =>
      ticket.status === 'new' || ticket.status === 'open' || ticket.status === 'pending',
  ).length;
  const resolvedTickets = tickets.filter(
    (ticket) => ticket.status === 'resolved' || ticket.status === 'closed',
  ).length;
  const clientAssets = data.assets.filter((asset) => asset.clientId === client.id);

  return (
    <div className="page client-detail-page">
      <nav className="breadcrumbs" aria-label="Хлебные крошки">
        <a href={routeHref.clients}>Клиенты</a>
        <Icon name="chevron-right" size={13} />
        <span aria-current="page">{client.name}</span>
      </nav>

      <header className="client-profile-head">
        <Avatar name={client.name} size={64} />
        <div className="client-profile-copy">
          <div className="client-profile-kicker">
            <span>{CLIENT_KIND_LABELS[client.kind]}</span>
            <span aria-hidden="true">·</span>
            <span>{client.accountNumber}</span>
            <span
              className={`client-status ${
                client.status === 'suspended' ? 'is-suspended' : 'is-active'
              }`}
            >
              {client.status === 'active' ? 'Активен' : 'Приостановлен'}
            </span>
          </div>
          <h1>{client.name}</h1>
          <p>
            {client.contactName ? `${client.contactName} · ` : ''}
            {client.tariff} · клиент с {formatDate(client.createdAt)}
          </p>
        </div>
        <div className="client-profile-actions">
          <a
            href={`mailto:${client.email}`}
            className="button button-secondary"
            aria-label={`Написать на ${client.email}`}
          >
            <Icon name="mail" size={16} />
            Написать
          </a>
          <a
            href={`tel:${client.phone.replace(/[^+\d]/g, '')}`}
            className="button button-primary"
          >
            <Icon name="phone" size={16} />
            Позвонить
          </a>
        </div>
      </header>

      {client.status === 'suspended' ? (
        <div className="client-warning" role="status">
          <Icon name="alert-triangle" size={18} />
          <span>
            Услуги приостановлены. Баланс:{' '}
            <strong>{formatMoney(client.balance)}</strong>. Проверьте состояние услуги
            перед ответом клиенту.
          </span>
        </div>
      ) : null}

      <section className="client-metric-grid" aria-label="Показатели клиента">
        <div className="client-metric">
          <span>Активные заявки</span>
          <strong>{activeTickets}</strong>
        </div>
        <div className="client-metric">
          <span>Всего обращений</span>
          <strong>{tickets.length}</strong>
        </div>
        <div className="client-metric">
          <span>Решено</span>
          <strong>{resolvedTickets}</strong>
        </div>
        <div className="client-metric">
          <span>Баланс</span>
          <strong className={client.balance < 0 ? 'balance-negative' : ''}>
            {formatMoney(client.balance)}
          </strong>
        </div>
      </section>

      <div className="client-detail-grid">
        <div className="client-detail-main">
          <section className="card client-tickets-card" aria-labelledby="client-tickets-title">
            <header className="card-header">
              <div>
                <h2 id="client-tickets-title">История заявок</h2>
                <p>{tickets.length} обращений по этому клиенту</p>
              </div>
              <a href={routeHref.tickets} className="text-link">
                Вся очередь <Icon name="arrow-right" size={14} />
              </a>
            </header>

            {tickets.length === 0 ? (
              <EmptyState
                icon="tickets"
                title="Обращений пока нет"
                description="Когда клиент создаст заявку, она появится здесь."
              />
            ) : (
              <ul className="client-ticket-list">
                {tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <a href={routeHref.ticket(ticket.id)} className="client-ticket-row">
                      <span className="client-ticket-date">
                        <strong>{formatRelative(ticket.createdAt, now)}</strong>
                        <span>{ticket.number}</span>
                      </span>
                      <span className="client-ticket-copy">
                        <strong>{ticket.subject}</strong>
                        <span>
                          {ticket.tags.slice(0, 3).map((tag) => `#${tag}`).join(' ')}
                        </span>
                      </span>
                      <PriorityBadge priority={ticket.priority} />
                      <StatusBadge status={ticket.status} />
                      <SlaBadge ticket={ticket} now={now} policies={data.slaPolicies} />
                      <Icon name="chevron-right" size={16} className="row-arrow-icon" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card client-assets-card" aria-labelledby="client-assets-title">
            <header className="card-header">
              <div>
                <h2 id="client-assets-title">Оборудование и сервисы</h2>
                <p>{clientAssets.length} устройств привязано к лицевому счёту</p>
              </div>
            </header>

            {clientAssets.length === 0 ? (
              <EmptyState
                icon="device"
                title="Оборудование не привязано"
                description="У клиента нет устройств в демо-инвентаре."
              />
            ) : (
              <div className="client-asset-grid">
                {clientAssets.map((asset) => (
                  <article className="client-asset" key={asset.id}>
                    <header>
                      <span className="asset-icon">
                        <Icon name="device" size={20} />
                      </span>
                      <span className={`asset-status asset-${asset.status}`}>
                        {ASSET_STATUS_LABELS[asset.status]}
                      </span>
                    </header>
                    <span className="asset-kind">{ASSET_KIND_LABELS[asset.kind]}</span>
                    <strong>{asset.model}</strong>
                    <dl className="asset-details">
                      <div>
                        <dt>Серийный номер</dt>
                        <dd>{asset.serial}</dd>
                      </div>
                      <div>
                        <dt>IP</dt>
                        <dd>{asset.ipAddress}</dd>
                      </div>
                      <div>
                        <dt>Установлен</dt>
                        <dd>{formatDate(asset.installedAt)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="client-detail-side" aria-label="Информация о клиенте">
          <section className="card contact-card" aria-labelledby="contact-title">
            <header className="card-header">
              <div>
                <h2 id="contact-title">Карточка клиента</h2>
                <p>Контактные данные и условия</p>
              </div>
            </header>
            <dl className="info-list">
              {client.company ? (
                <div>
                  <dt>Компания</dt>
                  <dd>{client.company}</dd>
                </div>
              ) : null}
              {client.contactName ? (
                <div>
                  <dt>Контактное лицо</dt>
                  <dd>{client.contactName}</dd>
                </div>
              ) : null}
              <div>
                <dt>Телефон</dt>
                <dd>
                  <a href={`tel:${client.phone.replace(/[^+\d]/g, '')}`}>{client.phone}</a>
                </dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>
                  <a href={`mailto:${client.email}`}>{client.email}</a>
                </dd>
              </div>
              <div>
                <dt>Адрес</dt>
                <dd>{client.address}</dd>
              </div>
              <div>
                <dt>Лицевой счёт</dt>
                <dd>{client.accountNumber}</dd>
              </div>
              <div>
                <dt>Тариф</dt>
                <dd>{client.tariff}</dd>
              </div>
              <div>
                <dt>Клиент с</dt>
                <dd>{formatDate(client.createdAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="card notes-card" aria-labelledby="notes-title">
            <header className="card-header">
              <div>
                <h2 id="notes-title">Заметки</h2>
                <p>Только для сотрудников</p>
              </div>
              <Icon name="lock" size={16} />
            </header>
            {client.notes ? (
              <p className="client-notes">{client.notes}</p>
            ) : (
              <p className="muted-text">Заметок по клиенту пока нет.</p>
            )}
          </section>

          <section className="card facts-card" aria-labelledby="facts-title">
            <header className="card-header">
              <div>
                <h2 id="facts-title">Сервис</h2>
                <p>Состояние лицевого счёта</p>
              </div>
            </header>
            <div className="fact-row">
              <span>Статус</span>
              <span
                className={`client-status ${
                  client.status === 'suspended' ? 'is-suspended' : 'is-active'
                }`}
              >
                {client.status === 'active' ? 'Активен' : 'Приостановлен'}
              </span>
            </div>
            <div className="fact-row">
              <span>Баланс</span>
              <strong className={client.balance < 0 ? 'balance-negative' : ''}>
                {formatMoney(client.balance)}
              </strong>
            </div>
            <div className="fact-row">
              <span>Активных заявок</span>
              <strong>{activeTickets}</strong>
            </div>
            <div className="fact-row">
              <span>Устройств</span>
              <strong>{clientAssets.length}</strong>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
