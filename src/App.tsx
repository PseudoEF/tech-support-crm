import { useCallback, useEffect, useState } from 'react';
import { useCrm } from './state/CrmContext';
import { useRoute, type Route } from './lib/router';
import { useNow } from './lib/useNow';
import { AppLoading, LoadError } from './components/States';
import { CommandPalette } from './components/CommandPalette';
import { Layout } from './components/Layout';
import { PageTransition } from './components/PageTransition';
import { DashboardPage } from './pages/DashboardPage';
import { TicketsPage } from './pages/TicketsPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { ArticlePage } from './pages/ArticlePage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

function getRouteKey(route: Route): string {
  if (route.name === 'ticket') return `ticket:${route.id}`;
  if (route.name === 'client') return `client:${route.id}`;
  if (route.name === 'article') return `article:${route.slug}`;
  if (route.name === 'not-found') return `not-found:${route.path}`;
  return route.name;
}

function PageRouter({ route }: { route: Route }) {
  switch (route.name) {
    case 'dashboard':
      return <DashboardPage />;
    case 'tickets':
      return <TicketsPage />;
    case 'ticket':
      return <TicketDetailPage ticketId={route.id} />;
    case 'clients':
      return <ClientsPage />;
    case 'client':
      return <ClientDetailPage clientId={route.id} />;
    case 'kb':
      return <KnowledgeBasePage />;
    case 'article':
      return <ArticlePage slug={route.slug} />;
    case 'settings':
      return <SettingsPage />;
    case 'not-found':
      return <NotFoundPage path={route.path} />;
  }
}

export function App() {
  const { data, status, error, reload } = useCrm();
  const route = useRoute();
  const now = useNow(30_000);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route]);

  useEffect(() => {
    let title = 'ЛинкСервис — CRM техподдержки';
    if (data) {
      if (route.name === 'dashboard') title = 'Обзор — ЛинкСервис';
      if (route.name === 'tickets') title = 'Заявки — ЛинкСервис';
      if (route.name === 'clients') title = 'Клиенты — ЛинкСервис';
      if (route.name === 'kb') title = 'База знаний — ЛинкСервис';
      if (route.name === 'settings') title = 'Настройки демо — ЛинкСервис';
      if (route.name === 'ticket') {
        const ticket = data.tickets.find((item) => item.id === route.id);
        title = ticket ? `${ticket.number} ${ticket.subject} — ЛинкСервис` : title;
      }
      if (route.name === 'client') {
        const client = data.clients.find((item) => item.id === route.id);
        title = client ? `${client.name} — ЛинкСервис` : title;
      }
      if (route.name === 'article') {
        const article = data.kbArticles.find((item) => item.slug === route.slug);
        title = article ? `${article.title} — ЛинкСервис` : title;
      }
    }
    document.title = title;
  }, [data, route]);

  if (status === 'loading' || (status === 'ready' && !data)) {
    return <AppLoading />;
  }

  if (status === 'error' || !data) {
    return (
      <LoadError
        message={error ?? 'Неизвестная ошибка локального хранилища'}
        onRetry={() => void reload()}
      />
    );
  }

  return (
    <>
      <Layout route={route} onOpenPalette={openPalette}>
        <PageTransition routeKey={getRouteKey(route)}>
          <PageRouter route={route} />
        </PageTransition>
      </Layout>
      <CommandPalette open={paletteOpen} onClose={closePalette} data={data} now={now} />
    </>
  );
}
