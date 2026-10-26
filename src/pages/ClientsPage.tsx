import { useMemo, useState } from 'react';
import type { ClientKind } from '../domain/types';
import { CLIENT_KIND_LABELS, pluralRu } from '../domain/labels';
import { formatMoney } from '../lib/format';
import { routeHref } from '../lib/router';
import { useCrmData } from '../state/CrmContext';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';

type ClientSegment = ClientKind | 'all';

export function ClientsPage() {
  const data = useCrmData();
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<ClientSegment>('all');

  const clientStats = useMemo(() => {
    const map = new Map<
      string,
      { total: number; open: number; assets: number }
    >();
    data.clients.forEach((client) => {
      map.set(client.id, { total: 0, open: 0, assets: 0 });
    });
    data.tickets.forEach((ticket) => {
      const entry = map.get(ticket.clientId);
      if (!entry) return;
      entry.total += 1;
      if (ticket.status === 'new' || ticket.status === 'open' || ticket.status === 'pending') {
        entry.open += 1;
      }
    });
    data.assets.forEach((asset) => {
      const entry = map.get(asset.clientId);
      if (entry) entry.assets += 1;
    });
    return map;
  }, [data.assets, data.clients, data.tickets]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.clients
      .filter((client) => segment === 'all' || client.kind === segment)
      .filter((client) => {
        if (!query) return true;
        return [
          client.name,
          client.company ?? '',
          client.contactName ?? '',
          client.email,
          client.phone,
          client.accountNumber,
          client.address,
          client.tariff,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((left, right) => {
        const leftStats = clientStats.get(left.id);
        const rightStats = clientStats.get(right.id);
        const openDelta = (rightStats?.open ?? 0) - (leftStats?.open ?? 0);
        if (openDelta !== 0) return openDelta;
        return left.name.localeCompare(right.name, 'ru');
      });
  }, [clientStats, data.clients, search, segment]);

  const businessCount = data.clients.filter((client) => client.kind === 'business').length;
  const individualCount = data.clients.length - businessCount;
  const suspendedCount = data.clients.filter((client) => client.status === 'suspended').length;

  return (
    <div className="page clients-page">
      <PageHeader
        title="Клиенты"
        description={`${data.clients.length} клиентов · ${businessCount} компаний · ${suspendedCount} приостановлено`}
        actions={
          <a href={routeHref.tickets} className="button button-secondary">
            <Icon name="tickets" size={16} />
            Все заявки
          </a>
        }
      />

      <section className="client-overview" aria-label="Сводка по клиентам">
        <div>
          <span>Частные клиенты</span>
          <strong>{individualCount}</strong>
        </div>
        <div>
          <span>Компании</span>
          <strong>{businessCount}</strong>
        </div>
        <div>
          <span>Оборудование</span>
          <strong>{data.assets.length}</strong>
        </div>
        <div>
          <span>Активные обращения</span>
          <strong>
            {Array.from(clientStats.values()).reduce((sum, item) => sum + item.open, 0)}
          </strong>
        </div>
      </section>

      <section className="client-toolbar" aria-label="Поиск клиентов">
        <div className="search-field client-search">
          <label htmlFor="client-search">Поиск клиента</label>
          <div className="search-input-wrap">
            <Icon name="search" size={17} />
            <input
              id="client-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Имя, компания, телефон, лицевой счёт"
            />
            {search ? (
              <button
                type="button"
                className="search-clear"
                aria-label="Очистить поиск"
                onClick={() => setSearch('')}
              >
                <Icon name="close" size={14} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="segmented-control" role="group" aria-label="Тип клиента">
          {(
            [
              ['all', 'Все', data.clients.length],
              ['business', 'Компании', businessCount],
              ['individual', 'Частные', individualCount],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              className={segment === value ? 'is-active' : ''}
              aria-pressed={segment === value}
              onClick={() => setSegment(value)}
            >
              {label}
              <span>{count}</span>
            </button>
          ))}
        </div>

        <span className="result-count">
          {filtered.length} {pluralRu(filtered.length, 'клиент', 'клиента', 'клиентов')}
        </span>
      </section>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="clients"
            title="Клиенты не найдены"
            description="Попробуйте изменить запрос или выбрать другой сегмент."
            action={
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setSearch('');
                  setSegment('all');
                }}
              >
                Сбросить фильтры
              </button>
            }
          />
        </div>
      ) : (
        <div className="card clients-table-card">
          <div className="table-scroll">
            <table className="data-table clients-table">
              <caption className="sr-only">Список клиентов поддержки</caption>
              <thead>
                <tr>
                  <th scope="col">Клиент</th>
                  <th scope="col">Контакты</th>
                  <th scope="col">Тариф</th>
                  <th scope="col">Заявки</th>
                  <th scope="col">Баланс</th>
                  <th scope="col" aria-label="Действия" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => {
                  const stats = clientStats.get(client.id);
                  return (
                    <tr key={client.id}>
                      <td>
                        <a href={routeHref.client(client.id)} className="client-cell">
                          <Avatar name={client.name} size={38} />
                          <span>
                            <strong>{client.name}</strong>
                            <small>
                              {client.kind === 'business'
                                ? CLIENT_KIND_LABELS[client.kind]
                                : client.accountNumber}
                              {client.status === 'suspended' ? ' · приостановлен' : ''}
                            </small>
                          </span>
                        </a>
                      </td>
                      <td>
                        <span className="contact-stack">
                          <a href={`tel:${client.phone.replace(/[^+\d]/g, '')}`}>
                            {client.phone}
                          </a>
                          <a href={`mailto:${client.email}`}>{client.email}</a>
                        </span>
                      </td>
                      <td>
                        <span className="client-tariff">{client.tariff}</span>
                        <span className="client-assets">
                          {stats?.assets ?? 0}{' '}
                          {pluralRu(stats?.assets ?? 0, 'устройство', 'устройства', 'устройств')}
                        </span>
                      </td>
                      <td>
                        <span className="ticket-count-cell">
                          <strong>{stats?.open ?? 0}</strong>
                          <span>из {stats?.total ?? 0}</span>
                        </span>
                      </td>
                      <td>
                        <span
                          className={`balance ${
                            client.balance < 0 ? 'balance-negative' : ''
                          }`}
                        >
                          {formatMoney(client.balance)}
                        </span>
                      </td>
                      <td>
                        <a
                          href={routeHref.client(client.id)}
                          className="row-arrow"
                          aria-label={`Открыть клиента ${client.name}`}
                        >
                          <Icon name="chevron-right" size={17} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="clients-mobile-list">
        {filtered.map((client) => {
          const stats = clientStats.get(client.id);
          return (
            <a
              key={client.id}
              href={routeHref.client(client.id)}
              className="client-mobile-card"
            >
              <Avatar name={client.name} size={42} />
              <div className="client-mobile-copy">
                <strong>{client.name}</strong>
                <span>
                  {client.accountNumber} · {client.tariff}
                </span>
                <small>
                  {stats?.open ?? 0} открыто · {stats?.assets ?? 0} устройств
                </small>
              </div>
              <div className="client-mobile-side">
                <span className={client.balance < 0 ? 'balance-negative' : ''}>
                  {formatMoney(client.balance)}
                </span>
                <Icon name="chevron-right" size={16} />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
